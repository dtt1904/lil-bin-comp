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

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"]);
const DOC_EXTS = new Set([".pdf", ".doc", ".docx", ".txt", ".md"]);

function classifyFile(ext: string): ContentCandidate["type"] {
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (DOC_EXTS.has(ext)) return "document";
  return "other";
}

/**
 * Scan a local directory for content files. Non-recursive by default.
 * Skips hidden files (starting with `.`) and common system files.
 */
export function scanLocalFolder(
  folderPath: string,
  opts?: { recursive?: boolean }
): ContentCandidate[] {
  if (!fs.existsSync(folderPath)) {
    console.warn(`[content-source] Folder does not exist: ${folderPath}`);
    return [];
  }

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) {
    console.warn(`[content-source] Path is not a directory: ${folderPath}`);
    return [];
  }

  const results: ContentCandidate[] = [];
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "Thumbs.db" || entry.name === ".DS_Store") {
      continue;
    }

    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory() && opts?.recursive) {
      results.push(...scanLocalFolder(fullPath, opts));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    const fileStat = fs.statSync(fullPath);

    results.push({
      filePath: fullPath,
      fileName: entry.name,
      type: classifyFile(ext),
      sizeBytes: fileStat.size,
      discoveredAt: new Date(),
    });
  }

  return results;
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
    return !existingTitles.has(c.fileName) && !existingTitles.has(nameWithoutExt);
  });
}
