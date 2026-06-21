using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading;

namespace VMSCleanSlate;

internal static class Program
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AttachConsole(int dwProcessId);

    private const int ATTACH_PARENT_PROCESS = -1;

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length > 0)
        {
            try
            {
                AttachConsole(ATTACH_PARENT_PROCESS);
            }
            catch
            {
            }

            var jsonOutput = args.Any(a =>
                a.Equals("--json", StringComparison.OrdinalIgnoreCase) ||
                a.Equals("--json-result", StringComparison.OrdinalIgnoreCase));

            var action = args[0].Trim().ToLowerInvariant();
            switch (action)
            {
                case "-logoff":
                case "--logoff":
                    return RunWithJsonWrap(jsonOutput, "logoff",
                        () => PowerShellRunner.RunEmbedded(CleanupAction.Logoff));

                case "-shutdown":
                case "--shutdown":
                    return RunWithJsonWrap(jsonOutput, "shutdown",
                        () => PowerShellRunner.RunEmbedded(CleanupAction.Shutdown));

                case "-runall":
                case "--runall":
                    return RunWithJsonWrap(jsonOutput, "runall", () =>
                    {
                        var logoff = PowerShellRunner.RunEmbedded(CleanupAction.Logoff);
                        if (!logoff.Ok)
                        {
                            return logoff;
                        }

                        var shutdown = PowerShellRunner.RunEmbedded(CleanupAction.Shutdown);
                        return new CleanupRunResult
                        {
                            Action = CleanupAction.Shutdown,
                            ExitCode = Math.Max(logoff.ExitCode, shutdown.ExitCode),
                            Error = shutdown.Error ?? logoff.Error,
                            Stdout = string.Join(
                                Environment.NewLine,
                                new[] { logoff.Stdout, shutdown.Stdout }.Where(s => !string.IsNullOrWhiteSpace(s))),
                            Stderr = string.Join(
                                Environment.NewLine,
                                new[] { logoff.Stderr, shutdown.Stderr }.Where(s => !string.IsNullOrWhiteSpace(s)))
                        };
                    });

                case "-self-test":
                case "--self-test":
                    return SelfTest.Run();

                case "-install-gpo":
                case "--install-gpo":
                    return GpoInstaller.Install(Application.ExecutablePath);

                case "-uninstall-gpo":
                case "--uninstall-gpo":
                    return GpoInstaller.Uninstall();

                case "-h":
                case "--help":
                case "/?":
                    PrintHelp();
                    return 0;
            }
        }

        using var mtx = new Mutex(true, "Global\\VMSCleanSlate_TrayApp_2026", out var created);
        if (!created)
        {
            MessageBox.Show(
                "VMSCleanSlate is already running. Check the system tray.",
                "VMSCleanSlate",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return 0;
        }

        ApplicationConfiguration.Initialize();
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.Run(new TrayApp());
        return 0;
    }

    private static int RunWithJsonWrap(bool jsonOutput, string action, Func<CleanupRunResult> work)
    {
        if (!jsonOutput)
        {
            return work().ExitCode;
        }

        var startedAt = DateTime.Now;
        var result = work();
        var elapsed = (DateTime.Now - startedAt).TotalSeconds;

        var payload = new Dictionary<string, object?>
        {
            ["action"] = action,
            ["exitCode"] = result.ExitCode,
            ["ok"] = result.Ok,
            ["elapsedSec"] = Math.Round(elapsed, 2),
            ["error"] = string.IsNullOrEmpty(result.Error) ? null : result.Error,
            ["timestamp"] = DateTime.Now.ToString("s")
        };

        try
        {
            Console.WriteLine(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = true
            }));
        }
        catch
        {
        }

        return result.ExitCode;
    }

    private static void PrintHelp()
    {
        try
        {
            Console.WriteLine(
@"VMSCleanSlate - public PC auth/session cleanup

Usage:
  VMSCleanSlate.exe                  Start tray mode
  VMSCleanSlate.exe -Logoff          Run user-context cleanup
  VMSCleanSlate.exe -Shutdown        Run device-context cleanup (admin/SYSTEM)
  VMSCleanSlate.exe -RunAll          Run Logoff then Shutdown
  VMSCleanSlate.exe --self-test      Print self-test JSON
  VMSCleanSlate.exe --install-gpo    Install Local GPO Logoff/Shutdown hooks
  VMSCleanSlate.exe --uninstall-gpo  Remove Local GPO hooks

Options:
  --json / --json-result             Emit JSON result for CLI actions
  --help, -h, /?                     Show this help

Exit codes:
   0   Success
   1   One or more cleanup modules failed
  -1   Process.Start failed
  -2   Embedded PowerShell extract failed
  -3   Main script missing after extract
  -4   Another cleanup is already running
   5   Admin privileges required for GPO install");
        }
        catch
        {
        }
    }
}
