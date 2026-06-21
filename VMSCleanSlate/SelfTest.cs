using System.Diagnostics;
using System.Text.Json;

namespace VMSCleanSlate;

/// <summary>
/// 회의 시스템 Client 가 호출 직전 헬스체크용. 실제 정리는 안 함.
/// 결과를 JSON 으로 stdout 출력. 종료 코드 0=OK, 1=일부 실패.
/// (ConfuserEx rename 호환을 위해 anonymous type 대신 Dictionary 로 직렬화)
/// </summary>
public static class SelfTest
{
    public static int Run()
    {
        var checks = new List<Dictionary<string, object?>>();
        bool overall = true;

        // 1) Temp 폴더 쓰기 가능
        try
        {
            var t = Path.Combine(Path.GetTempPath(), "VMSCleanSlate_test_" + Guid.NewGuid().ToString("N")[..8]);
            Directory.CreateDirectory(t);
            File.WriteAllText(Path.Combine(t, "probe.txt"), "ok");
            Directory.Delete(t, true);
            checks.Add(Check("tempWritable", true, Path.GetTempPath()));
        }
        catch (Exception ex) { checks.Add(CheckErr("tempWritable", ex.Message)); overall = false; }

        // 2) 임베디드 PS 추출 + 복호화
        string? extractDir = null;
        try
        {
            extractDir = PowerShellRunner.ExtractAll();
            var mainPs = Path.Combine(extractDir, "VMSCleanSlate.ps1");
            if (!File.Exists(mainPs)) throw new Exception("main script not extracted");
            var size = new FileInfo(mainPs).Length;
            if (size < 100) throw new Exception($"main script too small ({size}B)");

            var moduleCount = Directory.Exists(Path.Combine(extractDir, "modules"))
                ? Directory.GetFiles(Path.Combine(extractDir, "modules"), "*.ps1").Length
                : 0;
            checks.Add(Check("extractScripts", true, $"main={size}B, modules={moduleCount}"));
        }
        catch (Exception ex) { checks.Add(CheckErr("extractScripts", ex.Message)); overall = false; }
        finally
        {
            if (extractDir != null) { try { Directory.Delete(extractDir, true); } catch { } }
        }

        // 3) powershell.exe 실행 가능
        try
        {
            var psi = new ProcessStartInfo("powershell.exe",
                "-NoProfile -Command \"$PSVersionTable.PSVersion.ToString()\"")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using var p = Process.Start(psi)!;
            string ver = p.StandardOutput.ReadToEnd().Trim();
            p.WaitForExit(5000);
            bool ok = p.ExitCode == 0 && !string.IsNullOrEmpty(ver);
            checks.Add(Check("powershell", ok, ver));
            if (!ok) overall = false;
        }
        catch (Exception ex) { checks.Add(CheckErr("powershell", ex.Message)); overall = false; }

        // 4) config.json
        try
        {
            var cfg = ConfigManager.Load();
            int yes = 0, total = 0;
            string[] keys = {
                nameof(Config.WorkSchoolAccess),        nameof(Config.DeviceEnrollmentCleanup),
                nameof(Config.Microsoft365),            nameof(Config.OneDriveSignout),
                nameof(Config.OneDriveLocalFolder),     nameof(Config.Teams),
                nameof(Config.Notion),                  nameof(Config.Slack),
                nameof(Config.BrowserCookies)
            };
            foreach (var key in keys) { total++; if (cfg[key]) yes++; }
            checks.Add(Check("config", true, $"{yes}/{total} cleanup items enabled"));
        }
        catch (Exception ex) { checks.Add(CheckErr("config", ex.Message)); overall = false; }

        // 5) GPO 등록 상태
        try { checks.Add(Check("gpoShutdown", true, GpoInstaller.IsShutdownInstalled() ? "installed" : "not installed")); }
        catch (Exception ex) { checks.Add(CheckErr("gpoShutdown", ex.Message)); }
        try { checks.Add(Check("gpoLogoff",   true, GpoInstaller.IsLogoffInstalled()   ? "installed" : "not installed")); }
        catch (Exception ex) { checks.Add(CheckErr("gpoLogoff",   ex.Message)); }

        // 6) 자동 시작
        try { checks.Add(Check("autoStart", true, AutoStart.IsEnabled() ? "enabled" : "disabled")); }
        catch (Exception ex) { checks.Add(CheckErr("autoStart", ex.Message)); }

        var result = new Dictionary<string, object?>
        {
            ["ok"]        = overall,
            ["version"]   = "1.0.0",
            ["timestamp"] = DateTime.Now.ToString("s"),
            ["checks"]    = checks
        };

        try
        {
            Console.WriteLine(JsonSerializer.Serialize(result,
                new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { }

        return overall ? 0 : 1;
    }

    private static Dictionary<string, object?> Check(string name, bool ok, string? detail) =>
        new() { ["name"] = name, ["ok"] = ok, ["detail"] = detail };

    private static Dictionary<string, object?> CheckErr(string name, string error) =>
        new() { ["name"] = name, ["ok"] = false, ["error"] = error };
}
