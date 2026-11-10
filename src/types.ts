import { z } from "zod";

export const DocumentPlanSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  audience: z.string(),
  tone: z.string(),
  outputFormat: z.enum(["markdown", "docx", "xlsx", "pptx"]),
  sections: z.array(
    z.object({
      heading: z.string(),
      objective: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  constraints: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
});

export type DocumentPlan = z.infer<typeof DocumentPlanSchema>;

export const ReviewSchema = z.object({
  verdict: z.enum(["pass", "revise"]),
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(["critical", "major", "minor"]),
      location: z.string(),
      problem: z.string(),
      suggestedFix: z.string(),
    }),
  ),
});

export type Review = z.infer<typeof ReviewSchema>;

export interface EvidenceChunk {
  id: string;
  source: string;
  text: string;
}

export type RunStatus =
  | "draft"
  | "reviewed"
  | "approval_required"
  | "final";

export interface RunManifest {
  id: string;
  createdAt: string;
  request: string;
  references: string[];
  referenceHashes: Record<string, string>;
  status: RunStatus;
  planFile: string;
  draftFile: string;
  reviewFile: string;
  finalFile?: string;
}
