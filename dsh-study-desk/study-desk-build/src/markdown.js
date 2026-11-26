/** Markdown + LaTeX rendering for the ask panel reply. */
import katex from 'katex'
import { marked } from 'marked'

const PLACEHOLDER = /MATH_PLACEHOLDER_(\d+)_END/g

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMath(expression, displayMode) {
  try {
    return katex.renderToString(expression.trim(), {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
    })
  } catch {
    return escapeHtml((displayMode ? '$$' : '$') + expression + (displayMode ? '$$' : '$'))
  }
}

/** Render assistant Markdown; $...$ / $$...$$ / \(...\) / \[...\] become KaTeX. */
export function renderMarkdown(text) {
  const math = []
  const stash = (expression, displayMode) => {
    math.push(renderMath(expression, displayMode))
    return 'MATH_PLACEHOLDER_' + (math.length - 1) + '_END'
  }
  let source = String(text ?? '')
  source = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expression) => stash(expression, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expression) => stash(expression, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expression) => stash(expression, false))
    .replace(/\$([^$\n]+?)\$/g, (_, expression) => stash(expression, false))
  // Assistant output is data: drop raw HTML before Markdown parsing.
  source = source.replace(/</g, '&lt;')
  const html = marked.parse(source, { gfm: true, breaks: true })
  return html.replace(PLACEHOLDER, (_, index) => math[Number(index)] ?? '')
}
