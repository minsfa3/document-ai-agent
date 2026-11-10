import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chunkEvidence, extractText } from "./extract.js";
import { createPlan } from "./planner.js";
import { reviewDraft } from "./reviewer.js";
import { createDraft } from "./writer.js";
import {
  ensureDataDirs,
  loadManifest,
  newRunId,
  runDir,
  saveManifest,
  writeJson,
} from "./storage.js";
import type { EvidenceChunk, RunManifest } from "./types.js";

export async function runWorkflow(request: string, references: string[]): Promise<RunManifest> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 필요합니다.");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY가 필요합니다.");
  await ensureDataDirs();

  const id = newRunId();
  const directory = runDir(id);
  await mkdir(directory, { recursive: true });
  const evidence: EvidenceChunk[] = [];
  const hashes: Record<string, string> = {};

  for (const reference of references) {
    const absolute = path.resolve(reference);
    const extracted = await extractText(absolute);
    hashes[absolute] = extracted.hash;
    evidence.push(...chunkEvidence(absolute, extracted.text));
  }
  await writeJson(path.join(directory, "evidence.json"), evidence);

  const plan = await createPlan(request, evidence);
  await writeJson(path.join(directory, "plan.json"), plan);
  const draft = await createDraft(plan, evidence);
  await writeFile(path.join(directory, "draft.md"), `${draft}\n`, "utf8");
  const manifest: RunManifest = {
    id,
    createdAt: new Date().toISOString(),
    request,
    references: references.map((file) => path.resolve(file)),
    referenceHashes: hashes,
    status: "draft",
    planFile: "plan.json",
    draftFile: "draft.md",
    reviewFile: "review.json",
  };
  await saveManifest(manifest);
  const review = await reviewDraft(directory, plan);
  manifest.status = "reviewed";
  await saveManifest(manifest);
  if (review.verdict === "pass") {
    manifest.status = "approval_required";
    await saveManifest(manifest);
  }
  return manifest;
}

export async function approveRun(runId: string, destination?: string): Promise<RunManifest> {
  const manifest = await loadManifest(runId);
  if (manifest.status !== "approval_required") {
    throw new Error(`승인할 수 없는 상태입니다: ${manifest.status}`);
  }
  const directory = runDir(runId);
  const review = JSON.parse(await readFile(path.join(directory, manifest.reviewFile), "utf8")) as {
    verdict?: string;
  };
  if (review.verdict !== "pass") {
    throw new Error("검수 결과가 revise입니다. 수정 후 다시 검수해야 승인할 수 있습니다.");
  }
  const finalFile = destination
    ? path.resolve(destination)
    : path.join(directory, `final-${runId}.md`);
  await copyFile(path.join(directory, manifest.draftFile), finalFile);
  manifest.status = "final";
  manifest.finalFile = finalFile;
  await saveManifest(manifest);
  return manifest;
}
