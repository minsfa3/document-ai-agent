import Anthropic from "@anthropic-ai/sdk";
import type { DocumentPlan, EvidenceChunk } from "./types.js";

export async function createDraft(plan: DocumentPlan, evidence: EvidenceChunk[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_WRITER_MODEL || "claude-opus-5-5";
  const selectedIds = new Set(plan.sections.flatMap((section) => section.evidenceIds));
  const selectedEvidence = evidence.filter((item) => selectedIds.has(item.id));

  const message = await client.messages.create({
    model,
    max_tokens: 8_000,
    system:
      "You write polished business documents in Korean. Follow the supplied plan and constraints exactly. Use only supplied evidence for factual claims. Return Markdown only, with no preamble.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({ plan, evidence: selectedEvidence }),
      },
    ],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
