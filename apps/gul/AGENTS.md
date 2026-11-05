# apps/gul (`@genoffice/gul`)

훈민정음(삼성 한글) 문서 편집기다. `.gul` 문서를 탭에서 열고, 문단 글을 고치고, 같은 이름이나 다른 이름으로 저장한다(결정 0104). 파일을 다루는 일은 `packages/gul-engine`이 하고, 이 모듈은 문서 한 벌을 쥔 뒷단과 화면을 잇는다. 1단계다: AI 창, 번역, 서식·표·그림 편집은 아직 없다.

## 맡은 범위

- 메인 프로세스(`src/main/`). 셸이 상대 경로로 가져와 셸 번들 안에서 돈다.
  - `gul-main.ts`: 보기 만들기(`createGulView`), 열기와 거절, 저장·다른 이름으로 저장·닫기 확인, 이름 바뀜 따라가기, 단독 실행(`startGulStandalone`). 문서는 보기마다 `GulDocument` 한 벌을 뒷단에 둔다. 화면은 글을 칠 때마다 문단 글을 보내고(`gul:set-paragraph`), 뒷단이 "저장하지 않은 변경"을 쥐므로 메뉴 저장·닫기 확인은 화면의 도움 없이 뒷단에서 끝난다. 셸에 내보내는 함수는 `configureGulRuntime`, `requestGulSave`, `requestGulClose`, `gulSaveToPath`, `gulReadText`, `gulFileRenamed`, `setGulFileSavedHook`, `gulIsDirty`다.
  - `i18n-main.ts`: 저장 창과 닫기 확인 문구(21개 언어). `atomic-write.ts`: 원자적 쓰기.
- preload(`src/preload/index.ts`): `window.gulApi`. IPC 계약은 `src/shared/ipc.ts`(`gul:` 창구).
- 렌더러(`src/renderer/`): `App.tsx`(문단 목록, 틀 안 글, 저장·다른 이름으로 저장), `i18n/`(화면 문구: 한국어·영어·중국어. 나머지 언어는 영어로 읽힌다 — `docs/tracking/findings.md`).

## 맡지 않는 것 (경계)

- `.gul` 해석, 압축, 레코드, 글 고치기, 저장할 바이트는 `packages/gul-engine`의 범위다. 엔진에 문제가 보이면 여기서 돌려 막지 않는다.
- 탭, 파일 열기 대화상자, 최근 파일, 메뉴, 창 닫기 확인, 파일 연결은 셸의 일이다(`apps/shell`).

## 지킬 것

- 문서가 열리기 전에는 아무것도 쓰지 않는다. 열리지 않은 파일(암호 문서, 모르는 구조, 읽을 수 없는 파일)은 저장 대상이 되지 않고, 화면에는 이유만 보인다.
- 고치지 않은 문서는 다시 쓰지 않는다. 고친 문서도 고친 스트림만 다시 압축한다(엔진의 `save`).
- 경로는 셸이 보기를 만들 때 준 것만 연다(`allowedByWc`).
- 화면 문구를 더하면 `src/renderer/i18n/strings.ts`의 세 언어를 함께 채운다. 다른 18개 언어는 아직 쓰지 않았다.
- 시험: `GUL_SAMPLE_DIR`에 실제 `.gul`을 두면 뒷단이 열기·고치기·저장을 끝까지 도는지 본다(Electron은 가짜). 없으면 그 시험은 건너뛴다.
