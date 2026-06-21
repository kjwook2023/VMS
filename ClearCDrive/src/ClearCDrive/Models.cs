namespace ClearCDrive;

internal sealed class AppRule
{
    public string Name { get; set; } = "";
    public string Pattern { get; set; } = "";
    public string Category { get; set; } = "";
    public string Safety { get; set; } = "Review";
    public int? StaleDays { get; set; }
    public string Notes { get; set; } = "";
    public string CleanupHint { get; set; } = "";
}

internal sealed class PathStats
{
    public required string Path { get; init; }
    public required bool IsDirectory { get; init; }
    public required int FileCount { get; init; }
    public required long SizeBytes { get; init; }
    public required DateTime LastWriteTime { get; init; }
}

internal sealed class Candidate
{
    public required string Path { get; init; }
    public required string Category { get; init; }
    public required string RuleName { get; init; }
    public required string Safety { get; init; }
    public required string Recommendation { get; init; }
    public required long SizeBytes { get; init; }
    public required string SizeText { get; init; }
    public required int FileCount { get; init; }
    public required DateTime LastWriteTime { get; init; }
    public required double AgeDays { get; init; }
    public required int StaleAfterDays { get; init; }
    public required string Notes { get; init; }
    public required bool CleanupAllowed { get; init; }
    public required string CleanupHint { get; init; }
    public required string Source { get; init; }
}

internal sealed class ReportSummary
{
    public required string Root { get; init; }
    public required DateTime GeneratedAt { get; init; }
    public required int CandidateCount { get; init; }
    public required long TotalCandidateBytes { get; init; }
    public required long SafeCleanupBytes { get; init; }
}

internal sealed class ReportEnvelope
{
    public required ReportSummary Summary { get; init; }
    public required List<Candidate> Results { get; init; }
}

internal sealed class AppOptions
{
    public string Command { get; set; } = "scan";
    public string Root { get; set; } = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
    public int Top { get; set; } = 30;
    public double MinSizeMb { get; set; } = 250;
    public int DefaultStaleDays { get; set; } = 30;
    public bool IncludeDiscovery { get; set; } = true;
    public bool Apply { get; set; }
    public string? ConfigPath { get; set; }
}
