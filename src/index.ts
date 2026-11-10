import { Command } from "commander";
import { approveRun, runWorkflow } from "./workflow.js";

const program = new Command()
  .name("document-agent")
  .description("OpenAI 기획 → Claude 작성 → Codex 검수 → 사용자 승인 문서 자동화")
  .version("0.1.0");

program
  .command("run")
  .description("새 문서 작업을 실행합니다. 선택한 참조 내용은 OpenAI와 Anthropic에 전송됩니다.")
  .requiredOption("-r, --request <text>", "만들 문서에 대한 요청")
  .requiredOption("--reference <files...>", "참조 문서 경로")
  .action(async (options: { request: string; reference: string[] }) => {
    console.log("주의: 선택한 참조 문서의 추출 내용이 OpenAI와 Anthropic으로 전송됩니다.");
    const manifest = await runWorkflow(options.request, options.reference);
    console.log(
      manifest.status === "approval_required"
        ? "\n검수를 통과했습니다. 사용자 승인이 필요합니다."
        : "\n검수에서 수정이 필요하다고 판단했습니다. review.json을 확인하세요.",
    );
    console.log(`Run ID: ${manifest.id}`);
    console.log(`결과 폴더: .document-agent/runs/${manifest.id}`);
  });

program
  .command("approve")
  .description("검수를 통과한 초안을 최종본으로 승인합니다.")
  .argument("<run-id>", "승인할 Run ID")
  .option("-o, --output <file>", "최종 Markdown 저장 경로")
  .action(async (runId: string, options: { output?: string }) => {
    const manifest = await approveRun(runId, options.output);
    console.log(`최종 승인 완료: ${manifest.finalFile}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
