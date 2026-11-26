/**
 * Full-page PDF rendering for the study desk: pages, text layer, annotations,
 * and region capture. The worker plumbing follows the shipped right-Sidebar PDF
 * preview (Apache-2.0, pdf.js): a module Worker is created from the bundled
 * worker source with an explicit ready handshake, then handed to PDF.js as a
 * worker port. The text layer is PDF.js's own TextLayerBuilder.
 */
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { getDocument, PDFWorker } from 'pdfjs-dist'
import { TextLayerBuilder } from 'pdfjs-dist/web/pdf_viewer.mjs'
import workerSource from './worker-source.js'

const WORKER_READY = 'dsh-study-desk-pdf-ready'

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

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function clamp(value) {
  return Math.min(1, Math.max(0, value))
}

function openPdf(data, signal, reportFailure) {
  const lifetime = new AbortController()
  const stopped = linkedSignal(signal, lifetime.signal)
  const failed = deferred()
  const broken = deferred()
  let url
  let worker
  let bridge
  let loading
  let closing
  let removeReady
  let removeAbort

  const workerFailed = (event) => {
    const error = new Error('PDF worker failed' + (event?.message ? ': ' + event.message : ''))
    failed.reject(error)
    broken.resolve(undefined)
    try { if (!stopped.aborted) reportFailure(error) } catch (failure) { console.warn('study-desk: failure callback threw', failure) }
    finally { void dispose() }
  }
  const aborted = () => { failed.reject(stopped.reason); void dispose() }

  const dispose = () => {
    if (closing !== undefined) return closing
    closing = Promise.resolve().then(async () => {
      try {
        if (loading !== undefined) await Promise.race([loading.destroy(), broken.promise])
      } finally {
        removeReady?.()
        removeAbort?.()
        bridge?.destroy()
        worker?.removeEventListener('error', workerFailed)
        worker?.removeEventListener('messageerror', workerFailed)
        worker?.terminate()
        if (url !== undefined) URL.revokeObjectURL(url)
      }
    }).catch((error) => { console.warn('study-desk: pdf cleanup failed', error) })
    lifetime.abort()
    return closing
  }

  const initialize = async () => {
    stopped.throwIfAborted()
    const bytes = data.slice()
    url = URL.createObjectURL(new Blob([
      workerSource,
      '\nself.postMessage({type:' + JSON.stringify(WORKER_READY) + '});\n',
    ], { type: 'text/javascript' }))
    worker = new Worker(url, { type: 'module', name: 'study-desk-pdf' })
    worker.addEventListener('error', workerFailed)
    worker.addEventListener('messageerror', workerFailed)
    const started = deferred()
    const ready = (event) => {
      if (typeof event.data !== 'object' || event.data === null) return
      if (event.data.type !== WORKER_READY) return
      started.resolve(undefined)
    }
    worker.addEventListener('message', ready)
    removeReady = () => worker.removeEventListener('message', ready)
    removeAbort = () => stopped.removeEventListener('abort', aborted)
    stopped.addEventListener('abort', aborted, { once: true })
    await Promise.race([started.promise, failed.promise])
    removeReady()
    stopped.throwIfAborted()
    bridge = PDFWorker.create({ port: worker })
    loading = getDocument({
      data: bytes,
      worker: bridge,
      cMapPacked: true,
      useWorkerFetch: false,
      enableXfa: false,
      stopAtErrors: false,
      isEvalSupported: false,
    })
    return loading.promise
  }

  const document = Promise.race([initialize(), failed.promise]).catch(async (error) => {
    await dispose()
    throw error
  })
  return { document, dispose }
}

function markStyle(rect) {
  return {
    left: rect.x * 100 + '%',
    top: rect.y * 100 + '%',
    width: rect.w * 100 + '%',
    height: rect.h * 100 + '%',
  }
}

