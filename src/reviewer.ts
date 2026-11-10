import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ReviewSchema, type DocumentPlan, type Review } from "./types.js";

function runCodex(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? "codex.cmd" : "codex";
    const child = spawn(executable, args, { cwd, shell: false, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Codex 종료 코드: ${code}`))));
  });
}

export async function reviewDraft(runDirectory: string, plan: DocumentPlan): Promise<Review> {
  const schemaFile = path.join(runDirectory, "review-schema.json");
  const outputFile = path.join(runDirectory, "review.json");
  await mkdir(runDirectory, { recursive: true });
  await writeFile(schemaFile, `${JSON.stringify(ReviewSchema.toJSONSchema(), null, 2)}\n`, "utf8");

  const prompt = [
    "Review draft.md against plan.json.",
    "Check factual grounding, missing requirements, internal contradictions, clarity, and professional tone.",
    "Do not rewrite the entire document. Return only the requested structured review.",
    `Acceptance criteria: ${JSON.stringify(plan.acceptanceCriteria)}`,
  ].join("\n");
  const args = ["exec", "--sandbox", "read-only", "--output-schema", schemaFile, "-o", outputFile];
  if (process.env.CODEX_REVIEW_MODEL) args.push("--model", process.env.CODEX_REVIEW_MODEL);
  args.push(prompt);
  await runCodex(args, runDirectory);
  return ReviewSchema.parse(JSON.parse(await readFile(outputFile, "utf8")));
}
