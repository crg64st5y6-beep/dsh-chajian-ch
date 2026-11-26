/** Annotation sidecar and local fallback for the study desk. */

const LOCAL = 'study-desk:annotations:'

function localKey(sessionId, pdf) {
  return LOCAL + sessionId + ':' + pdf
}

/** Read the browser fallback for one PDF. */
export function cachedAnnotations(sessionId, pdf) {
  try {
    const raw = localStorage.getItem(localKey(sessionId, pdf))
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

function cacheAnnotations(sessionId, pdf, annotations) {
  try { localStorage.setItem(localKey(sessionId, pdf), JSON.stringify(annotations)) } catch { /* private mode */ }
}

function base64(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * Load the sidecar next to the PDF; a missing or invalid sidecar falls back to
 * the browser copy so an unsaved session still shows its marks.
 */
export async function loadAnnotations(remote, sessionId, pdf, signal) {
  try {
    const outcome = await remote.workspaceFiles.read(sessionId, pdf + '.annotations.json', { offset: 1, limit: 4000 }, signal)
    if (outcome?.ok) {
      const data = JSON.parse(outcome.value.text)
      if (Array.isArray(data.annotations)) {
        cacheAnnotations(sessionId, pdf, data.annotations)
        return {
          annotations: data.annotations,
          classEndedAt: typeof data.classEndedAt === 'string' ? data.classEndedAt : undefined,
          annotatedPath: typeof data.annotatedPath === 'string' ? data.annotatedPath : undefined,
          originalPath: typeof data.originalPath === 'string' ? data.originalPath : undefined,
        }
      }
    }
  } catch { /* missing sidecar */ }
  return { annotations: cachedAnnotations(sessionId, pdf), classEndedAt: undefined, annotatedPath: undefined, originalPath: undefined }
}

/**
 * Persist through the Host save command; the browser copy is written first so a
 * command failure still preserves the marks in this session.
 */
export async function saveAnnotations(remote, sessionId, pdf, annotations, signal, image, deleteScreenshots) {
  cacheAnnotations(sessionId, pdf, annotations)
  if (typeof remote?.commands?.execute !== 'function') {
    throw new Error('学习台保存通道不可用：需要重载 DSH 让 Host 命令生效')
  }
  const payload = {
    pdf,
    annotations,
    ...(image ? { id: image.id } : {}),
    ...(Array.isArray(deleteScreenshots) && deleteScreenshots.length ? { deleteScreenshots } : {}),
  }
  const line = '/study-desk-save ' + base64(JSON.stringify(payload))
  const submitted = image
    ? [{ type: 'image', mediaType: 'image/png', data: image.data.split(',')[1], name: image.id + '.png' }]
    : []
  const outcome = await remote.commands.execute(sessionId, line, submitted, signal)
  if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('study-desk-save failed')
  const execution = outcome.value
  const result = execution?.result
  if (!result || result.kind !== 'success') throw new Error(result?.text ?? 'study-desk-save failed')
  return result.text
}

/** Restore the latest pre-class backup for one PDF (Host command). */
export async function restoreOriginal(remote, sessionId, pdf, signal) {
  if (typeof remote?.commands?.execute !== 'function') {
    throw new Error('学习台恢复通道不可用：需要重载 DSH 让 Host 命令生效')
  }
  const line = '/study-desk-restore ' + base64(JSON.stringify({ pdf }))
  const outcome = await remote.commands.execute(sessionId, line, [], signal)
  if (!outcome || outcome.ok !== true) throw outcome?.error ?? new Error('study-desk-restore failed')
  const result = outcome.value?.result
  if (!result || result.kind !== 'success') throw new Error(result?.text ?? 'study-desk-restore failed')
  return result.text
}