function PdfPage({
  doc, number, width, signal, t, annotations = [], activeId, mode = 'none',
  onSelect, onRegion, onOpen,
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const textRef = useRef(null)
  const chain = useRef(Promise.resolve())
  const generation = useRef(0)
  const [state, setState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const [drag, setDrag] = useState(null)

  useEffect(() => {
    if (!doc || !(width > 0)) return undefined
    const controller = new AbortController()
    const stopped = linkedSignal(signal, controller.signal)
    const gen = ++generation.current
    let alive = true
    let page
    let task
    let layer
    let observer
    setState('loading')

    const run = async () => {
      await chain.current.catch(() => {})
      if (!alive || stopped.aborted || gen !== generation.current) return
      page = await doc.getPage(number)
      if (!alive || stopped.aborted) return
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: width / base.width })
      const canvas = canvasRef.current
      const host = textRef.current
      const wrap = wrapRef.current
      if (!canvas || !host || !wrap) return
      const budget = Math.sqrt(16_777_216 / (viewport.width * viewport.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2, budget)
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr))
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr))
      canvas.style.width = viewport.width + 'px'
      canvas.style.height = viewport.height + 'px'
      wrap.style.width = viewport.width + 'px'
      task = page.render({
        canvas,
        viewport,
        transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
      })
      host.replaceChildren()
      layer = new TextLayerBuilder({
        pdfPage: page,
        onAppend: () => {
          if (!alive || stopped.aborted) { layer.cancel(); return }
          host.append(layer.div)
        },
      })
      const container = layer.div
      container.style.setProperty('--total-scale-factor', String(viewport.scale * viewport.userUnit))
      container.style.setProperty('--scale-round-x', '1px')
      container.style.setProperty('--scale-round-y', '1px')
      const resize = () => {
        container.style.scale = String(host.getBoundingClientRect().width / viewport.width)
      }
      observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      const rendered = Promise.all([task.promise, layer.render({ viewport })])
      chain.current = rendered.catch(() => {})
      await rendered
      if (alive && !stopped.aborted && gen === generation.current) setState('ready')
    }

    run().catch((error) => {
      if (alive && !stopped.aborted && gen === generation.current) {
        console.warn('study-desk: page render failed', error)
        setState('failed')
      }
    })

    return () => {
      alive = false
      controller.abort()
      try { task?.cancel() } catch {}
      try { layer?.cancel() } catch {}
      observer?.disconnect()
    }
  }, [doc, number, width, signal, attempt])

  const pointOf = (event) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) }
  }

  const handleSelection = () => {
    if (mode !== 'none') return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
    const host = textRef.current
    const wrap = wrapRef.current
    if (!host || !wrap) return
    if (!host.contains(selection.anchorNode) && !host.contains(selection.focusNode)) return
    const quote = selection.toString().trim()
    if (!quote) return
    const pageRect = wrap.getBoundingClientRect()
    const rects = []
    for (const range of Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))) {
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue
        const x = (rect.left - pageRect.left) / pageRect.width
        const y = (rect.top - pageRect.top) / pageRect.height
        const w = rect.width / pageRect.width
        const h = rect.height / pageRect.height
        if (x < -0.02 || y < -0.02 || x + w > 1.02 || y + h > 1.02) continue
        rects.push({ x: clamp(x), y: clamp(y), w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) })
      }
    }
    if (rects.length === 0) return
    onSelect?.({ page: number, rects, quote: quote.slice(0, 1200) })
  }

  const pointerDown = (event) => {
    if (mode !== 'region') return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const point = pointOf(event)
    setDrag({ start: point, current: point })
  }

  const pointerMove = (event) => {
    if (mode !== 'region' || !drag) return
    setDrag({ start: drag.start, current: pointOf(event) })
  }

  const pointerUp = (event) => {
    if (mode !== 'region' || !drag) return
    const end = pointOf(event)
    const x = Math.min(drag.start.x, end.x)
    const y = Math.min(drag.start.y, end.y)
    const w = Math.abs(drag.start.x - end.x)
    const h = Math.abs(drag.start.y - end.y)
    setDrag(null)
    if (w < 0.01 || h < 0.01) {
      onMode?.('none')
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const sx = Math.max(0, Math.floor(x * canvas.width))
    const sy = Math.max(0, Math.floor(y * canvas.height))
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.floor(w * canvas.width)))
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.floor(h * canvas.height)))
    const crop = document.createElement('canvas')
    crop.width = sw
    crop.height = sh
    crop.getContext('2d')?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
    onRegion?.({ page: number, rect: { x, y, w, h }, image: crop.toDataURL('image/png') })
  }

  const dragRect = drag === null ? null : {
    x: Math.min(drag.start.x, drag.current.x),
    y: Math.min(drag.start.y, drag.current.y),
    w: Math.abs(drag.start.x - drag.current.x),
    h: Math.abs(drag.start.y - drag.current.y),
  }

  return (
    <div ref={wrapRef} className="study-page" style={width > 0 ? { width: width + 'px' } : undefined} onMouseUp={handleSelection}>
      <canvas ref={canvasRef} className="study-canvas" />
      <div ref={textRef} className="study-text" />
      <div className="study-marks">
        {annotations.map((annotation) => (annotation.rects ?? []).map((rect, index) => (
          <div
            key={annotation.id + ':' + index}
            className={'study-mark ' + annotation.kind + (annotation.id === activeId ? ' active' : '')}
            style={markStyle(rect)}
            onClick={() => onOpen?.(annotation.id)}
            role="button"
            tabIndex={-1}
            title={annotation.question || t('kindHighlight')}
          />
        )))}
      </div>
      {mode !== 'none' ? (
        <div
          className={'study-capture ' + mode}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { setDrag(null); onMode?.('none') }}
        >
          {dragRect ? <div className="study-drag" style={markStyle(dragRect)} /> : null}
        </div>
      ) : null}
      {state !== 'ready' ? (
        <div className={'study-page-veil' + (state === 'failed' ? ' study-page-error' : '')}>
          <span>{state === 'failed' ? t('pageFailed') : t('rendering')}</span>
          {state === 'failed' ? (
            <button className="study-btn" onClick={() => setAttempt((value) => value + 1)}>{t('retryPage')}</button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** One full-page PDF reader: toolbar, page scroll, text layer, annotations. */
export function PdfReader({
  data, signal, t, onBack, title, annotations = [], activeId, mode = 'none',
  onMode, onSelect, onRegion, onOpen, onPage, endStatus = 'disabled', onEndClass, originalPath, annotatedPath, selected, onSwitchVersion, onRegenerate,
}) {
  const [doc, setDoc] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [attempt, setAttempt] = useState(0)
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [page, setPage] = useState(1)
  const scrollRef = useRef(null)
  const pageRefs = useRef([])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const stopped = linkedSignal(signal, controller.signal)
    setDoc(undefined)
    setError(undefined)
    const session = openPdf(data, stopped, (event) => {
      if (alive && !stopped.aborted) setError(event)
    })
    session.document.then(
      (next) => { if (alive && !stopped.aborted) setDoc(next) },
      (failure) => { if (alive && !stopped.aborted) setError(failure) },
    )
    return () => {
      alive = false
      controller.abort()
      void session.dispose()
    }
  }, [data, signal, attempt])

  useEffect(() => {
    const host = scrollRef.current
    if (!host) return undefined
    const update = () => setWidth(host.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => { setPage(1); pageRefs.current = [] }, [doc])
  useEffect(() => { onPage?.(page) }, [onPage, page])

  const total = doc?.numPages ?? 0
  const pageWidth = width > 0 ? Math.max(200, (width - 32) * zoom) : 0
  const errorText = error
    ? [error.name ? String(error.name) : '', error.message ? String(error.message) : ''].filter(Boolean).join(': ') || String(error)
    : ''

  const goTo = (target) => {
    if (!total) return
    const next = Math.min(Math.max(1, target), total)
    setPage(next)
    const host = scrollRef.current
    const element = pageRefs.current[next - 1]
    if (host && element) host.scrollTo({ top: Math.max(0, element.offsetTop - 8), behavior: 'auto' })
  }

  const onScroll = () => {
    const host = scrollRef.current
    if (!host) return
    const anchor = host.getBoundingClientRect().top + 10
    let best = 1
    let distance = Infinity
    pageRefs.current.forEach((element, index) => {
      if (!element) return
      const delta = Math.abs(element.getBoundingClientRect().top - anchor)
      if (delta < distance) { distance = delta; best = index + 1 }
    })
    setPage((current) => (current === best ? current : best))
  }

  const byPage = (number) => annotations.filter((annotation) => annotation.page === number)

  return (
    <div className="study-reader">
      <div className="study-toolbar">
        {onBack ? <button className="study-btn" onClick={onBack} aria-label={t('backToMaterials')} title={t('backToMaterials')}>‹</button> : null}
        <span className="study-file-title" title={title ?? ''}>{title ? title.split('/').pop() : ''}</span>
        <div className="study-group">
          <button className={'study-btn' + (mode === 'region' ? ' active' : '')} onClick={() => onMode?.(mode === 'region' ? 'none' : 'region')} title={t('regionMode')}>{t('regionMode')}</button>
        </div>
        <div className="study-group">
          <button className="study-btn" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label={t('previous')}>‹</button>
          <span className="study-pageinfo">{total ? t('page', { page, total }) : '…'}</span>
          <button className="study-btn" disabled={!total || page >= total} onClick={() => goTo(page + 1)} aria-label={t('next')}>›</button>
        </div>
        <div className="study-group study-right">
          <button className="study-btn" onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 100) / 100))} aria-label={t('zoomOut')}>−</button>
          <span className="study-zoom">{Math.round(zoom * 100)}%</span>
          <button className="study-btn" onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.1) * 100) / 100))} aria-label={t('zoomIn')}>＋</button>
          <button className="study-btn" onClick={() => setZoom(1)}>{t('fitWidth')}</button>
        </div>
        {originalPath && annotatedPath ? (
          <div className="study-version-toggle">
            <button className={selected === originalPath ? 'active' : ''} onClick={() => onSwitchVersion(originalPath)}>{t('versionOriginal')}</button>
            <button className={selected === annotatedPath ? 'active' : ''} onClick={() => onSwitchVersion(annotatedPath)}>{t('versionAnnotated')}</button>
          </div>
        ) : null}
        <div className="study-end-wrap">
          <button
            className={'study-end-btn ' + endStatus}
            disabled={endStatus === 'disabled' || endStatus === 'ending'}
            onClick={onEndClass}
            title={endStatus === 'disabled' ? t('endClassDisabled') : endStatus === 'ended' ? t('endedClass') : t('endClass')}
          >
            <span className="study-end-icon" aria-hidden="true">
              {endStatus === 'ending' ? <span className="study-spinner" /> : endStatus === 'ended' ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.4 6.6 11.5 12.8 4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 14V2.8M4.3 3.2h7.2L9.7 5.8l1.8 2.5H4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <span>{endStatus === 'ending' ? t('endingClass') : endStatus === 'ended' ? t('endedClass') : t('endClass')}</span>
          </button>
          {endStatus === 'ended' ? (
            <button className="study-restore-btn" onClick={onRegenerate} title={t('regenerate')}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.2 6.1A5 5 0 1 1 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M3.2 3.2v3.1h3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{t('regenerate')}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="study-scroll" ref={scrollRef} onScroll={onScroll}>
        {doc ? Array.from({ length: total }, (_, index) => (
          <div
            className="study-page-slot"
            key={index}
            ref={(element) => { pageRefs.current[index] = element }}
          >
            <PdfPage
              doc={doc}
              number={index + 1}
              width={pageWidth}
              signal={signal}
              t={t}
              annotations={byPage(index + 1)}
              activeId={activeId}
              mode={mode}
              onSelect={onSelect}
              onRegion={onRegion}
              onOpen={onOpen}
            />
          </div>
        )) : error ? (
          <div className="study-status study-error">
            <span>{t('openFailed')}</span>
            <span className="study-error-detail">{errorText}</span>
            <button className="study-btn" onClick={() => setAttempt((value) => value + 1)}>{t('retry')}</button>
          </div>
        ) : (
          <div className="study-status">{t('loading')}</div>
        )}
      </div>
    </div>
  )
}
