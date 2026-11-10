# document-ai-agent

Windows에서 실행하는 문서 자동화 CLI입니다.

1. OpenAI가 참조 문서의 근거 인덱스로 문서 구조를 기획합니다.
2. Claude가 계획과 관련 근거만 받아 초안을 작성합니다.
3. Codex CLI가 초안과 계획을 로컬에서 읽고 구조화된 검수 결과를 만듭니다.
4. 사용자가 명시적으로 승인해야 최종본이 생성됩니다.

> 선택한 참조 문서에서 추출한 내용은 OpenAI와 Anthropic API로 전송됩니다. API 키와 작업 산출물은 Git에 포함되지 않습니다.

## 현재 범위

- 입력: `.txt`, `.md`, `.csv`, `.tsv`, `.json`, `.xml`, `.docx`, `.xlsx`, `.pdf`
- 출력: 우선 Markdown 초안과 최종본
- DRM: 암호화 파일을 우회하지 않습니다. 권한 있는 Excel/Word에서 읽는 Office 연결 기능은 다음 단계에서 추가합니다.
- 토큰 절약: 참조를 한 번 추출하고 해시하며, 기획에는 짧은 근거 인덱스만, 작성에는 계획에서 선택한 근거만 보냅니다.

## 준비

- Node.js 22.9 이상
- Codex CLI 로그인
- OpenAI API 키
- Anthropic API 키

```powershell
npm install
Copy-Item .env.example .env
# .env에 OPENAI_API_KEY와 ANTHROPIC_API_KEY 입력
npm run check
```

## 실행

```powershell
npm run dev -- run `
  --request "참조 자료를 바탕으로 현황 보고서를 작성해줘" `
  --reference "C:\문서\참조.xlsx" "C:\문서\설명.docx"
```

실행 결과는 `.document-agent/runs/<RUN_ID>`에 저장됩니다. `review.json`의 verdict가 `pass`인 작업만 승인할 수 있습니다.

```powershell
npm run dev -- approve <RUN_ID> --output "C:\문서\최종보고서.md"
```

## 보안 원칙

- 실제 API 키, 원문, 추출 내용, 초안과 검수 결과는 커밋하지 않습니다.
- 전송 전에 사용자가 선택한 파일과 전송 대상이 표시됩니다.
- 최종본 생성은 자동 처리하지 않고 승인 명령을 요구합니다.
- 배포판에서는 `.env` 대신 Windows Credential Manager를 사용합니다.

## 다음 단계

- Windows Credential Manager 연동
- Excel/Word 권한 세션을 이용한 DRM 문서 읽기 연결
- DOCX/XLSX/PPTX 렌더러와 시각 검수
- 재작성 1회 제한 및 변경점 중심 검수
- 단일 Windows 실행 파일 패키징
