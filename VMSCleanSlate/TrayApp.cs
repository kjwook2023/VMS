using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace VMSCleanSlate;

public class TrayApp : ApplicationContext
{
    private readonly NotifyIcon _icon;
    private readonly ContextMenuStrip _menu;
    private readonly Form _shutdownBlocker;

    private Config _config;
    private bool _isBusy;
    private ToolStripMenuItem _autoStartItem = null!;
    private ToolStripMenuItem _gpoInstallItem = null!;
    private ToolStripMenuItem _statusItem = null!;
    private ToolStripMenuItem _runNowItem = null!;
    private System.Windows.Forms.Timer _hourlyTimer = null!;
    private DateTime _lastHourlyNotifyAt = DateTime.MinValue;
    private ReminderPopupForm? _hourlyReminderPopup;

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool ShutdownBlockReasonCreate(IntPtr hWnd, string pwszReason);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool ShutdownBlockReasonDestroy(IntPtr hWnd);

    public TrayApp()
    {
        _config = ConfigManager.Load();

        _shutdownBlocker = new Form
        {
            ShowInTaskbar = false,
            FormBorderStyle = FormBorderStyle.None,
            Opacity = 0,
            Size = new System.Drawing.Size(1, 1),
            StartPosition = FormStartPosition.Manual,
            Location = new System.Drawing.Point(-32000, -32000),
            Visible = false
        };
        _ = _shutdownBlocker.Handle;

        _menu = BuildMenu();
        _icon = new NotifyIcon
        {
            Icon = IconFactory.Create(32),
            Text = "VMSCleanSlate - 대기 중",
            Visible = true,
            ContextMenuStrip = _menu
        };
        _icon.MouseClick += OnTrayMouseClick;
        _icon.DoubleClick += (_, _) => RunCleanupNow();

        SystemEvents.SessionEnding += OnSessionEnding;
        SystemEvents.SessionSwitch += OnSessionSwitch;

        _hourlyTimer = new System.Windows.Forms.Timer { Interval = 30_000 };
        _hourlyTimer.Tick += OnHourlyTimerTick;
        _hourlyTimer.Start();

        UpdateStatus("대기 중");
    }

    private ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip();

        _statusItem = new ToolStripMenuItem("● 대기 중") { Enabled = false };
        menu.Items.Add(_statusItem);
        menu.Items.Add(new ToolStripSeparator());

        _runNowItem = new ToolStripMenuItem("지금 정리 실행", null, (_, _) => RunCleanupNow());
        _runNowItem.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
        menu.Items.Add(_runNowItem);
        menu.Items.Add(new ToolStripMenuItem("정리 후 로그아웃", null, (_, _) => RunCleanupThen("/l")));
        menu.Items.Add(new ToolStripMenuItem("정리 후 PC 종료", null, (_, _) => RunCleanupThen("/s /t 5")));
        menu.Items.Add(new ToolStripSeparator());

        menu.Items.Add(new ToolStripMenuItem("설정...", null, (_, _) => OpenSettings()));
        menu.Items.Add(new ToolStripSeparator());

        _autoStartItem = new ToolStripMenuItem("PC 부팅 시 자동 시작")
        {
            CheckOnClick = true,
            Checked = AutoStart.IsEnabled()
        };
        _autoStartItem.CheckedChanged += (_, _) =>
        {
            try
            {
                if (_autoStartItem.Checked)
                {
                    AutoStart.Enable(Application.ExecutablePath);
                }
                else
                {
                    AutoStart.Disable();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("자동 시작 설정 변경 실패: " + ex.Message, "VMSCleanSlate");
                _autoStartItem.Checked = AutoStart.IsEnabled();
            }
        };
        menu.Items.Add(_autoStartItem);

        _gpoInstallItem = new ToolStripMenuItem("시스템 자동 정리 등록 (관리자)")
        {
            Checked = GpoInstaller.IsInstalled(),
            CheckOnClick = false
        };
        _gpoInstallItem.Click += (_, _) =>
        {
            var wasInstalled = GpoInstaller.IsInstalled();
            var arg = wasInstalled ? "--uninstall-gpo" : "--install-gpo";

            UpdateStatus(wasInstalled ? "GPO 해제 중..." : "GPO 등록 중...");
            var rc = PowerShellRunner.RunSelfElevated(arg);
            _gpoInstallItem.Checked = GpoInstaller.IsInstalled();

            if (rc == 0)
            {
                UpdateStatus(_gpoInstallItem.Checked ? "GPO 등록됨" : "GPO 해제됨");
                _icon.ShowBalloonTip(
                    3000,
                    "VMSCleanSlate",
                    _gpoInstallItem.Checked
                        ? "종료 시 SYSTEM 컨텍스트 정리가 가능하도록 GPO가 등록되었습니다."
                        : "GPO 자동 정리 등록이 해제되었습니다.",
                    ToolTipIcon.Info);
            }
            else
            {
                UpdateStatus("대기 중 (GPO 변경 취소/실패)");
            }
        };
        menu.Items.Add(_gpoInstallItem);

        menu.Items.Add(new ToolStripMenuItem("설정 파일 열기", null, (_, _) => OpenConfigFile()));
        menu.Items.Add(new ToolStripMenuItem("로그 폴더 열기", null, (_, _) => OpenLogFolder()));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("제품 문의 / 지원 요청", null, (_, _) => SendSupportEmail()));
        menu.Items.Add(new ToolStripMenuItem($"VMSCleanSlate v1.0 - {Path.GetFileName(Application.ExecutablePath)}")
        {
            Enabled = false
        });
        menu.Items.Add(new ToolStripMenuItem("종료", null, (_, _) => ExitApp()));

