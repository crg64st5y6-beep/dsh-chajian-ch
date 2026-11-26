/** Client half: register the study desk tab type and its body. */
import * as React from 'react'
import { Component } from 'react'
import { StudyDesk } from './study-desk.jsx'
import { CSS } from './styles.js'

export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles', 'remote.commands', 'conversation']

const NS = 'studyDesk'
const ID = '@local/study-desk'
const KIND = 'study-desk'

const zh = {
  title: '学习台',
  'guide.title': '学习台 · PDF',
  'guide.description': '全屏读 PDF，选中即可复制',
  materials: '材料',
  reload: '刷新',
  loading: '正在打开 PDF…',
  rendering: '正在排版…',
  listFailed: '读取学习目录失败',
  openFailed: '打开 PDF 失败',
  pageFailed: '这一页渲染失败',
  retry: '重试',
  retryPage: '重试本页',
  empty: '还没有材料：把 PDF 放到 学习/，或点「导入」选一份',
  selectFile: '选择一份材料',
  import: '导入',
  importTitle: '导入 PDF',
  importFilter: '按文件名或路径筛选',
  importSearchFailed: '搜索工作区里的 PDF 失败',
  pickerHint: '也可以把 PDF 放到 学习/ 目录，会自动出现在列表里',
  scannedTag: '自动',
  importedTag: '已导入',
  backToMaterials: '材料列表',
  remove: '移除',
  add: '添加',
  cancel: '取消',
  noSelection: '没有选择文件',
  pickerEmpty: '没有找到 PDF',
  panelTitle: '学习台标注',
  newAnnotation: '新标注 · 第 {page} 页',
  annotationTitle: '第 {page} 页 · {kind}',
  kindHighlight: '高亮',
  kindNote: '便签',
  kindRegion: '截图',
  highlight: '高亮',
  askSelection: '问这句',
  askImage: '问这张图',
  saveOnly: '只保存',
  questionPlaceholder: '想问什么？可留空，只保存标注',
  waitingAnswer: '已放进输入框：按回车发送后，回答会显示在这里。',
  thinking: '正在思考',
  saving: '保存中…',
  screenshot: '截图',
  close: '关闭',
  askSelectionDefault: '请解释这一处。',
  askImageDefault: '请解释这张截图里的内容。',
  promptLine: '第 {page} 页（{kind}）：{question}',
  promptHeader: '（第 {page} 页 · {kind}）',
  promptShot: '截图：{path}',
  promptFormat: '请用 Markdown 书写；数学公式用 LaTeX：行内 $...$，独立公式 $$...$$。',
  prefillUnavailable: '无法预填输入框',
  prefilledHint: '已放进输入框：点下面发送，或点输入框按回车。',
  sendToChat: '发送到会话',
  reask: '再问一次',
  copyText: '复制',
  quoteText: '引用文本',
  copied: '已复制',
  kindGeneral: '提问',
  askGeneralDefault: '请解释这一页。',
  minimize: '最小化',
  restore: '还原',
  ask: '问',
  regionReady: '已框选第 {page} 页',
  moveToInput: '移进输入框',
  askTitle: '提问 · 第 {page} 页',
  askPlaceholder: '输入问题；回车换行，点发送提交',
  askHint: '选中文字或框选一块，移进这里再提问',
  send: '发送',
  attachImage: '插入图片',
  attachUnavailable: '当前会话不支持图片附件',
  attachUnsupported: '只支持图片文件',
  endClass: '下课',
  endingClass: '整理中…',
  endedClass: '已下课',
  endClassConfirm: '结束这节课？原文件会备份，学习台里的这份 PDF 将替换为带批注版，并在末尾加一页课堂成果总结。整理由 AI 现场完成，可能需要一会儿。',
  endClassConfirmAction: '下课',
  endClassQuestion: '结束这节课？',
  endClassBody: '先备份原文件，再把学习台里的这份 PDF 换成带批注版，末尾加一页课堂成果总结。',
  endClassNote: '整理由 AI 现场完成，可能需要一会儿；完成后会自动刷新。',
  endClassBackup: '原文件备份',
  endClassSummary: '末尾加总结页',
  endClassCancel: '再想想',
  endClassDisabled: '还没有问答，先提问再下课',
  endingHint: '正在整理这节课…',
  endedToast: '整理完成，批注版已就位',
  endedView: '查看',
  restoreOriginal: '恢复原版',
  restoring: '恢复中…',
  restoreQuestion: '恢复原版？',
  restoreBody: '会用上课前的备份替换当前批注版；标注/问答记录保留，之后可以再次下课。',
  restoreNote: '当前批注版会被替换，想保留的话先取消。',
  restoreConfirm: '恢复',
  restoredToast: '已恢复原版',
  regenerate: '重新生成',
  versionOriginal: '原版',
  versionAnnotated: '批注版',
  endClassTimeout: '整理超时了，可以点「恢复原版」后重新生成。',

  regionMode: '框选',
  noteMode: '便签',
  page: '第 {page} / {total} 页',
  previous: '上一页',
  next: '下一页',
  zoomOut: '缩小',
  zoomIn: '放大',
  fitWidth: '适应宽度',
}

