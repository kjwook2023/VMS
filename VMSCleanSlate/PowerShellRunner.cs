using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading;

namespace VMSCleanSlate;

public static class PowerShellRunner
{
    // Keep in sync with Build\EncryptScripts.ps1.
    private static readonly byte[] AesKey = Convert.FromBase64String(
        "xKqMhJbBTmH7Z4pV2wQfYkR9sN3eL5cD8AaG6tWnUjE=");
    private static readonly byte[] AesIv = Convert.FromBase64String(
        "qP3sT7rN5mY2eA0vZ8xH9w==");

    public const int ExitCode_DllInitFailed = unchecked((int)0xC0000142);

    [DllImport("kernel32.dll")]
    private static extern uint SetErrorMode(uint uMode);

    private const uint SEM_FAILCRITICALERRORS = 0x0001;
    private const uint SEM_NOGPFAULTERRORBOX = 0x0002;

    private static readonly Mutex CleanupMutex = new(false, "VMSCleanSlate_CleanupRunning");

    public static string ExtractAll()
    {
        var asm = Assembly.GetExecutingAssembly();
        var tmpDir = Path.Combine(Path.GetTempPath(), "VMSCleanSlate_" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(tmpDir, "modules"));

        foreach (var name in asm.GetManifestResourceNames())
        {
            if (!name.EndsWith(".ps1.enc", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var rel = name.Replace('/', Path.DirectorySeparatorChar);
            rel = rel.Substring(0, rel.Length - 4);
            var fullPath = Path.Combine(tmpDir, rel);
            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            byte[] cipher;
            using (var s = asm.GetManifestResourceStream(name)!)
            using (var ms = new MemoryStream())
            {
                s.CopyTo(ms);
                cipher = ms.ToArray();
            }

            var plain = Decrypt(cipher);
            if (fullPath.EndsWith(".ps1", StringComparison.OrdinalIgnoreCase))
            {
                plain = EnsureUtf8Bom(plain);
            }

            File.WriteAllBytes(fullPath, plain);
        }

        var srcCfg = ConfigManager.ConfigPath;
        if (File.Exists(srcCfg))
        {
            try
            {
                File.Copy(srcCfg, Path.Combine(tmpDir, "VMSCleanSlate.config.json"), true);
            }
            catch
            {
            }
        }

        return tmpDir;
    }

    public static CleanupRunResult RunEmbedded(CleanupAction action)
    {
        var acquired = false;

        try
        {
            try
            {
                acquired = CleanupMutex.WaitOne(TimeSpan.FromSeconds(60), false);
            }
            catch (AbandonedMutexException)
            {
                acquired = true;
            }

            if (!acquired)
            {
                WriteLog("Mutex acquire timeout - another cleanup is in progress");
                return new CleanupRunResult
                {
                    Action = action,
                    ExitCode = -4,
                    Error = "Another cleanup is already running (60s timeout)."
                };
            }

            return RunEmbeddedCore(action);
        }
        finally
        {
            if (acquired)
            {
                try
                {
                    CleanupMutex.ReleaseMutex();
                }
                catch
                {
                }
            }
        }
    }

    public static CleanupRunResult RunSelfElevated(CleanupAction action)
    {
        var exitCode = RunSelfElevated(GetArgument(action));
        return new CleanupRunResult
        {
            Action = action,
            ExitCode = exitCode,
            Error = exitCode == 0 ? null : $"Elevated run failed with exit code {exitCode}."
        };
    }

    public static int RunSelfElevated(string arguments)
    {
        var psi = new ProcessStartInfo
        {
            FileName = Application.ExecutablePath,
            Arguments = arguments,
            UseShellExecute = true,
            Verb = "runas",
            WindowStyle = ProcessWindowStyle.Hidden
        };

        try
        {
            using var p = Process.Start(psi);
            if (p == null)
            {
                return -1;
            }

            p.WaitForExit();
            return p.ExitCode;
        }
        catch
        {
            return -1;
        }
    }

    private static CleanupRunResult RunEmbeddedCore(CleanupAction action)
    {
        string dir = "";

        try
        {
            dir = ExtractAll();
        }
        catch (Exception ex)
        {
            WriteLog($"ExtractAll failed: {ex}");
            return new CleanupRunResult
            {
                Action = action,
                ExitCode = -2,
                Error = "Extract: " + ex.Message
            };
        }

        try
        {
            var script = Path.Combine(dir, "VMSCleanSlate.ps1");
            if (!File.Exists(script))
            {
                WriteLog("Main script not found after extract: " + script);
                return new CleanupRunResult
                {
                    Action = action,
                    ExitCode = -3,
                    Error = "Main script not extracted."
                };
            }

            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{script}\" {GetArgument(action)}",
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = System.Text.Encoding.UTF8,
                StandardErrorEncoding = System.Text.Encoding.UTF8
            };

            uint prevMode = SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX);
            Process? p;
            try
            {
                p = Process.Start(psi);
            }
            finally
            {
                SetErrorMode(prevMode);
            }

            if (p == null)
            {
                return new CleanupRunResult
                {
                    Action = action,
                    ExitCode = -1,
                    Error = "Process.Start returned null."
                };
            }

            var stdout = p.StandardOutput.ReadToEnd();
            var stderr = p.StandardError.ReadToEnd();
            p.WaitForExit();

            var exitCode = p.ExitCode;
            var error = exitCode == 0
                ? ExtractFirstError(stderr)
                : ExtractFirstError(stderr) ?? $"PS exit code {exitCode}";

            if (exitCode != 0 || !string.IsNullOrWhiteSpace(stderr))
            {
                WriteLog($"PS rc={exitCode}, action=[{action}]");
                if (!string.IsNullOrEmpty(stdout))
                {
                    WriteLog("STDOUT:\r\n" + stdout);
                }

                if (!string.IsNullOrEmpty(stderr))
                {
                    WriteLog("STDERR:\r\n" + stderr);
                }
            }

            return new CleanupRunResult
            {
                Action = action,
                ExitCode = exitCode,
                Error = error,
                Stdout = stdout,
                Stderr = stderr
            };
        }
        catch (Exception ex)
        {
            WriteLog($"RunEmbedded EXCEPTION: {ex}");
            return new CleanupRunResult
            {
                Action = action,
                ExitCode = -1,
                Error = "Run: " + ex.Message
            };
        }
        finally
        {
            try
            {
                if (!string.IsNullOrEmpty(dir))
                {
                    Directory.Delete(dir, recursive: true);
                }
            }
            catch
            {
            }
        }
    }

