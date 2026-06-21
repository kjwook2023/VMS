using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace VMSCleanSlate;

public static class GpoInstaller
{
    private const string MachineDir = @"C:\Windows\System32\GroupPolicy\Machine\Scripts";
    private const string MachineIni = MachineDir + @"\scripts.ini";
    private const string UserDir = @"C:\Windows\System32\GroupPolicy\User\Scripts";
    private const string UserIni = UserDir + @"\scripts.ini";
    private const string GptIni = @"C:\Windows\System32\GroupPolicy\gpt.ini";
    private const string CseGuids = "[{42B5FAAE-6536-11D2-AE5A-0000F87571E3}{40B6664F-4972-11D1-A7CA-0000F87571E3}]";

    private const string ShutdownReg = @"Software\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Shutdown";
    private const string LogoffReg = @"Software\Microsoft\Windows\CurrentVersion\Group Policy\Scripts\Logoff";
    private const string MarkerName = "VMSCleanSlate.exe";

    public static bool IsInstalled() => IsShutdownInstalled() && IsLogoffInstalled();

    public static bool IsShutdownInstalled() => IniContains(MachineIni, "Shutdown");

    public static bool IsLogoffInstalled() => IniContains(UserIni, "Logoff");

    public static int Install(string exePath)
    {
        try
        {
            Directory.CreateDirectory(MachineDir);
            Directory.CreateDirectory(UserDir);

            UpsertIniScript(MachineIni, "Shutdown", exePath, "-Shutdown");
            UpsertIniScript(UserIni, "Logoff", exePath, "-Logoff");

            UpsertRegistryScript(ShutdownReg, exePath, "-Shutdown", @"C:\Windows\System32\GroupPolicy\Machine");
            UpsertRegistryScript(LogoffReg, exePath, "-Logoff", @"C:\Windows\System32\GroupPolicy\User");

            UpdateGptIni();
            RunGpUpdate();
            return 0;
        }
        catch (UnauthorizedAccessException)
        {
            return 5;
        }
        catch
        {
            return 1;
        }
    }

    public static int Uninstall()
    {
        try
        {
            RemoveIniScript(MachineIni, "Shutdown");
            RemoveIniScript(UserIni, "Logoff");

            RemoveRegistryScripts(ShutdownReg);
            RemoveRegistryScripts(LogoffReg);

            UpdateGptIni();
            RunGpUpdate();
            return 0;
        }
        catch
        {
            return 1;
        }
    }

    private static bool IniContains(string ini, string section)
    {
        if (!File.Exists(ini))
        {
            return false;
        }

        try
        {
            var text = ReadIniText(ini);
            return text.IndexOf(MarkerName, StringComparison.OrdinalIgnoreCase) >= 0 &&
                   text.IndexOf("[" + section + "]", StringComparison.OrdinalIgnoreCase) >= 0;
        }
        catch
        {
            return false;
        }
    }

    private static void UpsertIniScript(string path, string sectionName, string exePath, string parameter)
    {
        var doc = LoadIni(path);
        var section = doc.GetOrAdd(sectionName);

        RemoveOwnedEntries(section);
        var nextIndex = GetNextIndex(section);
        section.Entries.Add(new KeyValuePair<string, string>($"{nextIndex}CmdLine", exePath));
        section.Entries.Add(new KeyValuePair<string, string>($"{nextIndex}Parameters", parameter));

        SaveIni(path, doc);
    }

    private static void RemoveIniScript(string path, string sectionName)
    {
        if (!File.Exists(path))
        {
            return;
        }

        var doc = LoadIni(path);
        var section = doc.Sections.FirstOrDefault(s => s.Name.Equals(sectionName, StringComparison.OrdinalIgnoreCase));
        if (section == null)
        {
            return;
        }

        RemoveOwnedEntries(section);
        if (section.Entries.Count == 0)
        {
            doc.Sections.Remove(section);
        }

        if (doc.Sections.Count == 0)
        {
            File.Delete(path);
            return;
        }

        SaveIni(path, doc);
    }