const en = {
  title: 'Study desk',
  'guide.title': 'Study desk · PDF',
  'guide.description': 'Read PDFs full-page; select text to copy',
  materials: 'Materials',
  reload: 'Reload',
  loading: 'Opening the PDF…',
  rendering: 'Rendering…',
  listFailed: 'Could not read the study folder',
  openFailed: 'Could not open the PDF',
  pageFailed: 'This page failed to render',
  retry: 'Retry',
  retryPage: 'Retry this page',
  empty: 'No material yet: put PDFs under 学习/, or choose one with Import',
  selectFile: 'Choose a material',
  import: 'Import',
  importTitle: 'Import PDF',
  importFilter: 'Filter by name or path',
  importSearchFailed: 'Could not search the workspace for PDFs',
  pickerHint: 'You can also put PDFs under 学习/; they appear automatically',
  scannedTag: 'Auto',
  importedTag: 'Imported',
  backToMaterials: 'Materials',
  remove: 'Remove',
  add: 'Add',
  cancel: 'Cancel',
  noSelection: 'No file selected',
  pickerEmpty: 'No PDF found',
  panelTitle: 'Study annotation',
  newAnnotation: 'New annotation · page {page}',
  annotationTitle: 'Page {page} · {kind}',
  kindHighlight: 'Highlight',
  kindNote: 'Note',
  kindRegion: 'Screenshot',
  highlight: 'Highlight',
  askSelection: 'Ask this',
  askImage: 'Ask this image',
  saveOnly: 'Save only',
  questionPlaceholder: 'What do you want to ask? Leave blank to save only',
  waitingAnswer: 'Placed in the composer: press Enter, then the answer appears here.',
  thinking: 'Thinking',
  saving: 'Saving…',
  screenshot: 'Screenshot',
  close: 'Close',
  askSelectionDefault: 'Please explain this passage.',
  askImageDefault: 'Please explain this screenshot.',
  promptLine: 'Page {page} ({kind}): {question}',
  promptHeader: '(Page {page} · {kind})',
  promptShot: 'Screenshot: {path}',
  promptFormat: 'Write in Markdown; use LaTeX for math: $...$ inline, $$...$$ display.',
  prefillUnavailable: 'Could not prefill the composer',
  prefilledHint: 'Placed in the composer: press Send below, or click the composer and press Enter.',
  sendToChat: 'Send to conversation',
  reask: 'Ask again',
  copyText: 'Copy',
  quoteText: 'Quote text',
  copied: 'Copied',
  kindGeneral: 'Question',
  askGeneralDefault: 'Please explain this page.',
  minimize: 'Minimize',
  restore: 'Restore',
  ask: 'Ask',
  regionReady: 'Selected page {page}',
  moveToInput: 'Move to input',
  askTitle: 'Ask · page {page}',
  askPlaceholder: 'Type a question; Enter adds a line, use Send to submit',
  askHint: 'Select text or frame a region, move it here, then ask',
  send: 'Send',
  attachImage: 'Insert image',
  attachUnavailable: 'This conversation does not accept image attachments',
  attachUnsupported: 'Only image files are supported',
  endClass: 'End class',
  endingClass: 'Organizing…',
  endedClass: 'Class ended',
  endClassConfirm: 'End this class? The original file is backed up; the copy in the study desk is replaced by an annotated version, with a one-page class summary appended. The AI will organize it live and may take a while.',
  endClassConfirmAction: 'End class',
  endClassQuestion: 'End this class?',
  endClassBody: 'The original file is backed up, then the copy in the study desk is replaced by an annotated version with a one-page summary appended.',
  endClassNote: 'The AI organizes it live; it may take a moment and the PDF refreshes when done.',
  endClassBackup: 'Original backed up',
  endClassSummary: 'Summary appended',
  endClassCancel: 'Not yet',
  endClassDisabled: 'No questions yet — ask something first',
  endingHint: 'Organizing this class…',
  endedToast: 'Done — the annotated copy is ready',
  endedView: 'View',
  restoreOriginal: 'Restore original',
  restoring: 'Restoring…',
  restoreQuestion: 'Restore the original?',
  restoreBody: 'The latest pre-class backup replaces the current annotated PDF; annotations and Q&A stay, and you can end the class again.',
  restoreNote: 'The current annotated copy is replaced; cancel if you want to keep it.',
  restoreConfirm: 'Restore',
  restoredToast: 'Original restored',
  regenerate: 'Regenerate',
  versionOriginal: 'Original',
  versionAnnotated: 'Annotated',
  endClassTimeout: 'Organizing timed out; restore the original and regenerate.',

  regionMode: 'Region',
  noteMode: 'Note',
  page: 'Page {page} of {total}',
  previous: 'Previous page',
  next: 'Next page',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  fitWidth: 'Fit width',
}

