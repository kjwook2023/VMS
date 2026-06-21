namespace ClearCDrive;

internal static class Program
{
    public static int Main(string[] args)
    {
        try
        {
            var options = ParseArgs(args);
            var appRoot = ResolveAppRoot();
            var configPath = options.ConfigPath ?? Path.Combine(appRoot, "config", "ClearCDrive.rules.json");

            if (!Directory.Exists(options.Root))
            {
                Console.Error.WriteLine($"Root path not found: {options.Root}");
                return 2;
            }

            if (!File.Exists(configPath))
            {
                Console.Error.WriteLine($"Rule file not found: {configPath}");
                return 2;
            }

            var rules = Scanner.LoadRules(configPath);
            var scanner = new Scanner(options, rules);
            var results = scanner.Scan();

            PrintResults(results, options);

            if (options.Command.Equals("clean-safe", StringComparison.OrdinalIgnoreCase))
            {
                RunSafeCleanup(results, options.Apply);
            }

            var writer = new ReportWriter(appRoot);
            writer.Write(options.Command, options.Root, results);

            Console.WriteLine();
            Console.WriteLine($"Reports: {Path.Combine(appRoot, "reports")}");
            Console.WriteLine($"Logs   : {Path.Combine(appRoot, "logs")}");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static void PrintResults(List<Candidate> results, AppOptions options)
    {
        if (results.Count == 0)
        {
            Console.WriteLine($"No candidates found above {options.MinSizeMb:N0} MB under {options.Root}");
            return;
        }

        Console.WriteLine($"Command: {options.Command}");
        Console.WriteLine($"Root   : {options.Root}");
        Console.WriteLine($"Found  : {results.Count} candidates");
        Console.WriteLine();
        Console.WriteLine("Recommendation      Safety             Category              SizeGB   AgeDays  FileCount  LastWriteTime         Path");

        foreach (var item in results.Take(options.Top))
        {
            Console.WriteLine(
                $"{Pad(item.Recommendation, 19)} " +
                $"{Pad(item.Safety, 18)} " +
                $"{Pad(item.Category, 21)} " +
                $"{Pad((item.SizeBytes / 1024d / 1024d / 1024d).ToString("N2"), 8)} " +
                $"{Pad(item.AgeDays.ToString("N1"), 8)} " +
                $"{Pad(item.FileCount.ToString(), 10)} " +
                $"{Pad(item.LastWriteTime.ToString("yyyy-MM-dd HH:mm"), 21)} " +
                $"{item.Path}");
        }

        Console.WriteLine();
        Console.WriteLine($"Candidate total : {Scanner.FormatBytes(results.Sum(x => x.SizeBytes))}");
        Console.WriteLine($"Safe cleanup    : {Scanner.FormatBytes(results.Where(x => x.CleanupAllowed).Sum(x => x.SizeBytes))}");
    }

    private static void RunSafeCleanup(List<Candidate> results, bool apply)
    {
        var cleanupTargets = results.Where(x => x.CleanupAllowed).ToList();
        if (cleanupTargets.Count == 0)
        {
            Console.WriteLine("No safe cleanup targets matched.");
            return;
        }

        Console.WriteLine();
        Console.WriteLine(apply ? "Applying safe cleanup:" : "Dry run safe cleanup:");

        foreach (var target in cleanupTargets)
        {
            Console.WriteLine($"{(apply ? "DELETE" : "WOULD DELETE")} {target.Path} ({target.SizeText})");
            if (!apply)
            {
                continue;
            }

            try
            {
                if (Directory.Exists(target.Path))
                {
                    Directory.Delete(target.Path, recursive: true);
                }
                else if (File.Exists(target.Path))
                {
                    File.Delete(target.Path);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"FAILED {target.Path} : {ex.Message}");
            }
        }
    }

    private static AppOptions ParseArgs(string[] args)
    {
        var options = new AppOptions();
        var index = 0;

        if (args.Length > 0 && !args[0].StartsWith("--", StringComparison.Ordinal))
        {
            options.Command = args[0];
            index = 1;
        }

        while (index < args.Length)
        {
            var arg = args[index];
            switch (arg)
            {
                case "--root":
                    options.Root = RequireValue(args, ++index, arg);
                    break;
                case "--top":
                    options.Top = int.Parse(RequireValue(args, ++index, arg));
                    break;
                case "--min-mb":
                    options.MinSizeMb = double.Parse(RequireValue(args, ++index, arg));
                    break;
                case "--default-stale-days":
                    options.DefaultStaleDays = int.Parse(RequireValue(args, ++index, arg));
                    break;
                case "--include-discovery":
                    options.IncludeDiscovery = true;
                    break;
                case "--no-discovery":
                    options.IncludeDiscovery = false;
                    break;
                case "--apply":
                    options.Apply = true;
                    break;
                case "--config":
                    options.ConfigPath = RequireValue(args, ++index, arg);
                    break;
                case "--help":
                case "-h":
                case "/?":
                    PrintHelp();
                    Environment.Exit(0);
                    break;
                default:
                    throw new ArgumentException($"Unknown argument: {arg}");
            }

            index++;
        }

        return options;
    }

    private static string RequireValue(string[] args, int index, string optionName)
    {
        if (index >= args.Length)
        {
            throw new ArgumentException($"Missing value for {optionName}");
        }

        return args[index];
    }

    private static void PrintHelp()
    {
        Console.WriteLine("ClearCDrive");
        Console.WriteLine();
        Console.WriteLine("Usage:");
        Console.WriteLine("  ClearCDrive.exe [scan|clean-safe] [options]");
        Console.WriteLine();
        Console.WriteLine("Options:");
        Console.WriteLine("  --root <path>                Root path to analyze. Default is LocalAppData.");
        Console.WriteLine("  --top <n>                    Number of rows to print. Default 30.");
        Console.WriteLine("  --min-mb <n>                 Minimum size in MB to include. Default 250.");
        Console.WriteLine("  --default-stale-days <n>     Default stale threshold. Default 30.");
        Console.WriteLine("  --include-discovery          Include top-level discovery. Default on.");
        Console.WriteLine("  --no-discovery               Disable top-level discovery.");
        Console.WriteLine("  --config <path>              Rule file path.");
        Console.WriteLine("  --apply                      Required to actually delete in clean-safe mode.");
    }

    private static string ResolveAppRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            var configPath = Path.Combine(current.FullName, "config", "ClearCDrive.rules.json");
            if (File.Exists(configPath))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        return AppContext.BaseDirectory;
    }

    private static string Pad(string value, int width)
    {
        if (value.Length >= width)
        {
            return value[..Math.Min(value.Length, width)];
        }

        return value.PadRight(width);
    }
}
