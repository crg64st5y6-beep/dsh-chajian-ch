/** Persistent ask window: draggable, edge/corner resizable, minimizable to a bubble. */
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { renderMarkdown } from './markdown.js'

const RECT_KEY = 'study-desk:panel-rect'
const MIN_W = 280
const MIN_H = 220
const PAD = 8

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function readRect() {
  try {
    const raw = localStorage.getItem(RECT_KEY)
    const value = raw ? JSON.parse(raw) : null
    if (value && ['left', 'top', 'width', 'height'].every((key) => Number.isFinite(value[key]))) return value
  } catch { /* private mode */ }
  return null
}

function saveRect(rect) {
  try { localStorage.setItem(RECT_KEY, JSON.stringify(rect)) } catch { /* private mode */ }
}

function clampRect(rect, wrap) {
  const width = clamp(rect.width, MIN_W, Math.max(MIN_W, wrap.clientWidth - PAD * 2))
  const height = clamp(rect.height, MIN_H, Math.max(MIN_H, wrap.clientHeight - PAD * 2))
  const left = clamp(rect.left, PAD, Math.max(PAD, wrap.clientWidth - width - PAD))
  const top = clamp(rect.top, PAD, Math.max(PAD, wrap.clientHeight - height - PAD))
  return { left, top, width, height }
}

const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

