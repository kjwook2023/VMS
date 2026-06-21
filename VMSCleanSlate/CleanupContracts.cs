namespace VMSCleanSlate;

public enum CleanupAction
{
    Logoff,
    Shutdown
}

public sealed class CleanupRunResult
{
    public CleanupAction Action { get; init; }
    public int ExitCode { get; init; }
    public string? Error { get; init; }
    public string Stdout { get; init; } = "";
    public string Stderr { get; init; } = "";
    public bool Ok => ExitCode == 0;
}
