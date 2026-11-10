import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { sha256 } from "./storage.js";
import type { EvidenceChunk } from "./types.js";

const plainTextExtensions = new Set([".txt", ".md", ".csv", ".tsv", ".json", ".xml"]);

async function extractXlsx(file: string): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    lines.push(`# Sheet: ${sheet.name}`);
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      lines.push(values.map((value) => String(value ?? "")).join("\t"));
    });
  });
  return lines.join("\n");
}

export async function extractText(file: string): Promise<{ hash: string; text: string }> {
  const buffer = await readFile(file);
  const hash = sha256(buffer);
  const extension = path.extname(file).toLowerCase();

  try {
    if (plainTextExtensions.has(extension)) return { hash, text: buffer.toString("utf8") };
    if (extension === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      return { hash, text: result.value };
    }
    if (extension === ".xlsx") return { hash, text: await extractXlsx(file) };
    if (extension === ".pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return { hash, text: result.text };
    }
  } catch (error) {
    throw new Error(
      `문서를 직접 읽지 못했습니다: ${file}. DRM 문서는 Office에서 정상 열리는 권한 범위 안에서 별도 Office 연결 기능을 사용해야 합니다.`,
      { cause: error },
    );
  }

  throw new Error(`지원하지 않는 파일 형식입니다: ${extension || "확장자 없음"}`);
}

export function chunkEvidence(source: string, text: string, maxChars = 4_000): EvidenceChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: EvidenceChunk[] = [];
  let start = 0;
  let index = 1;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const newline = normalized.lastIndexOf("\n", end);
      if (newline > start + maxChars / 2) end = newline;
    }
    chunks.push({ id: `E${index}`, source, text: normalized.slice(start, end).trim() });
    start = end;
    index += 1;
  }
  return chunks;
}
