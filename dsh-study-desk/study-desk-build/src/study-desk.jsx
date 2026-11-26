/** The study desk tab: library, reader, selection actions, and one pure ask box. */
import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AskPanel } from './ask-panel.jsx'
import { FilePicker } from './file-picker.jsx'
import { PdfReader } from './pdf-reader.jsx'
import { loadAnnotations, restoreOriginal, saveAnnotations } from './annotations.js'

const MOUNT = '学习'
const IMPORTS_KEY = 'study-desk:imports:'

function linkedSignal(first, second) {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([first, second])
  const controller = new AbortController()
  const abort = () => controller.abort()
  for (const signal of [first, second]) {
    if (signal.aborted) { controller.abort(); break }
    signal.addEventListener('abort', abort, { once: true })
  }
  return controller.signal
}

function basename(path) {
  return path.split('/').pop() ?? path
}

function describeError(value) {
  if (!value) return ''
  const code = value.code ? String(value.code) : ''
  const message = value.message ? String(value.message) : ''
  return [code, message].filter(Boolean).join(': ') || String(value)
}

function newId() {
  try { return crypto.randomUUID() } catch { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
}

async function listPdfs(remote, sessionId, signal) {
  const found = []
  let detail = ''
  const walk = async (directory, depth) => {
    let listing
    try {
      const outcome = await remote.workspaceFiles.list(sessionId, directory, signal)
      if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('study-desk: directory listing failed')
      listing = outcome.value
    } catch (error) {
      if (signal.aborted) return
      throw error
    }
    if (signal.aborted) return
    const entries = listing.entries ?? []
    if (depth === 0) {
      detail = directory + '/: ' + entries.length + ' 项' + (entries.length ? '（' + entries.map((entry) => entry.name + '/' + entry.type).join(', ') + '）' : '')
    }
    for (const entry of entries) {
      const path = directory ? directory + '/' + entry.name : entry.name
      if (entry.type === 'directory') {
        if (depth < 4) await walk(path, depth + 1)
      } else if (entry.type === 'file' && /\.pdf$/i.test(entry.name)) {
        found.push({ path, name: entry.name })
      }
    }
  }
  await walk(MOUNT, 0)
  return { files: found, detail }
}

function readImports(sessionId) {
  try {
    const raw = localStorage.getItem(IMPORTS_KEY + sessionId)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list.filter((file) => file && typeof file.path === 'string')
  } catch { return [] }
}

function writeImports(sessionId, files) {
  try { localStorage.setItem(IMPORTS_KEY + sessionId, JSON.stringify(files)) } catch { /* private mode */ }
}

/** Register a browser-owned image draft so the sent message shows the screenshot. */
async function draftImageIds(conversation, sessionId, dataUrl, name) {
  if (!conversation || typeof conversation.createDrafts !== 'function') return []
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], name + '.png', { type: blob.type || 'image/png' })
    return conversation.createDrafts(sessionId, [file], false).map((draft) => draft.id)
  } catch { return [] }
}

function mergeFiles(scanned, imports) {
  const map = new Map()
  for (const file of [...(scanned ?? []), ...(imports ?? [])]) {
    if (file?.path && !map.has(file.path)) map.set(file.path, file)
  }
  return [...map.values()].sort((left, right) => left.path.localeCompare(right.path, 'zh'))
}

function userText(node) {
  return (node?.content ?? []).filter((block) => block.type === 'text').map((block) => block.text).join('\n')
}

function answerOf(annotation, nodes, partial) {
  if (!annotation || !nodes) return ''
  const marker = 'study-desk:' + annotation.id
  let markerIndex = -1
  let lastUser = -1
  nodes.forEach((node, position) => {
    if (node.kind !== 'user') return
    lastUser = position
    if (userText(node).includes(marker)) markerIndex = position
  })
  if (markerIndex < 0) return ''
  for (let position = markerIndex + 1; position < nodes.length; position += 1) {
    const node = nodes[position]
    if (node.kind === 'assistant') {
      const text = (node.blocks ?? []).filter((block) => block.kind === 'text').map((block) => block.text).join('\n\n')
      if (text.trim()) return text
    }
  }
  if (partial && markerIndex === lastUser) {
    const text = (partial.blocks ?? []).filter((block) => block.kind === 'text').map((block) => block.text).join('')
    if (text.trim()) return text
  }
  return ''
}

