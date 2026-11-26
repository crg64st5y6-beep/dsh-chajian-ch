/**
 * Host half of the study desk: persist annotations and screenshots next to the
 * PDF. The browser asks for this through the `study-desk-save` session command,
 * which is the sanctioned Client→Host write path.
 */
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'

export const inject = ['commands', 'attachments', 'workingDirectory']

const COMMAND = 'study-desk-save'
const RESTORE = 'study-desk-restore'
const HEIC = 'study-desk-heic'
const execFileAsync = promisify(execFile)

/** Reject paths that resolve outside the Session working directory. */
function inside(root, target) {
  return target === root || target.startsWith(root + path.sep)
}

/**
 * Decode the browser payload: base64 JSON with the PDF path and annotations.
 * @param raw - command text after the name.
 */
function decode(raw) {
  const text = raw.trim()
  if (!text) throw new Error('study-desk-save: missing payload')
  return JSON.parse(Buffer.from(text, 'base64').toString('utf8'))
}

/** Write the PNG bytes of one command attachment to the screenshots folder. */
async function writeAttachment(ctx, block, directory, id, signal) {
  const ref = block.attachment
  const hostPath = ctx.attachments.imageHostPath(ref)
  const data = hostPath !== undefined
    ? await readFile(hostPath)
    : (await ctx.attachments.readImage(ref, signal)).data
  await mkdir(directory, { recursive: true })
  const target = path.join(directory, `${id}.png`)
  await writeFile(target, data)
  return target
}

/**
 * Register the save command.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: COMMAND,
    description: 'Save study desk annotations and screenshots next to the PDF',
    recordInput: false,
    input: { hint: 'base64 annotation payload', attachments: true },
    handler: async ({ agent, rawInput, attachments, signal }) => {
      try {
        const payload = decode(rawInput)
        if (typeof payload?.pdf !== 'string' || payload.pdf.length === 0) {
          return { kind: 'error', text: 'study-desk-save: pdf path is required' }
        }
        const cwd = await ctx.workingDirectory.ensure(agent, signal)
        const pdf = path.resolve(cwd, payload.pdf)
        if (!inside(cwd, pdf)) {
          return { kind: 'error', text: 'study-desk-save: path is outside the Session workspace' }
        }
        const annotations = Array.isArray(payload.annotations) ? payload.annotations : []
        let screenshot
        const image = attachments.find((block) => block.type === 'image')
        if (image !== undefined) {
          const id = typeof payload.id === 'string' && payload.id.length > 0 ? payload.id : 'shot'
          const target = await writeAttachment(ctx, image, path.join(path.dirname(pdf), 'screenshots'), id, signal)
          screenshot = path.relative(cwd, target).split(path.sep).join('/')
          const annotation = annotations.find((entry) => entry?.id === id)
          if (annotation !== undefined) annotation.screenshot = screenshot
        }
        const sidecar = pdf + '.annotations.json'
        let previous
        try { previous = JSON.parse(await readFile(sidecar, 'utf8')) } catch { previous = undefined }
        const classEndedAt = typeof payload.classEndedAt === 'string' ? payload.classEndedAt : previous?.classEndedAt
        await writeFile(sidecar, JSON.stringify({
          version: 1,
          pdf: payload.pdf,
          annotations,
          ...(classEndedAt ? { classEndedAt } : {}),
        }, null, 2), 'utf8')
        const deletes = Array.isArray(payload.deleteScreenshots) ? payload.deleteScreenshots : []
        for (const entry of deletes) {
          if (typeof entry !== 'string' || entry.length === 0) continue
          const target = path.resolve(cwd, entry)
          if (!inside(cwd, target)) continue
          try { await rm(target, { force: true }) } catch { /* already gone */ }
        }
        return { kind: 'success', text: screenshot ?? path.relative(cwd, sidecar).split(path.sep).join('/') }
      } catch (error) {
        return { kind: 'error', text: 'study-desk-save: ' + (error instanceof Error ? error.message : String(error)) }
      }
    },
  }), 'study-desk: save command')

  ctx.effect(() => ctx.commands.register({
    name: RESTORE,
    description: 'Restore the pre-class PDF from the latest backup',
    recordInput: false,
    input: { hint: 'base64 {pdf}', attachments: false },
    handler: async ({ agent, rawInput, signal }) => {
      try {
        const payload = decode(rawInput)
        if (typeof payload?.pdf !== 'string' || payload.pdf.length === 0) {
          return { kind: 'error', text: 'study-desk-restore: pdf path is required' }
        }
        const cwd = await ctx.workingDirectory.ensure(agent, signal)
        const pdf = path.resolve(cwd, payload.pdf)
        if (!inside(cwd, pdf)) {
          return { kind: 'error', text: 'study-desk-restore: path is outside the Session workspace' }
        }
        const relative = path.relative(cwd, pdf)
        const root = path.join(cwd, '.study-desk', 'backups')
        let stamps = []
        try {
          stamps = (await readdir(root, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort()
            .reverse()
        } catch { stamps = [] }
        let restored
        for (const stamp of stamps) {
          const candidate = path.join(root, stamp, relative)
          try {
            const info = await stat(candidate)
            if (info.isFile()) { restored = candidate; break }
          } catch { /* no backup in this stamp */ }
        }
        if (restored === undefined) {
          return { kind: 'error', text: 'study-desk-restore: no backup found for this PDF' }
        }
        await copyFile(restored, pdf)
        const sidecar = pdf + '.annotations.json'
        try {
          const data = JSON.parse(await readFile(sidecar, 'utf8'))
          delete data.classEndedAt
          await writeFile(sidecar, JSON.stringify(data, null, 2), 'utf8')
        } catch { /* sidecar may be absent */ }
        return { kind: 'success', text: path.relative(cwd, restored).split(path.sep).join('/') }
      } catch (error) {
        return { kind: 'error', text: 'study-desk-restore: ' + (error instanceof Error ? error.message : String(error)) }
      }
    },
  }), 'study-desk: restore command')

  ctx.effect(() => ctx.commands.register({
    name: HEIC,
    description: 'Convert an uploaded HEIC photo to JPEG',
    recordInput: false,
    input: { hint: 'base64 {name,data}', attachments: false },
    handler: async ({ agent, rawInput, signal }) => {
      try {
        const payload = decode(rawInput)
        if (typeof payload?.data !== 'string' || payload.data.length === 0) {
          return { kind: 'error', text: 'study-desk-heic: image data is required' }
        }
        const cwd = await ctx.workingDirectory.ensure(agent, signal)
        const dir = path.join(cwd, '.study-desk', 'phone')
        await mkdir(dir, { recursive: true })
        const id = randomUUID()
        const source = path.join(dir, id + '.heic')
        const target = path.join(dir, id + '.jpg')
        await writeFile(source, Buffer.from(payload.data, 'base64'))
        try {
          await execFileAsync('sips', ['-s', 'format', 'jpeg', source, '--out', target])
        } finally {
          try { await rm(source, { force: true }) } catch { /* already gone */ }
        }
        return { kind: 'success', text: path.relative(cwd, target).split(path.sep).join('/') }
      } catch (error) {
        return { kind: 'error', text: 'study-desk-heic: ' + (error instanceof Error ? error.message : String(error)) }
      }
    },
  }), 'study-desk: heic command')
}
