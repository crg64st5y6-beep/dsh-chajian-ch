/** Suggest safe blank bands for end-class notes (avoids covering text). */
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const pdf = process.argv[2]
if (!pdf) {
  console.error('usage: node end-class-layout.mjs <pdf>')
  process.exit(1)
}
const data = new Uint8Array(await readFile(pdf))
const doc = await getDocument({ data }).promise
const pages = []
for (let number = 1; number <= doc.numPages; number += 1) {
  const page = await doc.getPage(number)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const W = viewport.width
  const H = viewport.height
  const boxes = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const t = item.transform
    const h = item.height || 10
    const w = item.width || 0
    if (w <= 0) continue
    boxes.push({
      x: t[4] / W,
      y: 1 - (t[5] + h) / H,
      w: w / W,
      h: h / H,
    })
  }
  const contentBoxes = boxes.filter((box) => box.y > 0.06 && box.y + box.h < 0.93)
  const lowest = contentBoxes.reduce((max, b) => Math.max(max, b.y + b.h), 0.04)
  const highest = contentBoxes.reduce((min, b) => Math.min(min, b.y), 0.96)
  const rightmost = contentBoxes.reduce((max, b) => Math.max(max, b.x + b.w), 0.04)
  const leftmost = contentBoxes.reduce((min, b) => Math.min(min, b.x), 0.96)
  const free = []
  if (lowest < 0.92) free.push({ x: 0.04, y: Math.min(0.92, lowest + 0.01), w: 0.92, h: Math.max(0, Math.min(0.92, 0.93) - Math.min(0.92, lowest + 0.01)) })
  if (highest > 0.08) free.push({ x: 0.04, y: 0.04, w: 0.92, h: highest - 0.04 })
  if (rightmost < 0.94) free.push({ x: Math.min(0.94, rightmost + 0.01), y: 0.04, w: 0.94 - Math.min(0.94, rightmost + 0.01), h: 0.88 })
  if (leftmost > 0.06) free.push({ x: 0.04, y: 0.04, w: leftmost - 0.04, h: 0.88 })

  // Grid scan for internal blank areas (finds gaps the outer bands miss).
  const step = 8
  const cols = Math.ceil(W / step)
  const rows = Math.ceil(H / step)
  const occupied = Array.from({ length: rows }, () => new Uint8Array(cols))
  for (const box of boxes) {
    const x0 = Math.max(0, Math.floor((box.x * W - 2) / step))
    const y0 = Math.max(0, Math.floor((box.y * H - 2) / step))
    const x1 = Math.min(cols - 1, Math.ceil((box.x * W + box.w * W + 2) / step))
    const y1 = Math.min(rows - 1, Math.ceil((box.y * H + box.h * H + 2) / step))
    for (let gy = y0; gy <= y1; gy += 1) for (let gx = x0; gx <= x1; gx += 1) occupied[gy][gx] = 1
  }
  const grid = []
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      if (occupied[gy][gx]) continue
      let run = 0
      while (gx + run < cols && !occupied[gy][gx + run]) run += 1
      let height = 0
      let fits = true
      while (gy + height < rows && fits) {
        for (let i = 0; i < run; i += 1) {
          if (occupied[gy + height][gx + i]) { fits = false; break }
        }
        if (fits) height += 1
      }
      const widthPt = Math.floor(run * step / 2) * 2
      const heightPt = Math.floor(height * step / 2) * 2
      if (widthPt >= 150 && heightPt >= 48) {
        grid.push({
          x: (gx * step) / W,
          y: (gy * step) / H,
          w: widthPt / W,
          h: heightPt / H,
          widthPt,
          heightPt,
          source: 'grid',
        })
      }
    }
  }
  grid.sort((a, b) => (b.widthPt * b.heightPt) - (a.widthPt * a.heightPt))
  free.push(...grid.slice(0, 6).map((rect) => ({ ...rect })))
  pages.push({
    page: number,
    width: W,
    height: H,
    lowest: Number(lowest.toFixed(3)),
    highest: Number(highest.toFixed(3)),
    rightmost: Number(rightmost.toFixed(3)),
    leftmost: Number(leftmost.toFixed(3)),
    free: free
      .filter((rect) => rect.w > 0.12 && rect.h > 0.03)
      .map((rect) => ({
        x: Number(rect.x.toFixed(3)),
        y: Number(rect.y.toFixed(3)),
        w: Number(rect.w.toFixed(3)),
        h: Number(rect.h.toFixed(3)),
        widthPt: Math.round(rect.w * W),
        heightPt: Math.round(rect.h * H),
      })),
  })
}
console.log(JSON.stringify({ pdf, pages }, null, 2))