function kindLabel(kind, t) {
  if (kind === 'region') return t('kindRegion')
  if (kind === 'general') return t('kindGeneral')
  return t('kindHighlight')
}

/** One tab body. */
export function StudyDesk(props) {
  const { t, sessionId, remote, useTabInfo, useChat, inputActions, conversation } = props
  const info = useTabInfo()
  const signal = info.tab.signal
  const legacy = useChat((snapshot) => snapshot.legacy) ?? { nodes: [], partial: null }
  const chatNodes = legacy.nodes ?? []
  const partial = legacy.partial
  const [scanned, setScanned] = useState(undefined)
  const [imports, setImports] = useState(() => readImports(sessionId))
  const [detail, setDetail] = useState('')
  const [view, setView] = useState('library')
  const [selected, setSelected] = useState(undefined)
  const [bytes, setBytes] = useState(undefined)
  const [listError, setListError] = useState(undefined)
  const [readError, setReadError] = useState(undefined)
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [annotations, setAnnotations] = useState([])
  const [selection, setSelection] = useState(undefined)
  const [region, setRegion] = useState(undefined)
  const [context, setContext] = useState(undefined)
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [mode, setMode] = useState('none')
  const [currentPage, setCurrentPage] = useState(1)
  const [focusToken, setFocusToken] = useState(0)
  const [attachments, setAttachments] = useState([])
  const [classEndedAt, setClassEndedAt] = useState(undefined)
  const [annotatedPath, setAnnotatedPath] = useState(undefined)
  const [originalPath, setOriginalPath] = useState(undefined)
  const [ending, setEnding] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [justEnded, setJustEnded] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [justRestored, setJustRestored] = useState(false)
  const classIdRef = useRef('')
  const classTargetRef = useRef('')
  const saveChain = useRef(Promise.resolve())

  useEffect(() => {
    const list = readImports(sessionId)
    setImports(list)
  }, [sessionId])

  useEffect(() => {
    const controller = new AbortController()
    const stopped = linkedSignal(signal, controller.signal)
    let alive = true
    setScanned(undefined)
    setListError(undefined)
    setDetail('')
    ;(async () => {
      try {
        const result = await listPdfs(remote, sessionId, stopped)
        if (!alive || stopped.aborted) return
        setScanned(result.files)
        setDetail(result.detail)
      } catch (error) {
        if (alive && !stopped.aborted) setListError(error)
      }
    })()
    return () => { alive = false; controller.abort() }
  }, [remote, sessionId, signal, attempt])

  useEffect(() => {
    if (!selected || view !== 'reader') {
      setBytes(undefined)
      setReadError(undefined)
      setLoading(false)
      return undefined
    }
    const controller = new AbortController()
    const stopped = linkedSignal(signal, controller.signal)
    let alive = true
    setLoading(true)
    setReadError(undefined)
    setBytes(undefined)
    ;(async () => {
      try {
        const outcome = await remote.workspaceFiles.readBytes(sessionId, selected, {}, stopped)
        if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('study-desk: file read failed')
        const data = outcome.value?.data
        if (!(data instanceof Uint8Array)) throw new Error('study-desk: unexpected readBytes result')
        if (!alive || stopped.aborted) return
        setBytes(data)
      } catch (error) {
        if (alive && !stopped.aborted) setReadError(error)
      } finally {
        if (alive && !stopped.aborted) setLoading(false)
      }
    })()
    return () => { alive = false; controller.abort(); setLoading(false) }
  }, [remote, sessionId, selected, signal, attempt, view])

  useEffect(() => {
    if (!selected || view !== 'reader') return undefined
    const controller = new AbortController()
    const stopped = linkedSignal(signal, controller.signal)
    let alive = true
    setAnnotations([])
    setClassEndedAt(undefined)
    ;(async () => {
      try {
        const result = await loadAnnotations(remote, sessionId, selected, stopped)
        if (alive && !stopped.aborted) {
          setAnnotations(result.annotations)
          setClassEndedAt(result.classEndedAt)
          setAnnotatedPath(result.annotatedPath ?? (result.originalPath ? selected : undefined))
          setOriginalPath(result.originalPath ?? (result.annotatedPath ? selected : undefined))
        }
      } catch { /* missing sidecar */ }
    })()
    return () => { alive = false; controller.abort() }
  }, [remote, sessionId, selected, signal, view])

  useEffect(() => {
    if (!ending || !selected) return undefined
    const controller = new AbortController()
    let alive = true
    const timer = window.setInterval(async () => {
      try {
        const sourcePdf = originalPath ?? (selected && /-批注版\.pdf$/i.test(selected) ? selected.replace(/-批注版\.pdf$/i, '.pdf') : selected)
        if (!sourcePdf) return
        const outcome = await remote.workspaceFiles.read(sessionId, sourcePdf + '.annotations.json', { offset: 1, limit: 4000 }, controller.signal)
        if (!outcome?.ok) return
        const data = JSON.parse(outcome.value.text)
        if (alive && typeof data.classEndedAt === 'string') {
          window.clearInterval(timer)
          setClassEndedAt(data.classEndedAt)
          if (typeof data.annotatedPath === 'string') setAnnotatedPath(data.annotatedPath)
          setEnding(false)
          setJustEnded(true)
          setAttempt((value) => value + 1)
        }
      } catch { /* not ready yet */ }
    }, 2500)
    return () => { alive = false; controller.abort(); window.clearInterval(timer) }
  }, [ending, selected, remote, sessionId, originalPath])

  useEffect(() => {
    if (!ending) return
    const marker = 'study-desk:class-end:' + classIdRef.current
    const done = chatNodes.some((node) => node.kind === 'assistant'
      && (node.blocks ?? []).some((block) => block.kind === 'text' && block.text.includes(marker)))
    if (done) {
      setClassEndedAt(new Date().toISOString())
      if (classTargetRef.current) setAnnotatedPath(classTargetRef.current)
      setEnding(false)
      setJustEnded(true)
      setAttempt((value) => value + 1)
    }
  }, [chatNodes, ending])

  useEffect(() => {
    if (!confirmEnd && !confirmRestore) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setConfirmEnd(false)
      setConfirmRestore(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmEnd, confirmRestore])

  useEffect(() => {
    if (!justEnded) return undefined
    const timer = window.setTimeout(() => setJustEnded(false), 8000)
    return () => window.clearTimeout(timer)
  }, [justEnded])

  useEffect(() => {
    if (!justRestored) return undefined
    const timer = window.setTimeout(() => setJustRestored(false), 6000)
    return () => window.clearTimeout(timer)
  }, [justRestored])

  useEffect(() => {
    if (!ending) return undefined
    const timer = window.setTimeout(() => {
      setEnding(false)
      setSaveError(t('endClassTimeout'))
    }, 10 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [ending, t])

  const files = useMemo(
    () => (scanned === undefined ? undefined : mergeFiles(scanned, imports)),
    [scanned, imports],
  )
  const importedPaths = useMemo(() => new Set(imports.map((file) => file.path)), [imports])
  const contextAnnotation = context?.annotationId ? annotations.find((entry) => entry.id === context.annotationId) : undefined
  const reply = contextAnnotation ? answerOf(contextAnnotation, chatNodes, partial) : ''
  const highlights = annotations.filter((entry) => entry.kind === 'selection')
  const hasQuestions = useMemo(
    () => annotations.some((entry) => typeof entry.question === 'string' && entry.question.trim().length > 0),
    [annotations],
  )
  const endStatus = ending ? 'ending' : classEndedAt ? 'ended' : hasQuestions ? 'ready' : 'disabled'

  const persist = (list, image, deleteScreenshots) => {
    const run = saveChain.current.then(async () => {
      setSaving(true)
      setSaveError('')
      try {
        return await saveAnnotations(remote, sessionId, selected, list, signal, image, deleteScreenshots)
      } catch (error) {
        setSaveError(describeError(error))
        return undefined
      } finally {
        setSaving(false)
      }
    })
    saveChain.current = run.catch(() => {})
    return run
  }

  const buildPrompt = (annotation, screenshot, text) => {
    const lines = []
    if (text) lines.push(text)
    lines.push('')
    lines.push(t('promptHeader', { page: annotation.page, kind: kindLabel(annotation.kind, t) }))
    if (screenshot) lines.push(t('promptShot', { path: screenshot }))
    lines.push(t('promptFormat'))
    lines.push('<!-- study-desk:' + annotation.id + ' -->')
    return lines.join('\n')
  }

  const openFile = (path) => {
    setSelected(path)
    setView('reader')
    setAnnotations([])
    setSelection(undefined)
    setRegion(undefined)
    setContext(undefined)
    setQuestion('')
    setSent(false)
    setSaveError('')
    setMode('none')
    setAttachments([])
    setClassEndedAt(undefined)
    setAnnotatedPath(undefined)
    setOriginalPath(undefined)
    setEnding(false)
    setConfirmEnd(false)
  }

  const back = () => {
    setView('library')
    setSelected(undefined)
    setAnnotations([])
    setSelection(undefined)
    setRegion(undefined)
    setContext(undefined)
    setQuestion('')
    setSent(false)
    setSaveError('')
    setMode('none')
    setAttachments([])
    setClassEndedAt(undefined)
    setAnnotatedPath(undefined)
    setOriginalPath(undefined)
    setEnding(false)
    setConfirmEnd(false)
  }

  const switchVersion = (path) => {
    if (!path || path === selected) return
    openFile(path)
  }

  const addImport = (path, name) => {
    const next = mergeFiles(imports, [{ path, name }])
    setImports(next)
    writeImports(sessionId, next)
    setPickerOpen(false)
  }

  const removeImport = (path) => {
    const next = imports.filter((file) => file.path !== path)
    setImports(next)
    writeImports(sessionId, next)
  }

  const isHeicFile = (file) => /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

  const convertHeicFile = async (file) => {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000))
    }
    const line = '/study-desk-heic ' + btoa(JSON.stringify({ name: file.name, data: btoa(binary) }))
    const outcome = await remote.commands.execute(sessionId, line, [], signal)
    if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('HEIC conversion failed')
    const result = outcome.value?.result
    if (!result || result.kind !== 'success') throw new Error(result?.text ?? 'HEIC conversion failed')
    const read = await remote.workspaceFiles.readBytes(sessionId, result.text, {}, signal)
    if (!read || read.ok !== true) throw read?.error ?? new Error('converted image read failed')
    const converted = read.value?.data
    if (!(converted instanceof Uint8Array) || converted.length === 0) throw new Error('converted image is empty')
    return new File([converted], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' })
  }

  const attachFiles = async (files) => {
    if (!conversation || typeof conversation.createDrafts !== 'function') {
      setSaveError(t('attachUnavailable'))
      return
    }
    const list = [...files].filter((file) => /^image\//i.test(file.type) || isHeicFile(file))
    if (!list.length) {
      setSaveError(t('attachUnsupported'))
      return
    }
    try {
      const prepared = []
      for (const file of list) {
        prepared.push(isHeicFile(file) ? await convertHeicFile(file) : file)
      }
      const drafts = conversation.createDrafts(sessionId, prepared, false)
      setAttachments((value) => [...value, ...drafts.map((draft) => ({
        id: draft.id,
        previewUrl: draft.previewUrl,
        name: draft.file?.name,
      }))])
      setSaveError('')
    } catch (error) {
      setSaveError(describeError(error))
    }
  }

  const removeAttachment = (id) => {
    try { conversation?.releaseDraftAttachment?.(id) } catch { /* ignore */ }
    setAttachments((value) => value.filter((item) => item.id !== id))
  }

  const removeScreenshot = () => {
    for (const id of context?.attachmentIds ?? []) {
      try { conversation?.releaseDraftAttachment?.(id) } catch { /* ignore */ }
    }
    const id = context?.annotationId
    const annotation = id ? annotations.find((entry) => entry.id === id) : undefined
    setContext((value) => (value ? { ...value, image: undefined, screenshot: undefined, attachmentIds: undefined } : value))
    if (!annotation) return
    const next = annotations.filter((entry) => entry.id !== annotation.id)
    setAnnotations(next)
    void persist(next, undefined, annotation.screenshot ? [annotation.screenshot] : [])
  }

  const openAsk = (next, draft = '') => {
    setContext(next)
    setQuestion(draft)
    setSent(false)
    setSaveError('')
    setSelection(undefined)
    setRegion(undefined)
    setMode('none')
    setFocusToken((value) => value + 1)
  }

  const onSelect = (data) => {
    setSelection(data)
    setRegion(undefined)
    setMode('none')
    setSaveError('')
  }

  const onRegion = (data) => {
    setRegion(data)
    setSelection(undefined)
    setMode('none')
    setSaveError('')
  }

  const onOpenHighlight = (id) => {
    const annotation = annotations.find((entry) => entry.id === id)
    if (!annotation) return
    openAsk({ kind: 'selection', page: annotation.page, rects: annotation.rects, quote: annotation.quote, annotationId: id }, '> ' + annotation.quote + '\n\n')
    setSent(Boolean(annotation.question))
  }

  const quoteIntoInput = () => {
    if (!selection?.quote) return
    const quoted = '> ' + selection.quote + '\n\n'
    setQuestion((value) => (value ? value + '\n' + quoted : quoted))
    setContext({ kind: 'selection', page: selection.page, quote: selection.quote })
    setSelection(undefined)
    setSent(false)
    setFocusToken((value) => value + 1)
  }

  const confirmRegion = async () => {
    if (!region) return
    const id = newId()
    const annotation = {
      id,
      page: region.page,
      kind: 'region',
      rects: [region.rect],
      quote: '',
      question: '',
      createdAt: Date.now(),
    }
    const next = [...annotations, annotation]
    setAnnotations(next)
    const screenshot = await persist(next, { id, data: region.image })
    if (!screenshot) {
      setAnnotations((list) => list.filter((entry) => entry.id !== id))
      return
    }
    setAnnotations((list) => list.map((entry) => entry.id === id ? { ...entry, screenshot } : entry))
    const attachmentIds = await draftImageIds(conversation, sessionId, region.image, id)
    setContext({ kind: 'region', page: region.page, image: region.image, screenshot, attachmentIds, annotationId: id })
    setQuestion('')
    setSent(false)
    setSelection(undefined)
    setRegion(undefined)
    setMode('none')
    setSaveError('')
    setFocusToken((value) => value + 1)
  }

  const sendQuestion = () => {
    const ctx = context ?? { kind: 'general', page: currentPage }
    const hasImages = attachments.length > 0 || ctx.kind === 'region'
    const text = question.trim() || (hasImages ? t('askImageDefault') : ctx.kind === 'general' ? t('askGeneralDefault') : t('askSelectionDefault'))
    let annotation = ctx.annotationId ? annotations.find((entry) => entry.id === ctx.annotationId) : undefined
    let next = annotations
    if (annotation) {
      next = annotations.map((entry) => entry.id === annotation.id ? { ...entry, question: text } : entry)
      setAnnotations(next)
      void persist(next)
    } else {
      const id = newId()
      annotation = {
        id,
        page: ctx.page ?? currentPage,
        kind: ctx.kind === 'region' ? 'region' : ctx.kind === 'general' ? 'general' : 'selection',
        rects: ctx.rects ?? [],
        quote: ctx.quote ?? '',
        question: text,
        createdAt: Date.now(),
      }
      next = [...annotations, annotation]
      setAnnotations(next)
      setContext({ ...ctx, annotationId: id })
      void persist(next)
    }
    const allIds = [...(ctx.attachmentIds ?? []), ...attachments.map((item) => item.id)]
    let attached = false
    if (allIds.length && typeof inputActions?.addAttachments === 'function') {
      try { attached = inputActions.addAttachments(allIds) === true } catch { attached = false }
    }
    const screenshot = attached ? undefined : ctx.screenshot
    const prompt = buildPrompt(annotation, screenshot, text)
    if (typeof inputActions?.setDraft !== 'function') {
      setSaveError(t('prefillUnavailable'))
      return
    }
    inputActions.setDraft(prompt)
    setQuestion('')
    setAttachments([])
    setSent(true)
    setSaveError('')
    setContext((value) => (value ? { ...value, image: undefined, screenshot: undefined, attachmentIds: undefined } : value))
    window.setTimeout(() => {
      try { inputActions?.submit?.() } catch (error) { setSaveError(describeError(error)) }
    }, 0)
  }

  const handleEndClass = () => {
    if (ending) return
    if (classEndedAt) {
      if (annotatedPath) switchVersion(annotatedPath)
      return
    }
    if (!hasQuestions) return
    setConfirmEnd(true)
  }

  const startEndClass = () => {
    if (!selected || ending) return
    setConfirmEnd(false)
    setEnding(true)
    setSaveError('')
    const classId = newId()
    classIdRef.current = classId
    const sourcePdf = originalPath ?? (selected && /-批注版\.pdf$/i.test(selected) ? selected.replace(/-批注版\.pdf$/i, '.pdf') : selected)
    const targetPdf = annotatedPath ?? (sourcePdf ? sourcePdf.replace(/\.pdf$/i, '-批注版.pdf') : undefined)
    classTargetRef.current = targetPdf ?? ''
    const prompt = [
      '下课整理：请按 study-desk/docs/END-CLASS.md 的规范，整理这节课的问答并生成批注版。',
      '原版 PDF：' + sourcePdf,
      'sidecar：' + sourcePdf + '.annotations.json',
      '批注版输出：' + targetPdf + '（原版不要覆盖）',
      '完成后在 sidecar 写入 classEndedAt 和 annotatedPath，并把 sidecar 复制到批注版（含 originalPath）。',
      '回复最后加：<!-- study-desk:class-end:' + classId + ' -->',
    ].join('\n')
    if (typeof inputActions?.setDraft !== 'function') {
      setSaveError(t('prefillUnavailable'))
      setEnding(false)
      return
    }
    inputActions.setDraft(prompt)
    window.setTimeout(() => {
      try { inputActions?.submit?.() } catch (error) {
        setSaveError(describeError(error))
        setEnding(false)
      }
    }, 0)
  }

  const handleRestore = () => {
    if (restoring) return
    if (!classEndedAt) return
    setConfirmRestore(true)
  }

  const startRestore = async (regenerate = false) => {
    if (!selected || restoring) return
    setConfirmRestore(false)
    setRestoring(true)
    setSaveError('')
    try {
      await restoreOriginal(remote, sessionId, selected, signal)
      setClassEndedAt(undefined)
      setAttempt((value) => value + 1)
      if (regenerate) startEndClass()
      else setJustRestored(true)
    } catch (error) {
      setSaveError(describeError(error))
    } finally {
      setRestoring(false)
    }
  }

  const retry = () => setAttempt((value) => value + 1)
  const reload = () => { setSelected(undefined); setView('library'); setAttempt((value) => value + 1) }

  if (view === 'reader') {
    const panel = (
      <AskPanel
        t={t}
        context={context}
        page={context?.page ?? currentPage}
        question={question}
        onQuestion={setQuestion}
        onSend={sendQuestion}
        reply={reply}
        waiting={sent && !reply}
        sending={saving}
        error={saveError}
        focusToken={focusToken}
        attachments={attachments}
        onAttachFiles={attachFiles}
        onRemoveAttachment={removeAttachment}
        onRemoveScreenshot={removeScreenshot}
      />
    )
    const selectionBar = selection ? (
      <div className="study-askbar">
        <span className="study-askbar-text" title={selection.quote}>{selection.quote.slice(0, 80)}</span>
        <button className="study-btn study-primary" onClick={quoteIntoInput}>{t('quoteText')}</button>
        <button className="study-btn" onClick={() => setSelection(undefined)} aria-label={t('close')}>×</button>
      </div>
    ) : null
    const regionBar = region ? (
      <div className="study-askbar">
        <span className="study-askbar-text">{t('regionReady', { page: region.page })}</span>
        <button className="study-btn study-primary" disabled={saving} onClick={() => { void confirmRegion() }}>{t('moveToInput')}</button>
        <button className="study-btn" onClick={() => setRegion(undefined)}>{t('cancel')}</button>
        {saveError ? <span className="study-error-detail">{saveError}</span> : null}
      </div>
    ) : null
    const endModal = confirmEnd ? (
      <div
        className="study-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmEnd(false) }}
      >
        <div className="study-end-modal" role="dialog" aria-modal="true" aria-labelledby="study-end-title">
          <button className="study-modal-close" onClick={() => setConfirmEnd(false)} aria-label={t('cancel')}>×</button>
          <div className="study-end-badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M4 14V2.8M4.3 3.2h7.2L9.7 5.8l1.8 2.5H4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="study-modal-title" id="study-end-title">{t('endClassQuestion')}</div>
          {selected ? <div className="study-end-file">{basename(selected)}</div> : null}
          <div className="study-modal-body">{t('endClassBody')}</div>
          <div className="study-end-points">
            <span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.4 6.6 11.5 12.8 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('endClassBackup')}
            </span>
            <span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.4 6.6 11.5 12.8 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('endClassSummary')}
            </span>
          </div>
          <div className="study-modal-note">{t('endClassNote')}</div>
          <div className="study-modal-actions">
            <button className="study-btn study-ghost" onClick={() => setConfirmEnd(false)}>{t('endClassCancel')}</button>
            <button className="study-btn study-end-go" onClick={startEndClass}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 14V2.8M4.3 3.2h7.2L9.7 5.8l1.8 2.5H4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {t('endClassConfirmAction')}
            </button>
          </div>
        </div>
      </div>
    ) : null
    const endingBar = ending ? (
      <div className="study-ending-bar" role="status">
        <span className="study-spinner" aria-hidden="true" />
        <span>{t('endingHint')}</span>
      </div>
    ) : null
    const endedToast = justEnded ? (
      <div className="study-done-toast" role="status">
        <span className="study-done-icon" aria-hidden="true">✓</span>
        <span>{t('endedToast')}</span>
        <button className="study-btn" onClick={() => { setJustEnded(false); if (annotatedPath) switchVersion(annotatedPath) }}>{t('endedView')}</button>
        <button className="study-done-close" onClick={() => setJustEnded(false)} aria-label={t('close')}>×</button>
      </div>
    ) : null
    const restoreModal = confirmRestore ? (
      <div
        className="study-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmRestore(false) }}
      >
        <div className="study-end-modal" role="dialog" aria-modal="true" aria-labelledby="study-restore-title">
          <button className="study-modal-close" onClick={() => setConfirmRestore(false)} aria-label={t('cancel')}>×</button>
          <div className="study-end-badge" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M4.2 6.1A5 5 0 1 1 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M3.2 3.2v3.1h3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="study-modal-title" id="study-restore-title">{t('restoreQuestion')}</div>
          {selected ? <div className="study-end-file">{basename(selected)}</div> : null}
          <div className="study-modal-body">{t('restoreBody')}</div>
          <div className="study-modal-note">{t('restoreNote')}</div>
          <div className="study-modal-actions">
            <button className="study-btn study-ghost" onClick={() => setConfirmRestore(false)}>{t('cancel')}</button>
            <button className="study-btn study-restore-go" disabled={restoring} onClick={() => { void startRestore(false) }}>
              {restoring ? <span className="study-spinner" /> : null}
              {restoring ? t('restoring') : t('restoreConfirm')}
            </button>
            <button className="study-btn study-end-go" disabled={restoring} onClick={() => { void startRestore(true) }}>
              {restoring ? <span className="study-spinner" /> : null}
              {restoring ? t('restoring') : t('regenerate')}
            </button>
          </div>
        </div>
      </div>
    ) : null
    const restoredToast = justRestored ? (
      <div className="study-done-toast" role="status">
        <span className="study-done-icon" aria-hidden="true">↺</span>
        <span>{t('restoredToast')}</span>
        <button className="study-done-close" onClick={() => setJustRestored(false)} aria-label={t('close')}>×</button>
      </div>
    ) : null
    if (bytes) {
      return (
        <div className="study-reader-wrap">
          <PdfReader
            data={bytes}
            signal={signal}
            t={t}
            onBack={back}
            title={selected}
            annotations={highlights}
            activeId={context?.annotationId}
            mode={mode}
            onMode={setMode}
            onSelect={onSelect}
            onRegion={onRegion}
            onOpen={onOpenHighlight}
            onPage={setCurrentPage}
            endStatus={endStatus}
            onEndClass={handleEndClass}
            originalPath={originalPath}
            annotatedPath={annotatedPath}
            selected={selected}
            onSwitchVersion={switchVersion}
            onRegenerate={startEndClass}
          />
          {selectionBar}
          {regionBar}
          {panel}
          {endModal}
          {endingBar}
          {endedToast}
          {restoreModal}
          {restoredToast}
        </div>
      )
    }
    return (
      <div className="study-reader-wrap">
        <div className="study-toolbar">
          <button className="study-btn" onClick={back} aria-label={t('backToMaterials')} title={t('backToMaterials')}>‹</button>
          <span className="study-file-title" title={selected ?? ''}>{selected ? basename(selected) : ''}</span>
        </div>
        <div className="study-scroll study-center">
          {readError ? (
            <div className="study-status study-error">
              <span>{t('openFailed')}</span>
              <span className="study-error-detail">{describeError(readError)}</span>
              <button className="study-btn" onClick={retry}>{t('retry')}</button>
            </div>
          ) : (
            <div className="study-status">{t('loading')}</div>
          )}
        </div>
        {selectionBar}
        {regionBar}
        {panel}
        {endModal}
        {endingBar}
        {endedToast}
        {restoreModal}
        {restoredToast}
      </div>
    )
  }

  return (
    <div className="study-desk-root">
      <div className="study-bar">
        <span className="study-brand">{t('title')}</span>
        <span className="study-spacer" />
        <button className="study-btn" onClick={() => setPickerOpen(true)}>{t('import')}</button>
        <button className="study-btn" onClick={reload}>{t('reload')}</button>
      </div>
      <div className="study-scroll">
        {listError ? (
          <div className="study-status study-error">
            <span>{t('listFailed')}</span>
            <span className="study-error-detail">{describeError(listError)}</span>
            <button className="study-btn" onClick={retry}>{t('retry')}</button>
          </div>
        ) : files === undefined ? (
          <div className="study-status">{t('loading')}</div>
        ) : files.length === 0 ? (
          <div className="study-status">
            <span>{t('empty')}</span>
            {detail ? <span className="study-error-detail">{detail}</span> : null}
            <button className="study-btn" onClick={() => setPickerOpen(true)}>{t('import')}</button>
          </div>
        ) : (
          <div className="study-library">
            {files.map((file) => {
              const imported = importedPaths.has(file.path)
              return (
                <div className="study-file-row" key={file.path}>
                  <button className="study-file-main" onClick={() => openFile(file.path)} title={file.path}>
                    <span className="study-file-icon" aria-hidden="true">▤</span>
                    <span className="study-file-name">{file.name}</span>
                    <span className="study-file-path">{file.path}</span>
                    <span className="study-tag">{imported ? t('importedTag') : t('scannedTag')}</span>
                  </button>
                  {imported ? (
                    <button className="study-btn study-file-remove" onClick={() => removeImport(file.path)} aria-label={t('remove')} title={t('remove')}>×</button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {pickerOpen ? (
        <FilePicker
          remote={remote}
          sessionId={sessionId}
          t={t}
          imports={imports}
          onAdd={addImport}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  )
}
