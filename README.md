# SlideMorph AI

An AI presentation studio: type a topic and **Claude** designs a complete
deck — theme, layouts, copy, and speaker notes — then presents it in the
browser with **PowerPoint-Morph-style transitions**, or exports a real
`.pptx`.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Claude](https://img.shields.io/badge/Claude-opus--4--8-d97706)

## Features

- **AI deck generation** — `POST /api/generate` calls the Anthropic API
  (`claude-opus-4-8`, adaptive thinking, streaming) with structured outputs:
  Claude returns the deck as schema-validated JSON (theme palette, typography,
  per-slide positioned elements, morph choreography, speaker notes).
- **Morph engine** — elements sharing a `morphId` across adjacent slides
  glide/resize between them via framer-motion shared-layout (`layoutId`)
  transitions — the same effect as PowerPoint Morph. Fade / slide / zoom
  transitions and staggered element entrances are also supported.
- **Fullscreen presenter** — arrows/space to navigate, `N` for speaker notes,
  `Esc` to exit.
- **Inline editing** — double-click any text on a slide to edit it.
- **`.pptx` export** — client-side via pptxgenjs (slides, theme colors,
  bullets, shapes, speaker notes). The `.pptx` format can't embed the live
  morph animation itself — apply PowerPoint's built-in Morph transition after
  import, or present in the browser where it's native.
- **Demo deck** — a built-in sample deck works without an API key.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without an API key the studio still runs — use **Load demo deck** to try the
morph engine, presenter, and export.

## Project structure

```
src/app/page.tsx               → the studio UI
src/app/api/generate/route.ts  → Claude deck generation (structured outputs)
src/components/ppt/Studio.tsx  → editor: prompt form, thumbnails, preview
src/components/ppt/SlideCanvas.tsx → slide renderer + morph engine
src/components/ppt/Presenter.tsx   → fullscreen presenting
src/lib/ppt/types.ts           → deck model + JSON schema for Claude
src/lib/ppt/pptx.ts            → .pptx exporter
src/lib/ppt/sample.ts          → built-in demo deck
```
