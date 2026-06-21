using System.Text.Json;

namespace VMSCleanSlate;

public static class ConfigManager
{
    public static string ConfigPath =>
        Path.Combine(AppContext.BaseDirectory, "VMSCleanSlate.config.json");

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static Config Load()
    {
        try
        {
            if (File.Exists(ConfigPath))
            {
                var json = File.ReadAllText(ConfigPath);
                var c = JsonSerializer.Deserialize<Config>(json);
                if (c != null) return c;
            }
        }
        catch { /* fallthrough -> default */ }

        var def = new Config();
        Save(def);
        return def;
    }

    public static void Save(Config c)
    {
        try
        {
            var json = JsonSerializer.Serialize(c, JsonOpts);
            File.WriteAllText(ConfigPath, json);
        }
        catch { /* swallow - tray UI 가 자주 호출하므로 무시 */ }
    }
}
