import { randomUUID } from "crypto";
import { getDb } from "../db/index";
import { parseFile } from "./parser";
import { chunkText } from "./chunker";
import { embedChunks } from "./embedder";
import { upsertChunks } from "./lancedb";
import type { ContentFile } from "../db/types";

export interface IngestProgress {
  stage: "parsing" | "chunking" | "embedding" | "storing" | "done" | "error";
  message: string;
  fileId?: string;
}

type ProgressCallback = (progress: IngestProgress) => void;

export async function ingestFile(
  folderId: string,
  filepath: string,
  fileType: "material" | "examination",
  onProgress: ProgressCallback
): Promise<ContentFile> {
  const db = getDb();
  const filename = filepath.split("/").pop() ?? filepath;

  onProgress({ stage: "parsing", message: `Parsing ${filename}…` });

  // Upsert file record
  let fileRow = db
    .prepare("SELECT * FROM content_files WHERE folder_id = ? AND filepath = ?")
    .get(folderId, filepath) as ContentFile | undefined;

  const fileId = fileRow?.id ?? randomUUID();

  if (!fileRow) {
    db.prepare(
      "INSERT INTO content_files (id, folder_id, type, filename, filepath) VALUES (?, ?, ?, ?, ?)"
    ).run(fileId, folderId, fileType, filename, filepath);
    fileRow = db
      .prepare("SELECT * FROM content_files WHERE id = ?")
      .get(fileId) as ContentFile;
  }

  const text = await parseFile(filepath);

  onProgress({ stage: "chunking", message: "Splitting into chunks…" });
  const chunks = chunkText(text);

  onProgress({ stage: "embedding", message: `Embedding ${chunks.length} chunks…` });
  const embeddedChunks = await embedChunks(chunks);

  onProgress({ stage: "storing", message: "Storing vectors in LanceDB…" });
  await upsertChunks(fileId, embeddedChunks);

  // Mark embedded
  db.prepare(
    "UPDATE content_files SET embedded_at = datetime('now') WHERE id = ?"
  ).run(fileId);

  onProgress({ stage: "done", message: "Ingestion complete.", fileId });

  return db
    .prepare("SELECT * FROM content_files WHERE id = ?")
    .get(fileId) as ContentFile;
}
