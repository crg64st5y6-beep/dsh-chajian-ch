/**
 * Build the study-desk client module.
 *
 * PDF.js and its worker are bundled into the single client module the profile
 * serves; React stays external and resolves from the browser module table.
 */
import { build } from 'esbuild'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(here, '..', 'study-desk')

const worker = await readFile(path.join(here, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), 'utf8')
await writeFile(
  path.join(here, 'src/worker-source.js'),
  'export default ' + JSON.stringify(worker) + '\n',
)

const result = await build({
  entryPoints: [path.join(here, 'src/factory.jsx')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120'],
  external: ['react'],
  write: false,
  minify: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
})

const code = result.outputFiles[0].text
const wrapper = `window.__ModuleLoader__.load({
  id: '@local/study-desk',
  factory(require) {
    var module = { exports: {} };
    (function(module, exports, require) {
${code}
    })(module, module.exports, require);
    return module.exports;
  },
});
`
await writeFile(path.join(pluginDir, 'client.js'), wrapper)
console.log('client.js', (wrapper.length / 1024).toFixed(0) + ' KiB')
