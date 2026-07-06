"use client";

import { AnimatePresence, LayoutGroup } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Deck } from "@/lib/ppt/types";
import { SlideCanvas, CANVAS_W, CANVAS_H } from "./SlideCanvas";

export function Presenter({
  deck,
  startAt = 0,
  onExit,
}: {
  deck: Deck;
  startAt?: number;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(startAt);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [showNotes, setShowNotes] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, deck.slides.length - 1)),
    [deck.slides.length],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (el && document.fullscreenElement == null) {
      el.requestFullscreen?.().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Escape":
          onExit();
          break;
        case "n":
        case "N":
          setShowNotes((s) => !s);
          break;
        case "Home":
          setIndex(0);
          break;
        case "End":
          setIndex(deck.slides.length - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit, deck.slides.length]);

  // Fit a 16:9 canvas inside the viewport (letterboxed).
  const width = Math.min(size.w, (size.h * CANVAS_W) / CANVAS_H);
  const slide = deck.slides[index];

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      onClick={next}
    >
      {width > 0 && (
        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {/* key by slide id so exit/enter run; morphId elements glide across */}
            <div key={slide.id} style={{ width, height: (width * CANVAS_H) / CANVAS_W }}>
              <SlideCanvas deck={deck} slide={slide} width={width} animated />
            </div>
          </AnimatePresence>
        </LayoutGroup>
      )}

      {showNotes && slide.notes && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-2xl w-[90%] bg-black/80 backdrop-blur text-white/90 text-sm rounded-xl px-5 py-4 border border-white/15"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">
            Speaker notes
          </div>
          {slide.notes}
        </div>
      )}

      <div
        className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 text-white/60 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={prev}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
          aria-label="Previous slide"
        >
          ←
        </button>
        <span>
          {index + 1} / {deck.slides.length}
        </span>
        <button
          onClick={next}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
          aria-label="Next slide"
        >
          →
        </button>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          Notes (N)
        </button>
        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          Exit (Esc)
        </button>
      </div>
    </div>
  );
}
