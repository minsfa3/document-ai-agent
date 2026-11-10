import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RunManifest } from "./types.js";

export const dataRoot = path.resolve(".document-agent");

export async function ensureDataDirs(): Promise<void> {
  await mkdir(path.join(dataRoot, "runs"), { recursive: true });
  await mkdir(path.join(dataRoot, "cache"), { recursive: true });
}

export function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function newRunId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `${stamp}-${crypto.randomUUID().slice(0, 8)}`;
}

export function runDir(runId: string): string {
  return path.join(dataRoot, "runs", runId);
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadManifest(runId: string): Promise<RunManifest> {
  const raw = await readFile(path.join(runDir(runId), "manifest.json"), "utf8");
  return JSON.parse(raw) as RunManifest;
}

export async function saveManifest(manifest: RunManifest): Promise<void> {
  await writeJson(path.join(runDir(manifest.id), "manifest.json"), manifest);
}
