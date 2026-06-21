using System.Drawing;

namespace VMSCleanSlate;

/// <summary>
/// 모든 토글을 한 화면에 모아두고 [저장] 한 번으로 적용하는 설정 폼.
/// </summary>
public class SettingsForm : Form
{
    private const int CheckLeft = 28;
    private const int CheckWidth = 360;
    private const int InfoLeft = 392;

    private readonly Config _config;
    private readonly Dictionary<string, CheckBox> _checks = new();
    private readonly ToolTip _toolTip = new();

    public bool ChangesSaved { get; private set; }

    public SettingsForm(Config config)
    {
        _config = config;

        Text            = "VMSCleanSlate 설정";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox     = false;
        MinimizeBox     = false;
        StartPosition   = FormStartPosition.CenterScreen;
        ClientSize      = new Size(440, 540);
        BackColor       = Color.White;
        Font            = new Font("Segoe UI", 9.5f);
        ShowInTaskbar   = false;
        TopMost         = true;

        _toolTip.ShowAlways = true;
        _toolTip.AutoPopDelay = 12000;
        _toolTip.InitialDelay = 250;
        _toolTip.ReshowDelay = 150;

        BuildUi();
    }

    private void BuildUi()
    {
        int y = 14;

        AddHeader("자동 실행 트리거", ref y);
        AddCheck(
            nameof(Config.TriggerOnLogoff),
            "로그오프 시 자동 정리",
            "Windows 로그오프 이벤트가 발생하면 사용자 정리 단계를 자동 실행합니다.\r\n공용 PC에서는 일반적으로 켜 두는 편이 맞습니다.",
            ref y);
        AddCheck(
            nameof(Config.TriggerOnShutdown),
            "PC 종료 시 자동 정리",
            "Windows 종료 이벤트가 발생하면 사용자 정리 단계를 자동 실행합니다.\r\nGPO Shutdown 훅이나 관리자 상승 정리와 연계될 수 있습니다.",
            ref y);
        AddCheck(
            nameof(Config.TriggerOnLock),
            "화면 잠금(Win+L) 시 자동 정리  (사용 권장 안 함)",
            "화면 잠금만 해도 로그오프와 비슷한 정리를 수행합니다.\r\n잠깐 자리를 비웠을 때도 앱 로그인이 풀릴 수 있어 일반 사용자 환경에서는 보통 끄는 것이 안전합니다.",
            ref y);
        // 잠금 트리거 옆에 빨간 경고 라벨
        var lockWarn = new Label
        {
            Text      = "    ⚠ 회의 중 쉬는 시간에 잠금되면 모든 앱이 로그아웃됩니다.",
            Location  = new System.Drawing.Point(28, y),
            Size      = new System.Drawing.Size(380, 16),
            Font      = new System.Drawing.Font(Font.FontFamily, 8.5f),
            ForeColor = System.Drawing.Color.FromArgb(192, 0, 0)
        };
        Controls.Add(lockWarn);
        y += 20;
        y += 10;

        AddHeader("정리 항목", ref y);
        AddCheck(
            nameof(Config.WorkSchoolAccess),
            "회사 / 학교 액세스 (사용자 세션)",
            "회사/학교 계정 연결과 관련된 사용자 세션 데이터를 정리합니다.\r\nWPJ 인증서와 AAD BrokerPlugin TokenBroker 계열 캐시가 대상입니다.",
            ref y);
        AddCheck(
            nameof(Config.DeviceEnrollmentCleanup),
            "장치 등록 해제 / MDM 정리 (종료 단계, 관리자/SYSTEM)",
            "장치 등록, MDM, EnterpriseMgmt, PolicyManager 관련 시스템 정리를 수행합니다.\r\n영향 범위가 크며 필요 시 dsregcmd /leave 까지 수행할 수 있습니다.",
            ref y);
        AddCheck(
            nameof(Config.Microsoft365),
            "Microsoft 365 (Office 자격증명·캐시)",
            "Office 프로세스를 종료하고 Office/Outlook/OneDrive/Teams 관련 자격 증명과 Office Identity/Licensing 캐시를 정리합니다.\r\n이 항목을 켜면 Office 로그인이 풀릴 수 있습니다.",
            ref y);
        AddCheck(
            nameof(Config.OneDriveSignout),
            "OneDrive (sign out)",
            "OneDrive 자체 sign out 을 시도하고 관련 설정/레지스트리를 정리합니다.\r\nOffice 계정과 별도로 OneDrive 로그인만 끊고 싶을 때 영향이 있습니다.",
            ref y);
        AddCheck(
            nameof(Config.OneDriveLocalFolder),
            "OneDrive 로컬 동기화 폴더 삭제",
            "%USERPROFILE% 아래의 OneDrive* 폴더를 삭제합니다.\r\n미동기화 파일 손실 가능성이 있으므로 공용 PC 정책에 맞을 때만 켜야 합니다.",
            ref y);
        AddCheck(
            nameof(Config.Teams),
            "Teams (신/구 버전)",
            "신형/구형 Teams 관련 프로세스, 토큰, 캐시, 저장소를 정리합니다.",
            ref y);
        AddCheck(
            nameof(Config.Notion),
            "Notion 데스크톱 앱",
            "Notion 데스크톱 앱의 세션, 저장소, 캐시 정리를 수행합니다.",
            ref y);
        AddCheck(
            nameof(Config.Slack),
            "Slack",
            "Slack 데스크톱 앱의 세션, 저장소, 캐시 정리를 수행합니다.",
            ref y);
        AddCheck(
            nameof(Config.BrowserCookies),
            "브라우저 쿠키 (Chrome / Edge / Firefox)",
            "이름과 달리 쿠키만 지우지 않습니다.\r\nChrome/Edge/Firefox 의 저장 로그인, 일부 세션 데이터, Local Storage/IndexedDB 등도 함께 정리합니다.",
            ref y);
        y += 10;

        AddHeader("알림", ref y);
        AddCheck(
            nameof(Config.HourlyNotify),
            "08시~18시 매시 55분에 시간 알림 표시",
            "업무 시간대에 매시 55분마다 트레이 알림을 띄웁니다.\r\n정리 기능에는 직접 영향이 없고 사용자 알림용입니다.",
            ref y);
        y += 10;

        AddHeader("옵션", ref y);
        AddCheck(
            nameof(Config.Backup),
            "정리 전 백업 생성 (가능한 항목만)",
            "일부 정리 대상에 대해 삭제 전에 backup 폴더를 생성합니다.\r\n항목에 따라 백업 가능한 것만 저장되며, 항상 모든 데이터가 복구 가능한 것은 아닙니다.",
            ref y);
        AddCheck(
            nameof(Config.LogOnlyOnError),
            "에러 발생 시에만 로그 파일 생성",
            "켜면 logoff/shutdown 단계 로그는 오류가 있을 때만 생성됩니다.\r\n끄면 성공/실패 모두 기록되어 문제 분석에는 유리하지만 로그 파일이 더 많이 남습니다.",
            ref y);
        y += 18;

        // 안내 라벨
        var hint = new Label
        {
            Text      = "[저장] 후 다음 자동 실행부터 적용됩니다.",
            Location  = new Point(20, y),
            Size      = new Size(400, 18),
            ForeColor = Color.Gray,
            Font      = new Font(Font, FontStyle.Italic)
        };
        Controls.Add(hint);
        y += 26;

        // 버튼
        var btnSave = new Button
        {
            Text          = "저장",
            DialogResult  = DialogResult.OK,
            Size          = new Size(90, 30),
            Location      = new Point(ClientSize.Width - 200, y),
            BackColor     = Color.FromArgb(0, 120, 215),
            ForeColor     = Color.White,
            FlatStyle     = FlatStyle.Flat,
            Font          = new Font(Font, FontStyle.Bold)
        };
        btnSave.FlatAppearance.BorderSize = 0;
        btnSave.Click += (s, e) => Save();
        Controls.Add(btnSave);
        AcceptButton = btnSave;

        var btnCancel = new Button
        {
            Text         = "취소",
            DialogResult = DialogResult.Cancel,
            Size         = new Size(90, 30),
            Location     = new Point(ClientSize.Width - 105, y)
        };
        Controls.Add(btnCancel);
        CancelButton = btnCancel;

        ClientSize = new Size(ClientSize.Width, y + 50);
    }

