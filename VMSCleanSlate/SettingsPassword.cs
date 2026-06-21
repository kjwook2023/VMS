using System.Security.Cryptography;
using System.Text;

namespace VMSCleanSlate;

public static class SettingsPassword
{
    // Fixed at build time from the password that was previously stored in pw.env.
    private static readonly byte[] ExpectedPasswordHash =
        Convert.FromHexString("A5B63F570AE9661B64B6092BEDBE855619474D6C02E6468CC438110A34F510A0");

    public static bool TryPrompt(IWin32Window? owner, string targetName)
    {
        using var prompt = new PasswordPromptForm(targetName);
        if (prompt.ShowDialog(owner) != DialogResult.OK)
        {
            return false;
        }

        if (IsMatch(prompt.EnteredPassword))
        {
            return true;
        }

        MessageBox.Show(
            "비밀번호가 올바르지 않습니다.",
            "VMSCleanSlate",
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning);
        return false;
    }

    private static bool IsMatch(string enteredPassword)
    {
        var enteredBytes = Encoding.UTF8.GetBytes(enteredPassword);
        var enteredHash = SHA256.HashData(enteredBytes);
        return CryptographicOperations.FixedTimeEquals(enteredHash, ExpectedPasswordHash);
    }
}