    private static void RemoveOwnedEntries(IniSection section)
    {
        var ownedIndexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var entry in section.Entries)
        {
            var match = Regex.Match(entry.Key, @"^(\d+)CmdLine$", RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                continue;
            }

            if (entry.Value.IndexOf(MarkerName, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                ownedIndexes.Add(match.Groups[1].Value);
            }
        }

        if (ownedIndexes.Count == 0)
        {
            return;
        }

        section.Entries.RemoveAll(entry =>
        {
            var match = Regex.Match(entry.Key, @"^(\d+)(CmdLine|Parameters)$", RegexOptions.IgnoreCase);
            return match.Success && ownedIndexes.Contains(match.Groups[1].Value);
        });
    }

    private static int GetNextIndex(IniSection section)
    {
        var max = -1;
        foreach (var entry in section.Entries)
        {
            var match = Regex.Match(entry.Key, @"^(\d+)(CmdLine|Parameters)$", RegexOptions.IgnoreCase);
            if (match.Success && int.TryParse(match.Groups[1].Value, out var idx))
            {
                max = Math.Max(max, idx);
            }
        }

        return max + 1;
    }

    private static void UpsertRegistryScript(string regBase, string exePath, string parameter, string fileSysPath)
    {
        using var root = Registry.LocalMachine.CreateSubKey(regBase);
        if (root == null)
        {
            throw new InvalidOperationException("Failed to open registry path: " + regBase);
        }

        var slot = FindExistingRegistrySlot(root, exePath);
        if (slot < 0)
        {
            slot = FindNextRegistrySlot(root);
        }

        using (var slotKey = root.CreateSubKey(slot.ToString()))
        {
            slotKey?.SetValue("DisplayName", "Local Group Policy", RegistryValueKind.String);
            slotKey?.SetValue("GPOName", "Local Group Policy", RegistryValueKind.String);
            slotKey?.SetValue("GPO-ID", "LocalGPO", RegistryValueKind.String);
            slotKey?.SetValue("SOM-ID", "Local", RegistryValueKind.String);
            slotKey?.SetValue("FileSysPath", fileSysPath, RegistryValueKind.String);
        }

        using (var entryKey = root.CreateSubKey(slot + @"\0"))
        {
            entryKey?.SetValue("Script", exePath, RegistryValueKind.String);
            entryKey?.SetValue("Parameters", parameter, RegistryValueKind.String);
            entryKey?.SetValue("IsPowershell", 0, RegistryValueKind.DWord);
            entryKey?.SetValue("ExecTime", (ulong)0, RegistryValueKind.QWord);
        }
    }

    private static void RemoveRegistryScripts(string regBase)
    {
        using var root = Registry.LocalMachine.OpenSubKey(regBase, writable: true);
        if (root == null)
        {
            return;
        }

        foreach (var subKeyName in root.GetSubKeyNames())
        {
            if (!int.TryParse(subKeyName, out _))
            {
                continue;
            }

            using var entryKey = root.OpenSubKey(subKeyName + @"\0");
            var script = entryKey?.GetValue("Script") as string;
            if (script != null && script.IndexOf(MarkerName, StringComparison.OrdinalIgnoreCase) >= 0)
            {
                root.DeleteSubKeyTree(subKeyName, throwOnMissingSubKey: false);
            }
        }
    }

    private static int FindExistingRegistrySlot(RegistryKey root, string exePath)
    {
        foreach (var subKeyName in root.GetSubKeyNames())
        {
            if (!int.TryParse(subKeyName, out var slot))
            {
                continue;
            }

            using var entryKey = root.OpenSubKey(subKeyName + @"\0");
            var script = entryKey?.GetValue("Script") as string;
            if (string.IsNullOrWhiteSpace(script))
            {
                continue;
            }

            if (script.IndexOf(MarkerName, StringComparison.OrdinalIgnoreCase) >= 0 ||
                string.Equals(script, exePath, StringComparison.OrdinalIgnoreCase))
            {
                return slot;
            }
        }

        return -1;
    }

    private static int FindNextRegistrySlot(RegistryKey root)
    {
        var max = -1;
        foreach (var subKeyName in root.GetSubKeyNames())
        {
            if (int.TryParse(subKeyName, out var slot))
            {
                max = Math.Max(max, slot);
            }
        }

        return max + 1;
    }