export function AskPanel({ t, context, page, question, onQuestion, onSend, reply, waiting, sending, error, focusToken, attachments = [], onAttachFiles, onRemoveAttachment, onRemoveScreenshot }) {
  const panelRef = useRef(null)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(undefined)
  const resizeRef = useRef(undefined)
  const [rect, setRect] = useState(readRect)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    if (!focusToken) return
    setMinimized(false)
    textareaRef.current?.focus()
  }, [focusToken])

  useEffect(() => {
    const panel = panelRef.current
    const wrap = panel?.parentElement
    if (!panel || !wrap) return
    const stored = rect
    if (stored !== null) {
      setRect(clampRect(stored, wrap))
      return
    }
    const box = panel.getBoundingClientRect()
    const parent = wrap.getBoundingClientRect()
    setRect(clampRect({
      left: box.left - parent.left,
      top: box.top - parent.top,
      width: box.width,
      height: box.height,
    }, wrap))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => {
      const wrap = panelRef.current?.parentElement
      if (!wrap) return
      setRect((value) => (value ? clampRect(value, wrap) : value))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const baseRect = () => {
    const panel = panelRef.current
    const wrap = panel?.parentElement
    if (!panel || !wrap) return undefined
    return { panel, wrap, current: rect ?? clampRect(panel.getBoundingClientRect(), wrap) }
  }

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button') || event.target.closest('.study-resize')) return
    const context = baseRect()
    if (!context) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: context.current.left,
      top: context.current.top,
      width: context.current.width,
      height: context.current.height,
      wrap: context.wrap,
      next: context.current,
    }
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const next = clampRect({
      left: drag.left + event.clientX - drag.startX,
      top: drag.top + event.clientY - drag.startY,
      width: drag.width,
      height: drag.height,
    }, drag.wrap)
    drag.next = next
    setRect(next)
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = undefined
    try { event.currentTarget.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
    saveRect(drag.next)
  }

  const startResize = (event, direction) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const context = baseRect()
    if (!context) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    resizeRef.current = {
      pointerId: event.pointerId,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      rect: context.current,
      wrap: context.wrap,
      next: context.current,
    }
  }

  const moveResize = (event) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const dx = event.clientX - resize.startX
    const dy = event.clientY - resize.startY
    const start = resize.rect
    const wrap = resize.wrap
    let left = start.left
    let top = start.top
    let width = start.width
    let height = start.height
    if (resize.direction.includes('e')) width = start.width + dx
    if (resize.direction.includes('w')) {
      width = start.width - dx
      left = start.left + dx
    }
    if (resize.direction.includes('s')) height = start.height + dy
    if (resize.direction.includes('n')) {
      height = start.height - dy
      top = start.top + dy
    }
    if (width < MIN_W) {
      if (resize.direction.includes('w')) left = start.left + start.width - MIN_W
      width = MIN_W
    }
    if (height < MIN_H) {
      if (resize.direction.includes('n')) top = start.top + start.height - MIN_H
      height = MIN_H
    }
    const next = clampRect({ left, top, width, height }, wrap)
    resize.next = next
    setRect(next)
  }

  const endResize = (event) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    resizeRef.current = undefined
    try { event.currentTarget.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
    saveRect(resize.next)
  }

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = Math.min(element.scrollHeight, 180) + 'px'
  }, [question, minimized])

  const onPaste = (event) => {
    const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'))
    if (!files.length) return
    event.preventDefault()
    onAttachFiles?.(files)
  }

  const onDrop = (event) => {
    const files = [...(event.dataTransfer?.files ?? [])]
    if (!files.length) return
    event.preventDefault()
    onAttachFiles?.(files)
  }

  const pickFiles = (event) => {
    const files = event.target.files
    if (files?.length) onAttachFiles?.(files)
    event.target.value = ''
  }

  const title = t('askTitle', { page: page ?? context?.page ?? '—' })

  if (minimized) {
    return (
      <button className="study-bubble" onClick={() => setMinimized(false)} title={t('restore')} aria-label={t('restore')}>
        <span aria-hidden="true">问</span>
      </button>
    )
  }

  return (
    <div
      ref={panelRef}
      className="study-panel"
      role="dialog"
      aria-label={t('panelTitle')}
      style={rect ?? { right: 12, bottom: 12, width: 420, height: 360 }}
    >
      <div
        className="study-panel-head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="study-panel-grip" aria-hidden="true">⠿</span>
        <span className="study-panel-title">{title}</span>
        <button className="study-btn" onClick={() => setMinimized(true)} aria-label={t('minimize')} title={t('minimize')}>—</button>
      </div>
      <div className="study-panel-body">
        {context?.image ? (
          <div className="study-shot-wrap">
            <img className="study-shot" src={context.image} alt="" />
            <button className="study-attach-remove study-shot-remove" type="button" onClick={onRemoveScreenshot} aria-label={t('remove')}>×</button>
          </div>
        ) : null}
        <div className="study-ask" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
          {attachments.length ? (
            <div className="study-attach-list">
              {attachments.map((attachment) => (
                <div className="study-attach-thumb" key={attachment.id}>
                  <img src={attachment.previewUrl} alt={attachment.name ?? ''} />
                  <button className="study-attach-remove" type="button" onClick={() => onRemoveAttachment?.(attachment.id)} aria-label={t('remove')}>×</button>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            className="study-ask-input"
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            onPaste={onPaste}
            placeholder={t('askPlaceholder')}
            rows={1}
            autoFocus
          />
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
          <div className="study-ask-actions">
            <button
              type="button"
              className="study-attach"
              onClick={() => fileRef.current?.click()}
              aria-label={t('attachImage')}
              title={t('attachImage')}
            >+</button>
            <button
              type="button"
              className="study-send"
              disabled={sending}
              onClick={onSend}
              aria-label={t('send')}
              title={t('send')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        {reply ? (
          <div className="study-answer" dangerouslySetInnerHTML={{ __html: renderMarkdown(reply) }} />
        ) : waiting ? (
          <div className="study-answer study-thinking">
            <span>{t('thinking')}</span>
            <span className="study-thinking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
          </div>
        ) : (
          <div className="study-answer">{t('askHint')}</div>
        )}
        {error ? <div className="study-error-detail">{error}</div> : null}
      </div>
      {HANDLES.map((direction) => (
        <div
          key={direction}
          className={'study-resize ' + direction}
          onPointerDown={(event) => startResize(event, direction)}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ))}
    </div>
  )
}
