export interface IngestProgress {
  stage: "parsing" | "chunking" | "embedding" | "storing" | "done" | "error";
  message: string;
  fileId?: string;
}
