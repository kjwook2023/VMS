using System.Collections.Generic;

namespace ClearCDrive;

internal static class PathPatternResolver
{
    public static IEnumerable<string> Resolve(string root, string pattern)
    {
        if (string.IsNullOrWhiteSpace(root) || string.IsNullOrWhiteSpace(pattern) || !Directory.Exists(root))
        {
            yield break;
        }

        var separators = new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar };
        var segments = pattern.Split(separators, StringSplitOptions.RemoveEmptyEntries);
        foreach (var result in ResolveSegments(root, segments, 0))
        {
            yield return result;
        }
    }

    private static IEnumerable<string> ResolveSegments(string currentPath, string[] segments, int index)
    {
        if (index >= segments.Length)
        {
            if (File.Exists(currentPath) || Directory.Exists(currentPath))
            {
                yield return currentPath;
            }

            yield break;
        }

        var segment = segments[index];
        var isWildcard = segment.Contains('*') || segment.Contains('?');

        if (!isWildcard)
        {
            var next = Path.Combine(currentPath, segment);
            foreach (var result in ResolveSegments(next, segments, index + 1))
            {
                yield return result;
            }

            yield break;
        }

        IEnumerable<string> matches;
        try
        {
            matches = Directory.EnumerateFileSystemEntries(currentPath, segment, new EnumerationOptions
            {
                IgnoreInaccessible = true,
                MatchCasing = MatchCasing.CaseInsensitive,
                RecurseSubdirectories = false,
                ReturnSpecialDirectories = false
            });
        }
        catch
        {
            yield break;
        }

        foreach (var match in matches)
        {
            foreach (var result in ResolveSegments(match, segments, index + 1))
            {
                yield return result;
            }
        }
    }
}
