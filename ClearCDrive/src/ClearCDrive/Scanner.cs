using System.Text.Json;

namespace ClearCDrive;

internal sealed class Scanner
{
    private readonly AppOptions _options;
    private readonly IReadOnlyList<AppRule> _rules;
    private readonly DateTime _now;

    public Scanner(AppOptions options, IReadOnlyList<AppRule> rules)
    {
        _options = options;
        _rules = rules;
        _now = DateTime.Now;
    }

    public List<Candidate> Scan()
    {
        var findings = new List<Candidate>();
        var seenPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var rule in _rules)
        {
            foreach (var target in PathPatternResolver.Resolve(_options.Root, rule.Pattern))
            {
                if (!seenPaths.Add(target))
                {
                    continue;
                }

                var stats = GetPathStats(target);
                if (stats is null || stats.SizeBytes < ToBytes(_options.MinSizeMb))
                {
                    continue;
                }

                var staleDays = rule.StaleDays is > 0 ? rule.StaleDays.Value : _options.DefaultStaleDays;
                var ageDays = NormalizeAgeDays(stats.LastWriteTime);
                var recommendation = GetRecommendation(rule.Safety, ageDays, staleDays);

                findings.Add(new Candidate
                {
                    Path = stats.Path,
                    Category = rule.Category,
                    RuleName = rule.Name,
                    Safety = rule.Safety,
                    Recommendation = recommendation,
                    SizeBytes = stats.SizeBytes,
                    SizeText = FormatBytes(stats.SizeBytes),
                    FileCount = stats.FileCount,
                    LastWriteTime = stats.LastWriteTime,
                    AgeDays = ageDays,
                    StaleAfterDays = staleDays,
                    Notes = rule.Notes,
                    CleanupAllowed = recommendation == "DeleteSafe",
                    CleanupHint = rule.CleanupHint,
                    Source = "Rule"
                });
            }
        }

        if (_options.IncludeDiscovery)
        {
            IEnumerable<string> topLevelItems;
            try
            {
                topLevelItems = Directory.EnumerateFileSystemEntries(_options.Root, "*", new EnumerationOptions
                {
                    IgnoreInaccessible = true,
                    RecurseSubdirectories = false,
                    ReturnSpecialDirectories = false
                });
            }
            catch
            {
                topLevelItems = Array.Empty<string>();
            }

            foreach (var item in topLevelItems)
            {
                if (!seenPaths.Add(item))
                {
                    continue;
                }

                var stats = GetPathStats(item);
                if (stats is null || stats.SizeBytes < ToBytes(_options.MinSizeMb))
                {
                    continue;
                }

                var ageDays = NormalizeAgeDays(stats.LastWriteTime);
                findings.Add(new Candidate
                {
                    Path = stats.Path,
                    Category = "TopLevelDiscovery",
                    RuleName = "(discovery)",
                    Safety = "Review",
                    Recommendation = ageDays >= _options.DefaultStaleDays ? "Review" : "Watch",
                    SizeBytes = stats.SizeBytes,
                    SizeText = FormatBytes(stats.SizeBytes),
                    FileCount = stats.FileCount,
                    LastWriteTime = stats.LastWriteTime,
                    AgeDays = ageDays,
                    StaleAfterDays = _options.DefaultStaleDays,
                    Notes = "Top-level directory discovery item. Verify app ownership before deletion.",
                    CleanupAllowed = false,
                    CleanupHint = "Manual review only",
                    Source = "Discovery"
                });
            }
        }

        return findings
            .OrderByDescending(x => x.SizeBytes)
            .ToList();
    }

    public static IReadOnlyList<AppRule> LoadRules(string path)
    {
        using var stream = File.OpenRead(path);
        var rules = JsonSerializer.Deserialize<List<AppRule>>(stream, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return rules ?? [];
    }

    public static long ToBytes(double mb) => (long)(mb * 1024d * 1024d);

    public static string FormatBytes(long bytes)
    {
        string[] units = ["B", "KB", "MB", "GB", "TB"];
        double value = bytes;
        var unitIndex = 0;

        while (value >= 1024 && unitIndex < units.Length - 1)
        {
            value /= 1024;
            unitIndex++;
        }

        return $"{value:N2} {units[unitIndex]}";
    }

    private static string GetRecommendation(string safety, double ageDays, int staleDays)
    {
        if (ageDays < staleDays)
        {
            return "Watch";
        }

        return safety switch
        {
            "Safe" => "DeleteSafe",
            "SafeIfClosed" => "DeleteWhenAppClosed",
            _ => "Review"
        };
    }

    private double NormalizeAgeDays(DateTime lastWriteTime)
    {
        return Math.Max(0, Math.Round((_now - lastWriteTime).TotalDays, 1));
    }

    private static PathStats? GetPathStats(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                var file = new FileInfo(path);
                return new PathStats
                {
                    Path = file.FullName,
                    IsDirectory = false,
                    FileCount = 1,
                    SizeBytes = file.Length,
                    LastWriteTime = file.LastWriteTime
                };
            }

            if (!Directory.Exists(path))
            {
                return null;
            }

            var dir = new DirectoryInfo(path);
            long totalBytes = 0;
            var fileCount = 0;
            var lastWrite = dir.LastWriteTime;

            IEnumerable<string> files;
            try
            {
                files = Directory.EnumerateFiles(path, "*", new EnumerationOptions
                {
                    IgnoreInaccessible = true,
                    RecurseSubdirectories = true,
                    ReturnSpecialDirectories = false
                });
            }
            catch
            {
                files = Array.Empty<string>();
            }

            foreach (var filePath in files)
            {
                try
                {
                    var file = new FileInfo(filePath);
                    totalBytes += file.Length;
                    fileCount++;
                    if (file.LastWriteTime > lastWrite)
                    {
                        lastWrite = file.LastWriteTime;
                    }
                }
                catch
                {
                    continue;
                }
            }

            return new PathStats
            {
                Path = dir.FullName,
                IsDirectory = true,
                FileCount = fileCount,
                SizeBytes = totalBytes,
                LastWriteTime = lastWrite
            };
        }
        catch
        {
            return null;
        }
    }
}
