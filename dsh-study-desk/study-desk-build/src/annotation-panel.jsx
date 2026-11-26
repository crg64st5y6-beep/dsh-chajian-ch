/** Floating annotation card: draggable, minimizable, composer-like question input. */
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

const OFFSET_KEY = 'study-desk:panel-offset'

function labelKind(kind, t) {
  return kind === 'region' ? t('kindRegion') : kind === 'note' ? t('kindNote') : t('kindHighlight')
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function readOffset() {
  try {
    const raw = localStorage.getItem(OFFSET_KEY)
    const value = raw ? JSON.parse(raw) : null
    if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) return { x: value.x, y: value.y }
  } catch { /* private mode */ }
  return { x: 0, y: 0 }
}

export function AnnotationPanel({
  t, pending, annotation, question, onQuestion, answer, saving, saveError,
  onHighlight, onAsk, onSaveOnly, onRemove, onClose, prefilled, canSend, onSend, onReask, onQuote,
}) {
  const panelRef = useRef(null)
  const dragRef = useRef(undefined)
  const [offset, setOffset] = useState(readOffset)
  const [minimized, setMinimized] = useState(false)
  const [copied, setCopied] = useState(false)
  const active = pending ?? annotation

  useEffect(() => { setMinimized(false) }, [pending, annotation?.id])
  useEffect(() => {
    const panel = panelRef.current
    const wrap = panel?.parentElement
    if (!panel || !wrap) return
    const box = panel.getBoundingClientRect()
    const parent = wrap.getBoundingClientRect()
    if (box.left < parent.left - 2 || box.top < parent.top - 2 || box.right > parent.right + 2 || box.bottom > parent.bottom + 2) {
      setOffset({ x: 0, y: 0 })
    }
  }, [])

  if (!active) return null

  const title = pending
    ? t('newAnnotation', { page: pending.page })
    : t('annotationTitle', { page: annotation.page, kind: labelKind(annotation.kind, t) })

  const startDrag = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return
    const panel = panelRef.current
    const wrap = panel?.parentElement
    if (!panel || !wrap) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      panel: panel.getBoundingClientRect(),
      wrap: wrap.getBoundingClientRect(),
      next: offset,
    }
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const minX = drag.offsetX + (drag.wrap.left + 8 - drag.panel.left)
    const maxX = drag.offsetX + (drag.wrap.right - 8 - drag.panel.right)
    const minY = drag.offsetY + (drag.wrap.top + 8 - drag.panel.top)
    const maxY = drag.offsetY + (drag.wrap.bottom - 8 - drag.panel.bottom)
    const next = {
      x: clamp(drag.offsetX + event.clientX - drag.startX, Math.min(minX, maxX), Math.max(minX, maxX)),
      y: clamp(drag.offsetY + event.clientY - drag.startY, Math.min(minY, maxY), Math.max(minY, maxY)),
    }
    drag.next = next
    setOffset(next)
  }

  const endDrag = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = undefined
    try { event.currentTarget.releasePointerCapture?.(event.pointerId) } catch { /* already released */ }
    try { localStorage.setItem(OFFSET_KEY, JSON.stringify(drag.next)) } catch { /* private mode */ }
  }

  const copyQuote = () => {
    if (!active.quote) return
    if (!navigator.clipboard?.writeText) { setCopied(false); return }
    navigator.clipboard.writeText(active.quote)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) return
    event.preventDefault()
    onAsk()
  }

  if (minimized) {
    return (
      <div className="study-panel-min">
        <button className="study-panel-min-main" onClick={() => setMinimized(false)} title={t('restore')}>
          <span className="study-panel-grip" aria-hidden="true">⠿</span>
          <span className="study-panel-title">{title}</span>
        </button>
        <button className="study-btn" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className="study-panel"
      role="dialog"
      aria-label={t('panelTitle')}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
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
        <button className="study-btn" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
      <div className="study-panel-body">
        {active.quote ? <blockquote className="study-quote">{active.quote}</blockquote> : null}
        {active.image ? <img className="study-shot" src={active.image} alt="" /> : null}
        {!pending && active.screenshot ? (
          <div className="study-shot-path">{t('screenshot')}: {active.screenshot}</div>
        ) : null}
        {pending ? (
          <>
            {pending.kind === 'selection' ? (
              <div className="study-secondary-actions">
                <button className="study-btn" onClick={onHighlight}>{t('highlight')}</button>
                <button className="study-btn" onClick={copyQuote}>{copied ? t('copied') : t('copyText')}</button>
                <button className="study-btn" onClick={() => onQuote(active.quote)}>{t('quoteText')}</button>
              </div>
            ) : null}
            <div className="study-ask">
              <textarea
                className="study-ask-input"
                value={question}
                onChange={(event) => onQuestion(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('questionPlaceholder')}
                rows={3}
              />
              <div className="study-ask-actions">
                <button className="study-btn study-primary" onClick={onAsk}>
                  {pending.kind === 'region' ? t('askImage') : t('askSelection')}
                </button>
                <button className="study-btn" onClick={onSaveOnly}>{t('saveOnly')}</button>
                <button className="study-btn" onClick={onClose}>{t('cancel')}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {annotation.question ? <div className="study-question-saved">{annotation.question}</div> : null}
            <div className="study-answer">
              {answer || t('waitingAnswer')}
            </div>
            {prefilled ? (
              <div className="study-prefilled">
                <span className="study-muted">{t('prefilledHint')}</span>
                <button className="study-btn study-primary" disabled={!canSend} onClick={onSend}>{t('sendToChat')}</button>
              </div>
            ) : null}
            <div className="study-panel-actions">
              <button className="study-btn" onClick={onReask}>{t('reask')}</button>
              <button className="study-btn" onClick={onRemove}>{t('remove')}</button>
              <button className="study-btn" onClick={onClose}>{t('close')}</button>
            </div>
          </>
        )}
        {saving ? <div className="study-muted">{t('saving')}</div> : null}
        {saveError ? <div className="study-error-detail">{saveError}</div> : null}
      </div>
    </div>
  )
}