        return menu;
    }

    private void OnHourlyTimerTick(object? sender, EventArgs e)
    {
        if (!_config[nameof(Config.HourlyNotify)])
        {
            return;
        }
        var now = DateTime.Now;
        if (now.Hour < 8 || now.Hour > 18 || now.Minute != 55)
        {
            return;
        }
        var slot = new DateTime(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0);
        if (_lastHourlyNotifyAt == slot)
        {
            return;
        }
        _lastHourlyNotifyAt = slot;
        try
        {
            ShowHourlyReminderPopup($"{now.Hour:D2}? 55????.");
        }
        catch
        {
        }
    }
    private void ShowHourlyReminderPopup(string message)
    {
        try
        {
            if (_hourlyReminderPopup is { IsDisposed: false })
            {
                _hourlyReminderPopup.Close();
            }
            _hourlyReminderPopup = new ReminderPopupForm("?? ??", message);
            _hourlyReminderPopup.FormClosed += (_, _) => _hourlyReminderPopup = null;
            _hourlyReminderPopup.Show();
        }
        catch
        {
        }
    }
    private void OnTrayMouseClick(object? sender, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left)
        {
            return;
        }

        var method = typeof(NotifyIcon).GetMethod(
            "ShowContextMenu",
            BindingFlags.NonPublic | BindingFlags.Instance);
        method?.Invoke(_icon, null);
    }

    private void OpenSettings()
    {
        try
        {
            if (!RequireSettingsPassword("설정 창"))
            {
                return;
            }

            using var form = new SettingsForm(_config);
            var result = form.ShowDialog();
            if (result == DialogResult.OK && form.ChangesSaved)
            {
                _config = ConfigManager.Load();
                _icon.ShowBalloonTip(2000, "VMSCleanSlate", "설정이 저장되었습니다.", ToolTipIcon.Info);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "설정 창을 열 수 없습니다: " + ex.Message,
                "VMSCleanSlate",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private void OpenConfigFile()
    {
        try
        {
            if (!RequireSettingsPassword("설정 파일"))
            {
                return;
            }

            if (!File.Exists(ConfigManager.ConfigPath))
            {
                ConfigManager.Save(_config);
            }

            Process.Start(new ProcessStartInfo("notepad.exe", $"\"{ConfigManager.ConfigPath}\"")
            {
                UseShellExecute = true
            });
        }
        catch
        {
        }
    }

    private bool RequireSettingsPassword(string targetName)
    {
        if (!SettingsPassword.TryPrompt(this.GetTopLevelOwner(), targetName))
        {
            LogDiag($"Password check failed for {targetName}");
            return false;
        }

        return true;
    }

    private IWin32Window GetTopLevelOwner() =>
        _menu.IsHandleCreated ? _menu : _shutdownBlocker;

    private void OpenLogFolder()
    {
        try
        {
            var logDir = Path.Combine(AppContext.BaseDirectory, "logs");
            Directory.CreateDirectory(logDir);
            Process.Start(new ProcessStartInfo("explorer.exe", $"\"{logDir}\"")
            {
                UseShellExecute = true
            });
        }
        catch
        {
        }
    }

    private void UpdateStatus(string text)
    {
        _statusItem.Text = "● " + text;
        var title = "VMSCleanSlate - " + text;
        _icon.Text = title.Length > 63 ? title[..60] + "..." : title;
    }

    private void RunCleanupNow()
    {
        if (_isBusy)
        {
            return;
        }

        _isBusy = true;
        _runNowItem.Enabled = false;
        UpdateStatus("정리 중 (사용자 권한)...");
        LogDiag("RunCleanupNow: started");

        Task.Run(() =>
        {
            var userResult = PowerShellRunner.RunEmbedded(CleanupAction.Logoff);
            LogDiag($"  user cleanup: rc={userResult.ExitCode}, err='{userResult.Error}'");

            var shutdownResult = new CleanupRunResult
            {
                Action = CleanupAction.Shutdown,
                ExitCode = 0
            };
            var gpoDeferred = false;

            if (_config[nameof(Config.DeviceEnrollmentCleanup)])
            {
                if (GpoInstaller.IsShutdownInstalled())
                {
                    gpoDeferred = true;
                    LogDiag("  system cleanup: deferred to GPO Shutdown hook");
                }
                else
                {
                    BeginInvokeOnUi(() => UpdateStatus("정리 중 (관리자 권한 필요)..."));
                    shutdownResult = PowerShellRunner.RunSelfElevated(CleanupAction.Shutdown);
                    LogDiag($"  system cleanup: rc={shutdownResult.ExitCode}, err='{shutdownResult.Error}'");
                }
            }

            BeginInvokeOnUi(() =>
            {
                _isBusy = false;
                _runNowItem.Enabled = true;

                if (userResult.Ok && shutdownResult.Ok)
                {
                    UpdateStatus("대기 중 (마지막 정리 OK)");
                    var message = gpoDeferred
                        ? "정리 완료\n장치 정리는 다음 PC 종료 시 자동 처리됩니다."
                        : "정리 완료";
                    _icon.ShowBalloonTip(3000, "VMSCleanSlate", message, ToolTipIcon.Info);
                    return;
                }

                var detail = !string.IsNullOrWhiteSpace(userResult.Error)
                    ? userResult.Error
                    : !string.IsNullOrWhiteSpace(shutdownResult.Error)
                        ? shutdownResult.Error
                        : $"User rc={userResult.ExitCode}, Sys rc={shutdownResult.ExitCode}";
                UpdateStatus("오류 - logs 확인");
                _icon.ShowBalloonTip(
                    8000,
                    "VMSCleanSlate 오류",
                    detail + "\n자세한 내용: 트레이 메뉴 > 로그 폴더 열기",
                    ToolTipIcon.Warning);
                LogDiag("  -> error shown: " + detail);
            });
        });
    }

    private void OnSessionEnding(object? sender, SessionEndingEventArgs e)
    {
        var isLogoff = e.Reason == SessionEndReasons.Logoff;
        var isShutdown = e.Reason == SessionEndReasons.SystemShutdown;

        if (isLogoff && !_config[nameof(Config.TriggerOnLogoff)])
        {
            return;
        }

        if (isShutdown && !_config[nameof(Config.TriggerOnShutdown)])
        {
            return;
        }

        if (isShutdown && GpoInstaller.IsLogoffInstalled())
        {
            LogDiag("SessionEnding: shutdown skipped because GPO Logoff will handle cleanup");
            return;
        }

        var hwnd = _shutdownBlocker.Handle;
        try
        {
            var blocked = ShutdownBlockReasonCreate(hwnd, "VMSCleanSlate가 정리 작업을 수행 중입니다. 최대 60초");
            LogDiag($"SessionEnding: Reason={e.Reason}, ShutdownBlockReasonCreate={blocked}");

            var startedAt = DateTime.Now;
            var result = PowerShellRunner.RunEmbedded(CleanupAction.Logoff);
            var elapsed = (DateTime.Now - startedAt).TotalSeconds;
            LogDiag($"  cleanup done: rc={result.ExitCode}, elapsed={elapsed:F1}s, err='{result.Error}'");

            if (result.ExitCode == PowerShellRunner.ExitCode_DllInitFailed)
            {
                LogDiag("  STATUS_DLL_INIT_FAILED: shutdown already too far progressed");
            }
        }
        catch (Exception ex)
        {
            LogDiag("  SessionEnding EX: " + ex.Message);
        }
        finally
        {
            try
            {
                ShutdownBlockReasonDestroy(hwnd);
            }
            catch
            {
            }

            LogDiag("  ShutdownBlockReasonDestroy called");
        }
    }

    private void OnSessionSwitch(object? sender, SessionSwitchEventArgs e)
    {
        LogDiag($"SessionSwitch event: Reason={e.Reason}");

        if (e.Reason != SessionSwitchReason.SessionLock)
        {
            LogDiag("  -> not SessionLock, ignored");
            return;
        }

        var enabled = _config[nameof(Config.TriggerOnLock)];
        LogDiag("  TriggerOnLock = " + (enabled ? "Y" : "N"));
        if (!enabled)
        {
            LogDiag("  -> trigger OFF, skip cleanup");
            return;
        }

        Task.Run(() =>
        {
            var startedAt = DateTime.Now;
            try
            {
                var result = PowerShellRunner.RunEmbedded(CleanupAction.Logoff);
                var elapsed = (DateTime.Now - startedAt).TotalSeconds;
                LogDiag($"  cleanup finished: rc={result.ExitCode}, elapsed={elapsed:F1}s, err='{result.Error}'");
            }
            catch (Exception ex)
            {
                LogDiag("  cleanup EXCEPTION: " + ex.Message);
            }
        });
    }

    private void LogDiag(string message)
    {
        try
        {
            var logDir = Path.Combine(AppContext.BaseDirectory, "logs");
            Directory.CreateDirectory(logDir);
            var path = Path.Combine(logDir, $"diag_{DateTime.Now:yyyyMMdd}.log");
            File.AppendAllText(path, $"[{DateTime.Now:HH:mm:ss.fff}] {message}{Environment.NewLine}");
        }
        catch
        {
        }
    }

    private void RunCleanupThen(string shutdownArgs)
    {
        if (_isBusy)
        {
            return;
        }

        _isBusy = true;
        _runNowItem.Enabled = false;
        UpdateStatus("정리 중...");

        Task.Run(() =>
        {
            try
            {
                var logoffResult = PowerShellRunner.RunEmbedded(CleanupAction.Logoff);
                if (!logoffResult.Ok)
                {
                    throw new InvalidOperationException(logoffResult.Error ?? $"Logoff cleanup failed ({logoffResult.ExitCode}).");
                }

                if (_config[nameof(Config.DeviceEnrollmentCleanup)] && !GpoInstaller.IsShutdownInstalled())
                {
                    BeginInvokeOnUi(() => UpdateStatus("관리자 권한 정리 중..."));
                    var shutdownResult = PowerShellRunner.RunSelfElevated(CleanupAction.Shutdown);
                    if (!shutdownResult.Ok)
                    {
                        throw new InvalidOperationException(shutdownResult.Error ?? $"Shutdown cleanup failed ({shutdownResult.ExitCode}).");
                    }
                }

                BeginInvokeOnUi(() => UpdateStatus("로그아웃/종료 중..."));
                Process.Start(new ProcessStartInfo("shutdown.exe", shutdownArgs)
                {
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                });
            }
            catch (Exception ex)
            {
                BeginInvokeOnUi(() =>
                {
                    _isBusy = false;
                    _runNowItem.Enabled = true;
                    UpdateStatus("오류: " + ex.Message);
                });
            }
        });
    }

    private void BeginInvokeOnUi(Action action)
    {
        if (_menu.IsHandleCreated)
        {
            _menu.BeginInvoke(action);
        }
        else
        {
            action();
        }
    }

    private void ExitApp()
    {
        try
        {
            SystemEvents.SessionEnding -= OnSessionEnding;
        }
        catch
        {
        }

        try
        {
            SystemEvents.SessionSwitch -= OnSessionSwitch;
        }
        catch
        {
        }

        try
        {
            _hourlyTimer.Stop();
            _hourlyTimer.Dispose();
        }
        catch
        {
        }
        try
        {
            _hourlyReminderPopup?.Close();
            _hourlyReminderPopup?.Dispose();
        }
        catch
        {
        }
        _icon.Visible = false;
        _icon.Dispose();
        _menu.Dispose();

        try
        {
            _shutdownBlocker.Dispose();
        }
        catch
        {
        }

        Application.Exit();
    }

    private const string SupportEmail = "jwkim@vms-solutions.com";

    private void SendSupportEmail()
    {
        try
        {
            var subject = Uri.EscapeDataString("[VMSCleanSlate] 지원 요청");
            var body = Uri.EscapeDataString(
                "VMSCleanSlate 사용 중 문의 사항을 남겨 주세요.\r\n\r\n" +
                "---------- 자동 수집 정보 ----------\r\n" +
                $"제품: VMSCleanSlate v1.0\r\n" +
                $"컴퓨터: {Environment.MachineName}\r\n" +
                $"사용자: {Environment.UserName}\r\n" +
                $"OS: {Environment.OSVersion}\r\n" +
                $".NET: {Environment.Version}\r\n" +
                $"실행 경로: {Application.ExecutablePath}\r\n" +
                $"GPO 등록: {(GpoInstaller.IsInstalled() ? "YES" : "NO")}\r\n" +
                $"자동 시작: {(AutoStart.IsEnabled() ? "YES" : "NO")}\r\n");

            var mailto = $"mailto:{SupportEmail}?subject={subject}&body={body}";
            Process.Start(new ProcessStartInfo { FileName = mailto, UseShellExecute = true });
        }
        catch (Exception ex)
        {
            try
            {
                Clipboard.SetText(SupportEmail);
            }
            catch
            {
            }

            MessageBox.Show(
                "메일 클라이언트를 열 수 없습니다.\r\n\r\n" +
                $"다음 주소로 직접 보내 주세요.\r\n  {SupportEmail}\r\n\r\n" +
                "(이메일 주소는 클립보드에 복사됩니다.)\r\n\r\n" +
                "오류: " + ex.Message,
                "VMSCleanSlate - 지원 요청",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        }
    }
}
