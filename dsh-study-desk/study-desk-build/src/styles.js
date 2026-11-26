/** Component-scoped styles for the study desk and the PDF.js text layer. */
export const CSS = `
.study-desk-root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
}
.study-bar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  min-width: 0;
}
.study-brand {
  flex: none;
  font-weight: 600;
  letter-spacing: .02em;
  white-space: nowrap;
}
.study-spacer { flex: 1 1 auto; min-width: 4px; }
.study-select {
  min-width: 0;
  max-width: 46%;
  padding: 3px 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
}
.study-muted { color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.study-btn {
  flex: none;
  padding: 3px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  line-height: 1.5;
  cursor: pointer;
}
.study-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.study-btn:disabled { opacity: .45; cursor: default; }
.study-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.study-reader {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.study-reader-wrap {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.study-toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-base);
}
.study-group { display: flex; align-items: center; gap: 4px; }
.study-group.study-right { margin-left: auto; }
.study-pageinfo {
  min-width: 84px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.study-zoom {
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}
.study-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background: var(--dsw-alias-bg-layer-2);
  overscroll-behavior: contain;
}
.study-center { display: flex; align-items: center; justify-content: center; }
.study-page-slot {
  display: flex;
  justify-content: flex-start;
  margin: 0 0 14px;
}
.study-page {
  position: relative;
  margin: 0 auto;
  background: var(--dsw-alias-bg-document-preview, #ffffff);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent),
    0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
}
.study-canvas { display: block; max-width: none; height: auto; }
.study-text { position: absolute; inset: 0; overflow: clip; z-index: 2; }
.study-text .textLayer {
  position: absolute;
  inset: 0;
  overflow: clip;
  text-align: initial;
  line-height: 1;
  letter-spacing: normal;
  word-spacing: normal;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  caret-color: CanvasText;
  z-index: 0;
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}
.study-text .textLayer[data-main-rotation="90"] { transform: rotate(90deg) translateY(-100%); }
.study-text .textLayer[data-main-rotation="180"] { transform: rotate(180deg) translate(-100%, -100%); }
.study-text .textLayer[data-main-rotation="270"] { transform: rotate(270deg) translateX(-100%); }
.study-text .textLayer :is(span, br) {
  position: absolute;
  color: transparent;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  user-select: text;
}
.study-text .textLayer > :not(.markedContent),
.study-text .textLayer .markedContent span:not(.markedContent) {
  z-index: 1;
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}
.study-text .markedContent { display: contents; }
.study-text .textLayer ::selection {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  color: transparent;
}
.study-text .textLayer br::selection { background: transparent; }
.study-text .textLayer .endOfContent {
  display: block;
  position: absolute;
  inset: 100% 0 0;
  z-index: 0;
  cursor: default;
  user-select: none;
}
.study-text .textLayer.selecting .endOfContent { top: 0; }
.study-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.study-error { color: var(--dsw-alias-state-error-primary); }
.study-error-detail {
  flex-basis: 100%;
  max-width: 86%;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  opacity: .85;
}
.study-page-veil {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 58%, transparent);
}
.study-page-veil.study-page-error { color: var(--dsw-alias-state-error-primary); }
.study-marks {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.study-mark {
  position: absolute;
  border-radius: 2px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent);
  pointer-events: auto;
  cursor: pointer;
}
.study-mark.region {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
  outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent);
}
.study-mark.active { outline: 2px solid var(--dsw-alias-brand-primary); }
.study-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  padding: 0;
  border: 2px solid var(--dsw-alias-bg-base);
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  color: #fff;
  font: 12px/1 sans-serif;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);
}
.study-pin::after { content: '●'; }
.study-pin.active { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.study-region-pin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-brand-primary);
  font: 12px/1 sans-serif;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
}
.study-region-pin.active { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.study-capture {
  position: absolute;
  inset: 0;
  z-index: 4;
  touch-action: none;
}
.study-capture.region { cursor: crosshair; }
.study-capture.note { cursor: copy; }
.study-drag {
  position: absolute;
  border: 1.5px dashed var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.study-btn.active {
  border-color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
}
.study-panel {
  position: absolute;
  z-index: 50;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 16px 44px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
}
.study-panel-head {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: 13px;
  font-weight: 600;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.study-panel-head:active { cursor: grabbing; }
.study-panel-grip {
  flex: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 1;
}
.study-panel-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.study-panel-head .study-btn { margin-left: auto; }
.study-panel-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
}
.study-quote {
  max-height: 140px;
  margin: 0;
  padding: 6px 8px;
  overflow: auto;
  border-left: 3px solid var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-bg-layer-2);
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.study-shot {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  align-self: flex-start;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
}
.study-shot-path {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  word-break: break-all;
}
.study-question {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 7px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
}
.study-question-saved { font-size: 13px; font-weight: 600; white-space: pre-wrap; }
.study-panel-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.study-answer {
  flex: 1 1 auto;
  min-height: 80px;
  max-height: none;
  overflow: auto;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-size: 13.5px;
  line-height: 1.7;
  white-space: normal;
}
.study-answer p { margin: 0 0 6px; }
.study-answer p:last-child { margin-bottom: 0; }
.study-answer ul, .study-answer ol { margin: 0 0 6px; padding-left: 20px; }
.study-answer li { margin: 2px 0; }
.study-answer h1, .study-answer h2, .study-answer h3, .study-answer h4 {
  margin: 8px 0 4px;
  font-size: 14px;
  line-height: 1.4;
}
.study-answer strong { font-weight: 600; }
.study-answer code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px;
}
.study-answer pre {
  margin: 6px 0;
  padding: 8px;
  overflow: auto;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
}
.study-answer pre code { padding: 0; background: none; }
.study-answer blockquote {
  margin: 6px 0;
  padding-left: 8px;
  border-left: 3px solid var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-secondary);
}
.study-answer .katex { font-size: 1.05em; }
.study-answer .katex-display { margin: 6px 0; overflow-x: auto; overflow-y: hidden; }
.study-thinking { display: flex; align-items: center; gap: 2px; color: var(--dsw-alias-label-secondary); }
.study-thinking-dots span { animation: study-thinking 1.2s infinite; }
.study-thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.study-thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes study-thinking {
  0%, 60%, 100% { opacity: 0.25; }
  30% { opacity: 1; }
}
.study-prefilled {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent);
  font-size: 12px;
}
.study-primary {
  border-color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
}
.study-ask {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
.study-ask:focus-within { border-color: var(--dsw-alias-brand-primary); }
.study-ask-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 0;
  max-height: 180px;
  resize: none;
  overflow-y: auto;
  padding: 4px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
}
.study-ask-actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; }
.study-attach {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: 16px/1 sans-serif;
  cursor: pointer;
}
.study-attach:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.study-attach-list { display: flex; flex-wrap: wrap; gap: 6px; }
.study-attach-thumb {
  position: relative;
  width: 54px;
  height: 54px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
}
.study-attach-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.study-attach-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font: 11px/16px sans-serif;
  cursor: pointer;
}
.study-shot-wrap { position: relative; }
.study-shot-remove { top: 6px; right: 6px; width: 20px; height: 20px; font: 13px/20px sans-serif; }
.study-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  color: #fff;
  cursor: pointer;
}
.study-send:hover { filter: brightness(1.06); }
.study-send:disabled { opacity: 0.45; cursor: default; filter: none; }
.study-secondary-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.study-panel-min {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100% - 24px);
  padding: 4px 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
}
.study-panel-min-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 6px;
  border: 0;
  background: none;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.study-panel-min-main .study-panel-title { max-width: 220px; }
.study-resize { position: absolute; z-index: 3; }
.study-resize.n { top: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
.study-resize.s { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
.study-resize.e { right: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
.study-resize.w { left: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
.study-resize.ne { top: 0; right: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.study-resize.nw { top: 0; left: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.study-resize.se { bottom: 0; right: 0; width: 12px; height: 12px; cursor: nwse-resize; }
.study-resize.sw { bottom: 0; left: 0; width: 12px; height: 12px; cursor: nesw-resize; }
.study-bubble {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 50;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 50%;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-brand-primary);
  font: 600 15px/1 sans-serif;
  cursor: pointer;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent);
}
.study-bubble:hover { background: var(--dsw-alias-bg-layer-2); }
.study-end-wrap { display: flex; align-items: center; gap: 6px; margin-left: 6px; }
.study-version-toggle {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  overflow: hidden;
}
.study-version-toggle button {
  padding: 4px 10px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.study-version-toggle button.active {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
}
.study-end-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l1));
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.study-end-btn:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }
.study-end-btn:disabled {
  opacity: 0.45;
  cursor: default;
  border-color: var(--dsw-alias-border-l1);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}
.study-end-btn.ended {
  border-color: var(--dsw-alias-border-l1);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}
.study-end-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; }
.study-restore-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.study-restore-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.study-restore-btn:disabled { opacity: 0.5; cursor: default; }
.study-restore-go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-color: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #b23a2e) 50%, var(--dsw-alias-border-l1));
  background: transparent;
  color: var(--dsw-alias-label-primary);
}
.study-restore-go:hover { background: color-mix(in srgb, var(--dsw-alias-state-warning-primary, #b23a2e) 10%, transparent); }
.study-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: study-spin 0.8s linear infinite;
}
@keyframes study-spin { to { transform: rotate(360deg); } }
.study-modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(18, 18, 22, 0.42);
  backdrop-filter: blur(3px);
}
.study-end-modal {
  position: relative;
  width: min(460px, 100%);
  padding: 24px 24px 20px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 18px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 24px 70px color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent);
  animation: study-pop 0.18s ease-out;
}
.study-end-modal::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, var(--dsw-alias-brand-primary), color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent));
}
@keyframes study-pop {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
.study-modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: 16px/24px sans-serif;
  cursor: pointer;
}
.study-modal-close:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.study-end-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: var(--dsw-alias-brand-primary);
}
.study-modal-title { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: 0.01em; }
.study-end-file {
  margin-top: 4px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.study-modal-body { margin-top: 10px; font-size: 13px; line-height: 1.7; color: var(--dsw-alias-label-secondary); }
.study-end-points { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.study-end-points span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
.study-end-points svg { color: var(--dsw-alias-brand-primary); }
.study-modal-note { margin-top: 12px; font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); opacity: 0.85; }
.study-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.study-ghost { background: transparent; }
.study-end-go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
  color: #fff;
}
.study-end-go:hover { filter: brightness(1.06); }
.study-ending-bar {
  position: absolute;
  top: 56px;
  left: 50%;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  box-shadow: 0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
  transform: translateX(-50%);
}
.study-done-toast {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 55;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 7px 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  box-shadow: 0 14px 40px color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
  transform: translateX(-50%);
}
.study-done-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-size: 11px;
  font-weight: 700;
}
.study-done-close {
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  cursor: pointer;
}
.study-askbar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  z-index: 45;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 24px);
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  box-shadow: 0 12px 34px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
  transform: translateX(-50%);
}
.study-askbar-text {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
}
.study-modal {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 52%, transparent);
}
.study-modal-card {
  display: flex;
  flex-direction: column;
  width: min(540px, 100%);
  max-height: 86%;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
}
.study-modal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-weight: 600;
}
.study-modal-head .study-btn { margin-left: auto; }
.study-path {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.study-path-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.study-list {
  flex: 1 1 auto;
  min-height: 140px;
  max-height: 52vh;
  overflow: auto;
  padding: 6px;
}
.study-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.study-row:hover { background: var(--dsw-alias-bg-layer-2); }
.study-row[aria-selected="true"] {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
.study-row .study-muted { margin-left: auto; font-size: 11px; }
.study-imports {
  flex: none;
  max-height: 132px;
  overflow: auto;
  padding: 6px 12px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.study-import-title { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-bottom: 4px; }
.study-import-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.study-modal-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.study-file-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
}
.study-library { display: flex; flex-direction: column; gap: 2px; padding: 4px; }
.study-file-row { display: flex; align-items: center; gap: 2px; }
.study-file-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.study-file-main:hover { background: var(--dsw-alias-bg-layer-2); }
.study-file-icon { flex: none; opacity: .75; }
.study-file-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.study-file-path {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.study-tag {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
}
.study-file-remove { flex: none; margin-right: 4px; }
.study-search {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
}
.study-row-name {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.study-row-path {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
}
.study-row .study-tag { margin-left: auto; }
`
