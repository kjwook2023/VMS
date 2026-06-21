using System.Text;
using System.Text.Json;

namespace ClearCDrive;

internal sealed class ReportWriter
{
    private readonly string _appRoot;
    private readonly string _logsDir;
    private readonly string _reportsDir;

    public ReportWriter(string appRoot)
    {
        _appRoot = appRoot;
        _logsDir = Path.Combine(appRoot, "logs");
        _reportsDir = Path.Combine(appRoot, "reports");

        Directory.CreateDirectory(_logsDir);
        Directory.CreateDirectory(_reportsDir);
    }

    public void Write(string command, string root, List<Candidate> results)
    {
        var now = DateTime.Now;
        var stamp = now.ToString("yyyyMMdd-HHmmss");
        var summary = new ReportSummary
        {
            Root = root,
            GeneratedAt = now,
            CandidateCount = results.Count,
            TotalCandidateBytes = results.Sum(x => x.SizeBytes),
            SafeCleanupBytes = results.Where(x => x.CleanupAllowed).Sum(x => x.SizeBytes)
        };

        var envelope = new ReportEnvelope
        {
            Summary = summary,
            Results = results
        };

        var text = BuildTextReport(command, envelope);
        var jsonPath = Path.Combine(_reportsDir, $"report-{stamp}.json");
        var csvPath = Path.Combine(_reportsDir, $"report-{stamp}.csv");
        var txtPath = Path.Combine(_reportsDir, $"report-{stamp}.txt");
        var latestJson = Path.Combine(_reportsDir, "latest.json");
        var latestCsv = Path.Combine(_reportsDir, "latest.csv");
        var latestTxt = Path.Combine(_reportsDir, "latest.txt");
        var logPath = Path.Combine(_logsDir, $"clear-cdrive-{now:yyyyMMdd}.log");

        var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
        var json = JsonSerializer.Serialize(envelope, jsonOptions);
        File.WriteAllText(jsonPath, json, Encoding.UTF8);
        File.WriteAllText(latestJson, json, Encoding.UTF8);

        var csv = BuildCsv(results);
        File.WriteAllText(csvPath, csv, new UTF8Encoding(true));
        File.WriteAllText(latestCsv, csv, new UTF8Encoding(true));

        File.WriteAllText(txtPath, text, new UTF8Encoding(true));
        File.WriteAllText(latestTxt, text, new UTF8Encoding(true));

        var logEntry = $"[{now:yyyy-MM-dd HH:mm:ss}] command={command} root={root} candidates={summary.CandidateCount} total={Scanner.FormatBytes(summary.TotalCandidateBytes)} safe={Scanner.FormatBytes(summary.SafeCleanupBytes)}{Environment.NewLine}";
        File.AppendAllText(logPath, logEntry, new UTF8Encoding(true));
    }

    public static string BuildTextReport(string command, ReportEnvelope report)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Command: {command}");
        sb.AppendLine($"GeneratedAt: {report.Summary.GeneratedAt:yyyy-MM-dd HH:mm:ss}");
        sb.AppendLine($"Root: {report.Summary.Root}");
        sb.AppendLine($"CandidateCount: {report.Summary.CandidateCount}");
        sb.AppendLine($"TotalCandidate: {Scanner.FormatBytes(report.Summary.TotalCandidateBytes)}");
        sb.AppendLine($"SafeCleanup: {Scanner.FormatBytes(report.Summary.SafeCleanupBytes)}");
        sb.AppendLine();
        sb.AppendLine("Recommendation | Safety | Category | Size | AgeDays | FileCount | LastWriteTime | Path");

        foreach (var result in report.Results.Take(50))
        {
            sb.AppendLine($"{result.Recommendation} | {result.Safety} | {result.Category} | {result.SizeText} | {result.AgeDays:N1} | {result.FileCount} | {result.LastWriteTime:yyyy-MM-dd HH:mm:ss} | {result.Path}");
        }

        return sb.ToString();
    }

    private static string BuildCsv(IEnumerable<Candidate> results)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Recommendation,Safety,Category,RuleName,SizeBytes,SizeText,AgeDays,FileCount,LastWriteTime,Path,Notes,CleanupHint,Source");

        foreach (var result in results)
        {
            sb.AppendLine(string.Join(",",
                Escape(result.Recommendation),
                Escape(result.Safety),
                Escape(result.Category),
                Escape(result.RuleName),
                result.SizeBytes.ToString(),
                Escape(result.SizeText),
                result.AgeDays.ToString("N1"),
                result.FileCount.ToString(),
                Escape(result.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")),
                Escape(result.Path),
                Escape(result.Notes),
                Escape(result.CleanupHint),
                Escape(result.Source)));
        }

        return sb.ToString();
    }

    private static string Escape(string value)
    {
        var normalized = value.Replace("\"", "\"\"");
        return $"\"{normalized}\"";
    }
}
