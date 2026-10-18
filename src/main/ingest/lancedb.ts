import * as lancedb from "@lancedb/lancedb";
import * as path from "path";
import { app } from "electron";
import type { EmbeddedChunk } from "./embedder";

type LanceDbConnection = Awaited<ReturnType<typeof lancedb.connect>>;
type LanceDbTable = Awaited<ReturnType<LanceDbConnection["openTable"]>>;

let _db: LanceDbConnection | null = null;
let _table: LanceDbTable | null = null;

async function getTable(): Promise<LanceDbTable> {
  if (!_db) {
    const dbPath = path.join(app.getPath("userData"), "lancedb");
    _db = await lancedb.connect(dbPath);
  }
  const tableNames = await _db.tableNames();
  if (!tableNames.includes("chunks")) {
    _table = await _db.createEmptyTable("chunks", {
      id: "string",
      file_id: "string",
      chunk_index: "int32",
      text: "string",
    } as never);
  } else {
    _table = await _db.openTable("chunks");
  }
  return _table as LanceDbTable;
}

export interface ChunkRecord {
  id: string;
  file_id: string;
  chunk_index: number;
  text: string;
  vector: number[];
  [key: string]: unknown; // index signature for LanceDB compatibility
}

export async function upsertChunks(
  fileId: string,
  chunks: EmbeddedChunk[]
): Promise<void> {
  const table = await getTable();
  const records: ChunkRecord[] = chunks.map((c) => ({
    id: `${fileId}_${c.chunkIndex}`,
    file_id: fileId,
    chunk_index: c.chunkIndex,
    text: c.text,
    vector: c.vector,
  }));

  // Delete existing chunks for this file then re-insert
  try {
    await table.delete(`file_id = '${fileId}'`);
  } catch {
    // table may be empty
  }
  await table.add(records);
}

export async function searchChunks(
  vector: number[],
  _folderId: string,
  fileIds: string[],
  limit = 5
): Promise<ChunkRecord[]> {
  const table = await getTable();
  const filter =
    fileIds.length > 0
      ? `file_id IN (${fileIds.map((id) => `'${id}'`).join(",")})`
      : undefined;

  const q = table.search(vector).limit(limit);
  if (filter) (q as lancedb.VectorQuery).where(filter);
  const results = await q.toArray();
  return results as ChunkRecord[];
}

export async function getChunksForFile(fileId: string): Promise<ChunkRecord[]> {
  const table = await getTable();
  const results = await table.query().where(`file_id = '${fileId}'`).toArray();
  return results as ChunkRecord[];
}

export async function getChunkById(chunkId: string): Promise<ChunkRecord | null> {
  const table = await getTable();
  const results = await table
    .query()
    .where(`id = '${chunkId}'`)
    .limit(1)
    .toArray();
  return (results[0] as ChunkRecord) ?? null;
}