/** Keep a body crash visible in the pane instead of leaving it blank. */
class StudyBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: undefined }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: 'var(--dsw-alias-state-error-primary)', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>学习台加载失败</div>
          <div>{String(this.state.error?.stack ?? this.state.error)}</div>
        </div>
      )
    }
    return this.props.children
  }
}

function StudyDeskBody(props) {
  return <StudyBoundary><StudyDesk {...props} /></StudyBoundary>
}

/** Guide-card glyph: a page with an accent header. */
function StudyIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="12" y="6" width="40" height="52" rx="5" fill="none" stroke="currentColor" strokeWidth="3.2" />
      <path d="M12 18 H52" stroke="var(--dsw-alias-brand-primary)" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M22 28 H42 M22 36 H42 M22 44 H34" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" opacity="0.72" />
    </svg>
  )
}

/**
 * Client plugin body: dictionaries, styles, the tab type, and the keyed body.
 * @param ctx - client context carrying the slot registry, right-Sidebar registry, and Remote.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'study-desk: locale')
  const t = ctx.locale.bind(NS)

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-study-desk', '')
    style.textContent = CSS
    document.head.append(style)
    return () => { style.remove() }
  }, 'study-desk: styles')

  const definition = {
    id: ID,
    kind: KIND,
    priority: 'extension',
    keepMounted: true,
    title: () => t('title'),
    guide: [{
      id: 'study-desk',
      order: 20,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
      icon: StudyIcon,
    }],
  }
  ctx.effect(() => ctx.sidebarRightTabs.register(definition), 'study-desk: tab type')

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: ID,
    locale: NS,
    inject: () => ({
      remote: ctx.remote,
    }),
  }, (props) => <StudyBoundary><StudyDesk {...props} conversation={ctx.conversation} /></StudyBoundary>)), 'study-desk: tab body')
}
