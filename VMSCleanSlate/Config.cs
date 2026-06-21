using System.Text.Json.Serialization;

namespace VMSCleanSlate;

/// <summary>
/// 모든 속성에 <see cref="JsonPropertyNameAttribute"/> 를 명시해 JSON 키를 고정하고,
/// indexer 는 reflection 대신 switch 로 처리한다.
/// 이렇게 하면 ConfuserEx 의 rename 보호가 속성 이름을 변경해도
/// JSON 직렬화 키와 indexer 동작이 모두 안정적으로 유지된다.
/// </summary>
public class Config
{
    // --- 트리거 ---
    [JsonPropertyName("TriggerOnLogoff")]    public string TriggerOnLogoff     { get; set; } = "Y";
    [JsonPropertyName("TriggerOnShutdown")]  public string TriggerOnShutdown   { get; set; } = "Y";
    [JsonPropertyName("TriggerOnLock")]      public string TriggerOnLock       { get; set; } = "N";

    // --- 정리 항목 ---
    [JsonPropertyName("WorkSchoolAccess")]   public string WorkSchoolAccess    { get; set; } = "Y";
    [JsonPropertyName("DeviceEnrollmentCleanup")]
                                             public string DeviceEnrollmentCleanup { get; set; } = "Y";
    [JsonPropertyName("Microsoft365")]       public string Microsoft365        { get; set; } = "Y";
    [JsonPropertyName("OneDriveSignout")]    public string OneDriveSignout     { get; set; } = "Y";
    [JsonPropertyName("OneDriveLocalFolder")]public string OneDriveLocalFolder { get; set; } = "Y";
    [JsonPropertyName("Teams")]              public string Teams               { get; set; } = "Y";
    [JsonPropertyName("Notion")]             public string Notion              { get; set; } = "Y";
    [JsonPropertyName("Slack")]              public string Slack               { get; set; } = "Y";
    [JsonPropertyName("BrowserCookies")]     public string BrowserCookies      { get; set; } = "Y";

    // --- 알림 ---
    [JsonPropertyName("HourlyNotify")]       public string HourlyNotify        { get; set; } = "Y";

    // --- 옵션 ---
    [JsonPropertyName("Backup")]             public string Backup              { get; set; } = "N";
    [JsonPropertyName("LogOnlyOnError")]     public string LogOnlyOnError      { get; set; } = "Y";

    [JsonIgnore]
    public bool this[string key]
    {
        get => IsY(GetByKey(key));
        set => SetByKey(key, value ? "Y" : "N");
    }

    private string? GetByKey(string key) => key switch
    {
        nameof(TriggerOnLogoff)     => TriggerOnLogoff,
        nameof(TriggerOnShutdown)   => TriggerOnShutdown,
        nameof(TriggerOnLock)       => TriggerOnLock,
        nameof(WorkSchoolAccess)    => WorkSchoolAccess,
        nameof(DeviceEnrollmentCleanup) => DeviceEnrollmentCleanup,
        nameof(Microsoft365)        => Microsoft365,
        nameof(OneDriveSignout)     => OneDriveSignout,
        nameof(OneDriveLocalFolder) => OneDriveLocalFolder,
        nameof(Teams)               => Teams,
        nameof(Notion)              => Notion,
        nameof(Slack)               => Slack,
        nameof(BrowserCookies)      => BrowserCookies,
        nameof(HourlyNotify)        => HourlyNotify,
        nameof(Backup)              => Backup,
        nameof(LogOnlyOnError)      => LogOnlyOnError,
        _                           => null
    };

    private void SetByKey(string key, string v)
    {
        switch (key)
        {
            case nameof(TriggerOnLogoff):     TriggerOnLogoff     = v; break;
            case nameof(TriggerOnShutdown):   TriggerOnShutdown   = v; break;
            case nameof(TriggerOnLock):       TriggerOnLock       = v; break;
            case nameof(WorkSchoolAccess):    WorkSchoolAccess    = v; break;
            case nameof(DeviceEnrollmentCleanup): DeviceEnrollmentCleanup = v; break;
            case nameof(Microsoft365):        Microsoft365        = v; break;
            case nameof(OneDriveSignout):     OneDriveSignout     = v; break;
            case nameof(OneDriveLocalFolder): OneDriveLocalFolder = v; break;
            case nameof(Teams):               Teams               = v; break;
            case nameof(Notion):              Notion              = v; break;
            case nameof(Slack):               Slack               = v; break;
            case nameof(BrowserCookies):      BrowserCookies      = v; break;
            case nameof(HourlyNotify):        HourlyNotify        = v; break;
            case nameof(Backup):              Backup              = v; break;
            case nameof(LogOnlyOnError):      LogOnlyOnError      = v; break;
        }
    }

    private static bool IsY(string? v) =>
        string.Equals(v?.Trim(), "Y", StringComparison.OrdinalIgnoreCase);
}
