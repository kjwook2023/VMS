using Microsoft.Win32;

namespace VMSCleanSlate;

/// <summary>
/// 현재 사용자 로그온 시 자동 시작 (HKCU\Run).
/// 모든 사용자 적용은 추후 별도 GPO 등록으로 처리.
/// </summary>
public static class AutoStart
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "VMSCleanSlate";

    public static bool IsEnabled()
    {
        using var k = Registry.CurrentUser.OpenSubKey(RunKey, false);
        return k?.GetValue(ValueName) != null;
    }

    public static void Enable(string exePath)
    {
        using var k = Registry.CurrentUser.CreateSubKey(RunKey);
        k?.SetValue(ValueName, $"\"{exePath}\"", RegistryValueKind.String);
    }

    public static void Disable()
    {
        using var k = Registry.CurrentUser.OpenSubKey(RunKey, true);
        if (k?.GetValue(ValueName) != null)
        {
            k.DeleteValue(ValueName, false);
        }
    }
}
