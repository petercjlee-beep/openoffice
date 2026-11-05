import { type Lang, type LangDicts } from '@genoffice/i18n'

/**
 * Screen texts of the Hunminjeongeum editor. Korean, English and Chinese are written; every
 * other language falls back to English until it is translated (docs/tracking/findings.md).
 */
const zh = {
  save: '保存',
  saveAs: '另存为',
  saved: '已保存',
  unsaved: '有未保存的更改',
  loading: '正在打开文档…',
  page: '页',
  frames: '框内文字（表格、文本框）',
  empty: '这份文档里没有可编辑的文字。',
  notePreview:
    '只修改文字。字体、表格、图片和版式保持原样；更长或更短的行由训民正音在打开时重新排版。',
  saveFailed: '保存失败：{{error}}',
  cannotStore: '这份旧版文档的字符编码里没有这个字符，无法输入，已恢复原文。',
  modified: '文件已被其他程序修改，未保存。',
  refusedUnreadable: '无法读取这个文件。',
  refusedNotGul: '这不是训民正音（.gul）文档。',
  refusedUnsupported: '这份文档（加密文档或不支持的结构）暂时无法打开，也不会被改写。',
}

const en: typeof zh = {
  save: 'Save',
  saveAs: 'Save As',
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  loading: 'Opening the document…',
  page: 'Page',
  frames: 'Text in frames (tables, text boxes)',
  empty: 'This document has no text to edit.',
  notePreview:
    'Only the text changes. Fonts, tables, pictures and layout stay as they are; Hunminjeongeum re-lays out longer or shorter lines when it opens the file.',
  saveFailed: 'Could not save: {{error}}',
  cannotStore:
    'This older document cannot hold that character in its text encoding, so the text was put back.',
  modified: 'The file was changed by another program, so nothing was saved.',
  refusedUnreadable: 'This file cannot be read.',
  refusedNotGul: 'This is not a Hunminjeongeum (.gul) document.',
  refusedUnsupported:
    'This document (encrypted, or built in a way not supported yet) cannot be opened, and it will not be rewritten.',
}

const ko: typeof zh = {
  save: '저장',
  saveAs: '다른 이름으로 저장',
  saved: '저장됨',
  unsaved: '저장하지 않은 변경 사항',
  loading: '문서를 여는 중…',
  page: '쪽',
  frames: '틀 안의 글(표, 글상자)',
  empty: '이 문서에는 고칠 글이 없습니다.',
  notePreview:
    '글만 바뀝니다. 글꼴, 표, 그림, 배치는 그대로 두며, 줄이 길어지거나 짧아지면 훈민정음이 파일을 열 때 줄을 다시 짭니다.',
  saveFailed: '저장하지 못했습니다: {{error}}',
  cannotStore: '이 문서(옛 버전)의 글자 코드에 없는 글자라 입력할 수 없어 원래 글로 되돌렸습니다.',
  modified: '다른 프로그램이 파일을 바꿔 저장하지 않았습니다.',
  refusedUnreadable: '이 파일을 읽을 수 없습니다.',
  refusedNotGul: '훈민정음(.gul) 문서가 아닙니다.',
  refusedUnsupported:
    '이 문서(암호 문서이거나 아직 지원하지 않는 구조)는 열 수 없으며, 파일도 바꾸지 않습니다.',
}

// The languages not written yet read English (createI18n falls back to `en`).
export const strings = { zh, en, ko } as unknown as LangDicts<typeof zh>
export type GulStringKey = keyof typeof zh
export type { Lang }
