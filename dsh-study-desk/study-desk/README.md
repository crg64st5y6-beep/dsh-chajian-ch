# Study desk for DeepSeek Harness

A DSH bundle that puts a study workspace in the right Sidebar:

- read workspace PDFs full-page, select text, copy or quote it;
- ask in a persistent floating composer;
- frame a region as a screenshot or attach a phone photo, then send it to the chat;
- see streaming answers with LaTeX math rendered by KaTeX;
- at the end of a class, generate an annotated copy of the PDF plus a one-page class summary;
- switch between the original and annotated versions, and regenerate the annotated one.

## Requirements

- DeepSeek Harness `0.2.2-rc.5` or a compatible build.
- macOS for the HEIC phone-photo conversion (`sips`); other features work without it.

## Install

1. Clone or download this repository.
2. Open DSH **Plugins → Add plugin** and select the `study-desk/` directory.
3. Enable the bundle and restart DSH when prompted.
4. Open a new session, open the right Sidebar, and choose **学习台 / Study desk**.

## Repository layout

- `study-desk/` — the installable bundle (built `client.js`, Host `index.js`, patch, locale, docs, icon).
- `study-desk-build/` — optional source used to rebuild `study-desk/client.js`.

## Rebuild the client bundle

```bash
cd study-desk-build
pnpm install
node build.mjs
```

The output is written back to `study-desk/client.js`.

## How it stores data

The plugin writes next to the PDFs in the user's workspace:

- `<PDF>.annotations.json` — questions and anchors;
- `screenshots/` — region screenshots;
- `.study-desk/backups/` — pre-class PDF backups;
- `<PDF base>-批注版.pdf` — the generated annotated copy.

No PDFs, screenshots, or annotations are part of this repository.

## Verification limits

The bundle is a UI plugin; install it and open a session to verify the tab and the end-class flow. The end-class generation is performed live by the agent, so the exact annotation layout can vary with the PDF.

## License

MIT. Bundled third-party libraries are listed in `THIRD_PARTY_NOTICES.md`.
