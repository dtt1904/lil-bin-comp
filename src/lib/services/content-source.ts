/**
 * Asset source scanner — checks a configured folder for new content candidates.
 *
 * V1 supports local filesystem paths (Mac mini).
 * Future: Google Drive integration via API.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ContentCandidate {
  filePath: string;
  fileName: string;
  type: "image" | "video" | "document" | "other";
  sizeBytes: number;
  discoveredAt: Date;
}

export interface ScanDiagnostics {
  folderPath: string;
  resolvedPath: string;
  exists: boolean;
  isDirectory: boolean;
  totalEntries: number;
  skippedHidden: number;
  skippedDirectories: number;
  skippedNonFile: number;
  filesFound: number;
  error?: string;
}

export interface ScanResult {
  candidates: ContentCandidate[];
  diagnostics: ScanDiagnostics;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".tiff", ".bmp"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const DOC_EXTS = new Set([".pdf", ".doc", ".docx", ".txt", ".md"]);

function classifyFile(ext: string): ContentCandidate["type"] {
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (DOC_EXTS.has(ext)) return "document";
  return "other";
}

function isHiddenOrSystem(name: string): boolean {
  return (
    name.startsWith(".") ||
    name === "Thumbs.db" ||
    name === "desktop.ini" ||
    name === "Icon\r"
  );
}

/**
 * Scan a local directory for content files.
 * Returns both candidates and diagnostics for observability.
 */
export function scanLocalFolder(
  folderPath: string,
  opts?: { recursive?: boolean }
): ScanResult {
  const resolvedPath = path.resolve(folderPath);

  const diag: ScanDiagnostics = {
    folderPath,
    resolvedPath,
    exists: false,
    isDirectory: false,
    totalEntries: 0,
    skippedHidden: 0,
    skippedDirectories: 0,
    skippedNonFile: 0,
    filesFound: 0,
  };

  console.log(`[content-source] Scanning: ${resolvedPath} (input: ${folderPath})`);

  try {
    diag.exists = fs.existsSync(resolvedPath);
  } catch (err) {
    diag.error = `existsSync failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[content-source] ${diag.error}`);
    return { candidates: [], diagnostics: diag };
  }

  if (!diag.exists) {
    diag.error = `Folder does not exist: ${resolvedPath}`;
    console.error(`[content-source] ${diag.error}`);
    return { candidates: [], diagnostics: diag };
  }

  try {
    const stat = fs.statSync(resolvedPath);
    diag.isDirectory = stat.isDirectory();
  } catch (err) {
    diag.error = `statSync failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[content-source] ${diag.error}`);
    return { candidates: [], diagnostics: diag };
  }

  if (!diag.isDirectory) {
    diag.error = `Path is not a directory: ${resolvedPath}`;
    console.error(`[content-source] ${diag.error}`);
    return { candidates: [], diagnostics: diag };
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
  } catch (err) {
    diag.error = `readdirSync failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[content-source] ${diag.error}`);
    return { candidates: [], diagnostics: diag };
  }

  diag.totalEntries = entries.length;
  console.log(`[content-source] Found ${entries.length} entries in ${resolvedPath}`);

  const results: ContentCandidate[] = [];

  for (const entry of entries) {
    if (isHiddenOrSystem(entry.name)) {
      diag.skippedHidden++;
      continue;
    }

    const fullPath = path.join(resolvedPath, entry.name);

    if (entry.isDirectory()) {
      if (opts?.recursive) {
        const sub = scanLocalFolder(fullPath, opts);
        results.push(...sub.candidates);
        diag.skippedDirectories++;
      } else {
        diag.skippedDirectories++;
      }
      continue;
    }

    if (!entry.isFile()) {
      diag.skippedNonFile++;
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    let sizeBytes = 0;
    try {
      const fileStat = fs.statSync(fullPath);
      sizeBytes = fileStat.size;
    } catch {
      console.warn(`[content-source] Could not stat file: ${fullPath}`);
    }

    results.push({
      filePath: fullPath,
      fileName: entry.name,
      type: classifyFile(ext),
      sizeBytes,
      discoveredAt: new Date(),
    });
  }

  diag.filesFound = results.length;
  console.log(
    `[content-source] Results: ${results.length} files, ${diag.skippedHidden} hidden, ${diag.skippedDirectories} dirs, ${diag.skippedNonFile} non-file`
  );

  return { candidates: results, diagnostics: diag };
}

/**
 * Filter candidates against existing draft titles to avoid duplicates.
 */
export function deduplicateCandidates(
  candidates: ContentCandidate[],
  existingTitles: Set<string>
): ContentCandidate[] {
  return candidates.filter((c) => {
    const nameWithoutExt = path.basename(c.fileName, path.extname(c.fileName));
    const isDup = existingTitles.has(c.fileName) || existingTitles.has(nameWithoutExt);
    if (isDup) {
      console.log(`[content-source] Dedup skip: ${c.fileName} (matches existing draft)`);
    }
    return !isDup;
  });
}