    private static void UpdateGptIni()
    {
        string content;
        if (File.Exists(GptIni))
        {
            content = File.ReadAllText(GptIni);

            if (content.IndexOf("42B5FAAE-6536-11D2-AE5A-0000F87571E3", StringComparison.OrdinalIgnoreCase) < 0)
            {
                content = ReplaceOrAppend(content, @"(?im)^gPCMachineExtensionNames=.*$", "gPCMachineExtensionNames=" + CseGuids);
                content = ReplaceOrAppend(content, @"(?im)^gPCUserExtensionNames=.*$", "gPCUserExtensionNames=" + CseGuids);
            }

            var versionMatch = Regex.Match(content, @"(?im)^Version=(\d+)\s*$");
            if (versionMatch.Success)
            {
                var nextVersion = int.Parse(versionMatch.Groups[1].Value) + 1;
                content = Regex.Replace(content, @"(?im)^Version=\d+\s*$", "Version=" + nextVersion);
            }
            else
            {
                content = content.TrimEnd() + "\r\nVersion=1\r\n";
            }
        }
        else
        {
            Directory.CreateDirectory(Path.GetDirectoryName(GptIni)!);
            content =
                "[General]\r\n" +
                "gPCMachineExtensionNames=" + CseGuids + "\r\n" +
                "gPCUserExtensionNames=" + CseGuids + "\r\n" +
                "Version=1\r\n";
        }

        File.WriteAllText(GptIni, content, Encoding.ASCII);
    }

    private static string ReplaceOrAppend(string text, string pattern, string newLine)
    {
        if (Regex.IsMatch(text, pattern))
        {
            return Regex.Replace(text, pattern, newLine);
        }

        return text.TrimEnd() + "\r\n" + newLine + "\r\n";
    }

    private static void RunGpUpdate()
    {
        try
        {
            var psi = new ProcessStartInfo("gpupdate.exe", "/force")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using var p = Process.Start(psi);
            p?.WaitForExit(15000);
        }
        catch
        {
        }
    }

    private static IniDocument LoadIni(string path)
    {
        if (!File.Exists(path))
        {
            return new IniDocument();
        }

        var doc = new IniDocument();
        IniSection? current = null;
        var text = ReadIniText(path);

        foreach (var rawLine in text.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
        {
            var line = rawLine.Trim();
            if (line.Length == 0)
            {
                continue;
            }

            if (line.StartsWith("[") && line.EndsWith("]"))
            {
                current = doc.GetOrAdd(line[1..^1]);
                continue;
            }

            var idx = line.IndexOf('=');
            if (idx <= 0 || current == null)
            {
                continue;
            }

            current.Entries.Add(new KeyValuePair<string, string>(
                line[..idx].Trim(),
                line[(idx + 1)..].Trim()));
        }

        return doc;
    }

    private static void SaveIni(string path, IniDocument doc)
    {
        var sb = new StringBuilder();
        foreach (var section in doc.Sections)
        {
            sb.Append('[').Append(section.Name).AppendLine("]");
            foreach (var entry in section.Entries)
            {
                sb.Append(entry.Key).Append('=').AppendLine(entry.Value);
            }
            sb.AppendLine();
        }

        WriteIniText(path, sb.ToString().TrimEnd() + "\r\n");
    }

    private static void WriteIniText(string path, string content)
    {
        File.WriteAllText(path, content, new UnicodeEncoding(bigEndian: false, byteOrderMark: true));
    }

    private static string ReadIniText(string path)
    {
        try
        {
            return File.ReadAllText(path, new UnicodeEncoding(bigEndian: false, byteOrderMark: true));
        }
        catch
        {
            return File.ReadAllText(path);
        }
    }

    private sealed class IniDocument
    {
        public List<IniSection> Sections { get; } = new();

        public IniSection GetOrAdd(string name)
        {
            var existing = Sections.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (existing != null)
            {
                return existing;
            }

            var created = new IniSection(name);
            Sections.Add(created);
            return created;
        }
    }

    private sealed class IniSection(string name)
    {
        public string Name { get; } = name;
        public List<KeyValuePair<string, string>> Entries { get; } = new();
    }
}
