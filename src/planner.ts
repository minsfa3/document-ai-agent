import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { DocumentPlanSchema, type DocumentPlan, type EvidenceChunk } from "./types.js";

export async function createPlan(request: string, evidence: EvidenceChunk[]): Promise<DocumentPlan> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_PLANNER_MODEL || "gpt-6-astra";
  const evidenceIndex = evidence.map(({ id, source, text }) => ({
    id,
    source,
    excerpt: text.slice(0, 1_200),
  }));

  const response = await client.responses.parse({
    model,
    instructions:
      "You are a document planner. Produce a compact, evidence-grounded plan. Never invent facts. Cite evidence IDs in sections. Use Korean unless the request asks otherwise.",
    input: JSON.stringify({ request, evidenceIndex }),
    text: { format: zodTextFormat(DocumentPlanSchema, "document_plan") },
    store: false,
  });

  if (!response.output_parsed) throw new Error("OpenAI가 유효한 문서 계획을 반환하지 않았습니다.");
  return response.output_parsed;
}