    private void AddHeader(string text, ref int y)
    {
        var lbl = new Label
        {
            Text      = text,
            Location  = new Point(12, y),
            Size      = new Size(416, 20),
            Font      = new Font(Font.FontFamily, 10, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 90, 158)
        };
        Controls.Add(lbl);
        y += 24;

        // 구분선
        var line = new Label
        {
            BorderStyle = BorderStyle.Fixed3D,
            Location    = new Point(14, y),
            Size        = new Size(410, 2),
            Height      = 2
        };
        Controls.Add(line);
        y += 6;
    }

    private void AddCheck(string key, string text, string detail, ref int y)
    {
        var cb = new CheckBox
        {
            Text     = "  " + text,
            Location = new Point(CheckLeft, y),
            Size     = new Size(CheckWidth, 22),
            Checked  = _config[key]
        };
        _checks[key] = cb;
        Controls.Add(cb);

        var info = new Label
        {
            Text = "i",
            Location = new Point(InfoLeft, y + 2),
            Size = new Size(18, 18),
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font(Font.FontFamily, 8.5f, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = Color.FromArgb(0, 120, 215),
            BorderStyle = BorderStyle.FixedSingle,
            Cursor = Cursors.Help
        };
        _toolTip.SetToolTip(info, detail);
        _toolTip.SetToolTip(cb, detail);
        Controls.Add(info);

        y += 24;
    }

    private void Save()
    {
        foreach (var kv in _checks)
        {
            _config[kv.Key] = kv.Value.Checked;
        }
        ConfigManager.Save(_config);
        ChangesSaved = true;
    }
}
