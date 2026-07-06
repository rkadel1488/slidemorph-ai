"use client";

import { AnimatePresence, LayoutGroup } from "framer-motion";
import { useEffect, useState } from "react";
import type { Deck } from "@/lib/ppt/types";
import { SAMPLE_DECK } from "@/lib/ppt/sample";
import { SlideCanvas, CANVAS_H, CANVAS_W } from "./SlideCanvas";
import { Presenter } from "./Presenter";

function useMeasuredWidth<T extends HTMLElement>() {
  // Callback ref so measurement works even when the element mounts later
  // (the preview only exists once a deck is loaded).
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return { ref: setNode, width };
}

const LOADING_STEPS = [
  "Briefing the AI designer…",
  "Choosing a theme & type scale…",
  "Writing punchy slide copy…",
  "Laying out every slide…",
  "Choreographing morph transitions…",
  "Polishing speaker notes…",
];

export default function Studio() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { ref: previewRef, width: previewWidth } = useMeasuredWidth<HTMLDivElement>();

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(
      () => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      4500,
    );
    return () => clearInterval(id);
  }, [loading]);

  async function generate() {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, slideCount, audience, tone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Generation failed (${res.status})`);
      }
      setDeck(data.deck);
      setIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!deck || exporting) return;
    setExporting(true);
    try {
      const { exportPptx } = await import("@/lib/ppt/pptx");
      await exportPptx(deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function updateElementText(elementId: string, text: string) {
    setDeck((d) => {
      if (!d) return d;
      return {
        ...d,
        slides: d.slides.map((s, si) =>
          si !== index
            ? s
            : {
                ...s,
                elements: s.elements.map((el) =>
                  el.id === elementId ? { ...el, text } : el,
                ),
              },
        ),
      };
    });
  }

  const slide = deck?.slides[index];

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-lg">
            Slide<span className="text-orange-400">Morph</span>{" "}
            <span className="text-white/40 font-normal">AI</span>
          </span>
        </div>
        {deck && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeck(null);
                setError(null);
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              New deck
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export .pptx"}
            </button>
            <button
              onClick={() => setPresenting(true)}
              className="px-4 py-1.5 text-sm rounded-lg bg-orange-500 hover:bg-orange-400 transition font-semibold"
            >
              ▶ Present
            </button>
          </div>
        )}
      </header>

      {!deck ? (
        /* ------------------------------ Prompt form ------------------------------ */
        <div className="max-w-2xl mx-auto px-5 pt-16 pb-24">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Type a topic.
            <br />
            Get a <span className="text-orange-400">designed, animated</span> deck.
          </h1>
          <p className="mt-4 text-white/60 text-lg">
            Claude designs the theme, layouts, copy and speaker notes — with
            PowerPoint-Morph-style transitions choreographed between slides.
            Present in the browser or export a real .pptx.
          </p>

          <div className="mt-10 space-y-4">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
              }}
              placeholder="e.g. Q3 launch plan for our indie movie-streaming app — growth, content strategy, and the ask"
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/15 focus:border-orange-400/60 outline-none px-4 py-3 text-base placeholder:text-white/30 resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Audience (optional)"
                className="rounded-xl bg-white/5 border border-white/15 focus:border-orange-400/60 outline-none px-4 py-2.5 text-sm placeholder:text-white/30"
              />
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Tone / style (optional)"
                className="rounded-xl bg-white/5 border border-white/15 focus:border-orange-400/60 outline-none px-4 py-2.5 text-sm placeholder:text-white/30"
              />
              <label className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/15 px-4 py-2.5 text-sm text-white/70">
                Slides
                <input
                  type="range"
                  min={3}
                  max={16}
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="w-6 text-right tabular-nums">{slideCount}</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? "Designing…" : "✦ Generate deck"}
              </button>
              <button
                onClick={() => {
                  setDeck(SAMPLE_DECK);
                  setIndex(0);
                  setError(null);
                }}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-sm"
              >
                Load demo deck (no API key needed)
              </button>
            </div>

            {loading && (
              <div className="mt-6 rounded-xl bg-white/5 border border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                  <span className="text-white/80 text-sm">
                    {LOADING_STEPS[loadingStep]}
                  </span>
                </div>
                <p className="mt-2 text-white/40 text-xs">
                  Claude is designing every slide — this can take a minute or two.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 px-5 py-4 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* -------------------------------- Editor -------------------------------- */
        <div className="flex flex-col lg:flex-row gap-4 px-4 sm:px-6 py-5 max-w-[1500px] mx-auto">
          {/* Thumbnail rail */}
          <aside className="flex lg:flex-col gap-3 lg:w-52 overflow-auto lg:max-h-[calc(100vh-8rem)] shrink-0 pb-2">
            {deck.slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                className={`relative shrink-0 rounded-lg overflow-hidden border transition ${
                  i === index
                    ? "border-orange-400 ring-2 ring-orange-400/40"
                    : "border-white/10 hover:border-white/30"
                }`}
                style={{ width: 176, height: 99 }}
              >
                <SlideCanvas deck={deck} slide={s} width={176} animated={false} />
                <span className="absolute bottom-1 left-1.5 text-[10px] bg-black/60 rounded px-1.5 py-0.5 text-white/80">
                  {i + 1}
                </span>
                {s.transition === "morph" && i > 0 && (
                  <span
                    className="absolute top-1 right-1.5 text-[9px] bg-orange-500/90 rounded px-1 py-0.5 font-semibold"
                    title="Morphs from previous slide"
                  >
                    MORPH
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Main preview */}
          <div className="flex-1 min-w-0">
            <div
              ref={previewRef}
              className="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
              style={{
                height: previewWidth ? (previewWidth * CANVAS_H) / CANVAS_W : undefined,
              }}
            >
              {previewWidth > 0 && slide && (
                <LayoutGroup id="editor">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <div key={slide.id}>
                      <SlideCanvas
                        deck={deck}
                        slide={slide}
                        width={previewWidth}
                        animated
                        onElementText={updateElementText}
                      />
                    </div>
                  </AnimatePresence>
                </LayoutGroup>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition text-sm"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
                  disabled={index === deck.slides.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition text-sm"
                >
                  Next →
                </button>
                <span className="text-white/40 text-sm ml-2 tabular-nums">
                  {index + 1} / {deck.slides.length}
                </span>
              </div>
              <span className="text-white/30 text-xs hidden sm:block">
                Double-click any text on the slide to edit it · transition:{" "}
                <span className="text-white/60">{slide?.transition}</span>
              </span>
            </div>

            {slide?.notes && (
              <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-5 py-4">
                <div className="text-[11px] uppercase tracking-widest text-white/40 mb-1.5">
                  Speaker notes
                </div>
                <p className="text-white/75 text-sm leading-relaxed">{slide.notes}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 px-5 py-4 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {presenting && deck && (
        <Presenter
          deck={deck}
          startAt={index}
          onExit={() => setPresenting(false)}
        />
      )}
    </div>
  );
}
