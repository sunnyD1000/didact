import * as path from "path";
import * as fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { llmClient } from "../llm/client";

/**
 * Parse a file to plain text.
 * Supports: .pdf, .docx, .doc, .txt, and image files (vision LLM).
 */
export async function parseFile(filepath: string): Promise<string> {
  const ext = path.extname(filepath).toLowerCase();

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filepath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx" || ext === ".doc") {
    const result = await mammoth.extractRawText({ path: filepath });
    return result.value;
  }

  if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filepath, "utf-8");
  }

  // Image files — pass to vision-capable LLM for OCR
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
    const base64 = fs.readFileSync(filepath).toString("base64");
    const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : `image/${ext.slice(1)}`;
    return llmClient.complete(
      `Extract all text from this image verbatim. Return only the extracted text, no commentary.\n\n[image: data:${mimeType};base64,${base64}]`,
      { system: "You are an OCR assistant. Return only extracted text." }
    );
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
