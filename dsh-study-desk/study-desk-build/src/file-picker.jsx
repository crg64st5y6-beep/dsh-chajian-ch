/** Flat, searchable picker for importing workspace PDFs into the study desk. */
import * as React from 'react'
import { useEffect, useState } from 'react'

function basename(path) {
  return path.split('/').pop() ?? path
}

function describe(value) {
  if (!value) return ''
  const code = value.code ? String(value.code) : ''
  const message = value.message ? String(value.message) : ''
  return [code, message].filter(Boolean).join(': ') || String(value)
}

/** One modal listing workspace PDFs, with a name/path filter. */
export function FilePicker({ remote, sessionId, t, imports, onAdd, onClose }) {
  const [all, setAll] = useState(undefined)
  const [error, setError] = useState(undefined)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(undefined)

  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    setAll(undefined)
    setError(undefined)
    ;(async () => {
      try {
        const outcome = await remote.workspaceFiles.search(sessionId, {
          query: '.pdf',
          excludedPaths: ['node_modules', 'study-desk-build'],
          includeHidden: false,
          respectGitignore: true,
        }, controller.signal)
        if (!alive) return
        if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('workspace search failed')
        const files = (outcome.value.matches ?? [])
          .filter((match) => match.type === 'file' && /\.pdf$/i.test(match.path))
          .map((match) => ({ path: match.path, name: basename(match.path) }))
        setAll(files)
      } catch (failure) {
        if (alive && !controller.signal.aborted) {
          setError(failure)
          setAll([])
        }
      }
    })()
    return () => { alive = false; controller.abort() }
  }, [remote, sessionId])

  const imported = new Set(imports.map((file) => file.path))
  const needle = query.trim().toLowerCase()
  const visible = (all ?? []).filter((file) => !needle || file.path.toLowerCase().includes(needle))

  const choose = () => {
    if (!selected) return
    onAdd(selected.path, selected.name)
  }

  return (
    <div className="study-modal" onClick={onClose}>
      <div className="study-modal-card" role="dialog" aria-modal="true" aria-label={t('importTitle')} onClick={(event) => event.stopPropagation()}>
        <div className="study-modal-head">
          <span>{t('importTitle')}</span>
          <button className="study-btn" onClick={onClose} aria-label={t('cancel')}>×</button>
        </div>
        <div className="study-path">
          <input
            className="study-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('importFilter')}
            aria-label={t('importFilter')}
          />
        </div>
        <div className="study-list">
          {error ? (
            <div className="study-status study-error">
              <span>{t('importSearchFailed')}</span>
              <span className="study-error-detail">{describe(error)}</span>
            </div>
          ) : all === undefined ? (
            <div className="study-status">{t('loading')}</div>
          ) : visible.length === 0 ? (
            <div className="study-status">
              <span>{t('pickerEmpty')}</span>
              <span className="study-error-detail">{t('pickerHint')}</span>
            </div>
          ) : visible.map((file) => (
            <button
              key={file.path}
              className="study-row"
              aria-selected={selected?.path === file.path}
              onClick={() => setSelected(file)}
              onDoubleClick={() => onAdd(file.path, file.name)}
            >
              <span aria-hidden="true">▤</span>
              <span className="study-row-name">{file.name}</span>
              <span className="study-row-path">{file.path}</span>
              {imported.has(file.path) ? <span className="study-tag">{t('importedTag')}</span> : null}
            </button>
          ))}
        </div>
        <div className="study-modal-foot">
          <span className="study-path-label" title={selected?.path ?? ''}>{selected?.path ?? t('noSelection')}</span>
          <button className="study-btn" disabled={!selected} onClick={choose}>{t('add')}</button>
          <button className="study-btn" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}