    private static string GetArgument(CleanupAction action) => action switch
    {
        CleanupAction.Logoff => "-Logoff",
        CleanupAction.Shutdown => "-Shutdown",
        _ => throw new ArgumentOutOfRangeException(nameof(action), action, null)
    };

    private static byte[] Decrypt(byte[] cipher)
    {
        using var aes = Aes.Create();
        aes.Key = AesKey;
        aes.IV = AesIv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        using var dec = aes.CreateDecryptor();
        return dec.TransformFinalBlock(cipher, 0, cipher.Length);
    }

    private static byte[] EnsureUtf8Bom(byte[] bytes)
    {
        if (bytes.Length >= 3 &&
            bytes[0] == 0xEF &&
            bytes[1] == 0xBB &&
            bytes[2] == 0xBF)
        {
            return bytes;
        }

        var withBom = new byte[bytes.Length + 3];
        withBom[0] = 0xEF;
        withBom[1] = 0xBB;
        withBom[2] = 0xBF;
        Buffer.BlockCopy(bytes, 0, withBom, 3, bytes.Length);
        return withBom;
    }

    private static string? ExtractFirstError(string stderr)
    {
        if (string.IsNullOrWhiteSpace(stderr))
        {
            return null;
        }

        foreach (var line in stderr.Split('\n'))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0)
            {
                continue;
            }

            return trimmed.Length > 160 ? trimmed[..157] + "..." : trimmed;
        }

        return null;
    }

    private static void WriteLog(string msg)
    {
        try
        {
            var logDir = Path.Combine(AppContext.BaseDirectory, "logs");
            Directory.CreateDirectory(logDir);
            var path = Path.Combine(logDir, $"runner_{DateTime.Now:yyyyMMdd}.log");
            File.AppendAllText(path, $"[{DateTime.Now:HH:mm:ss.fff}] {msg}{Environment.NewLine}");
        }
        catch
        {
        }
    }
}
