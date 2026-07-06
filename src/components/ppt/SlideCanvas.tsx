"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import {
  FONT_STACKS,
  type Deck,
  type Slide,
  type SlideElement,
  type SlideTransition,
} from "@/lib/ppt/types";

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

const MORPH_SPRING = { type: "spring", stiffness: 160, damping: 24, mass: 0.9 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/** Enter/exit variants for elements that do NOT morph (no shared morphId). */
function entryVariants(transition: SlideTransition, index: number) {
  const delay = 0.08 + index * 0.06;
  switch (transition) {
    case "slide":
      return {
        initial: { opacity: 0, x: 80 },
        animate: { opacity: 1, x: 0, transition: { delay, duration: 0.45, ease: EASE } },
        exit: { opacity: 0, x: -60, transition: { duration: 0.25 } },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 0.82 },
        animate: { opacity: 1, scale: 1, transition: { delay, duration: 0.45, ease: EASE } },
        exit: { opacity: 0, scale: 1.06, transition: { duration: 0.25 } },
      };
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { delay, duration: 0.5 } },
        exit: { opacity: 0, transition: { duration: 0.25 } },
      };
    case "morph":
    default:
      // Non-morphing elements on a morph slide drift up + fade while the
      // shared elements glide.
      return {
        initial: { opacity: 0, y: 26 },
        animate: { opacity: 1, y: 0, transition: { delay, duration: 0.4, ease: EASE } },
        exit: { opacity: 0, y: -18, transition: { duration: 0.22 } },
      };
  }
}

function ElementBody({
  el,
  deck,
  scale,
}: {
  el: SlideElement;
  deck: Deck;
  scale: number;
}) {
  const t = deck.theme;
  const headingFont = FONT_STACKS[t.headingFont];
  const bodyFont = FONT_STACKS[t.bodyFont];
  const color = el.color ?? t.text;
  const fs = (px: number) => px * scale;

  switch (el.kind) {
    case "kicker":
      return (
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: fs(el.fontSize ?? 15),
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: el.color ?? t.accent,
          }}
        >
          {el.text}
        </div>
      );
    case "heading":
      return (
        <div
          style={{
            fontFamily: headingFont,
            fontSize: fs(el.fontSize ?? 64),
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color,
          }}
        >
          {el.text}
        </div>
      );
    case "subheading":
      return (
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: fs(el.fontSize ?? 28),
            fontWeight: 400,
            lineHeight: 1.3,
            color: el.color ?? t.muted,
          }}
        >
          {el.text}
        </div>
      );
    case "body":
      return (
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: fs(el.fontSize ?? 21),
            lineHeight: 1.5,
            color,
          }}
        >
          {el.text}
        </div>
      );
    case "bullets":
      return (
        <ul
          style={{
            fontFamily: bodyFont,
            fontSize: fs(el.fontSize ?? 22),
            lineHeight: 1.4,
            color,
            display: "flex",
            flexDirection: "column",
            gap: fs(14),
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {(el.items ?? []).map((item, i) => (
            <li key={i} style={{ display: "flex", gap: fs(14), alignItems: "baseline" }}>
              <span
                aria-hidden
                style={{
                  width: fs(9),
                  height: fs(9),
                  borderRadius: 999,
                  background: t.accent,
                  flexShrink: 0,
                  transform: "translateY(-2px)",
                }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "stat":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
            justifyContent: "center",
            height: "100%",
            gap: fs(8),
            padding: fs(12),
          }}
        >
          <div
            style={{
              fontFamily: headingFont,
              fontSize: fs(el.fontSize ?? 84),
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: el.color ?? t.accent,
            }}
          >
            {el.text}
          </div>
          {el.label ? (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: fs(18),
                color: t.muted,
                textAlign: el.align,
              }}
            >
              {el.label}
            </div>
          ) : null}
        </div>
      );
    case "quote":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            gap: fs(16),
          }}
        >
          <div
            style={{
              fontFamily: headingFont,
              fontSize: fs(el.fontSize ?? 40),
              fontWeight: 600,
              lineHeight: 1.25,
              color,
            }}
          >
            &ldquo;{el.text}&rdquo;
          </div>
          {el.label ? (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: fs(18),
                color: el.color ?? t.accent,
                fontWeight: 600,
              }}
            >
              — {el.label}
            </div>
          ) : null}
        </div>
      );
    case "visual":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: fs(18),
            padding: fs(16),
          }}
        >
          <div style={{ fontSize: fs(el.fontSize ?? 72), lineHeight: 1 }}>{el.text}</div>
          {el.label ? (
            <div
              style={{
                fontFamily: bodyFont,
                fontSize: fs(17),
                color: el.color ?? t.muted,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {el.label}
            </div>
          ) : null}
        </div>
      );
    case "shape":
    default:
      return null;
  }
}

export function SlideCanvas({
  deck,
  slide,
  width,
  animated = true,
  onElementText,
}: {
  deck: Deck;
  slide: Slide;
  /** rendered width in px; height derives from 16:9 */
  width: number;
  /** false renders statically (thumbnails) */
  animated?: boolean;
  /** if provided, text elements become editable on double-click */
  onElementText?: (elementId: string, text: string) => void;
}) {
  const scale = width / CANVAS_W;
  const background = slide.background ?? deck.theme.background;

  return (
    <div
      style={{
        width,
        height: (width * CANVAS_H) / CANVAS_W,
        background,
        position: "relative",
        overflow: "hidden",
        transition: "background 0.5s ease",
      }}
    >
      {slide.elements.map((el, i) => {
        const style: CSSProperties = {
          position: "absolute",
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          background: el.bg ?? undefined,
          borderRadius: el.radius != null ? el.radius * scale : undefined,
          textAlign: el.align,
          display: "block",
        };

        const body = (
          <ElementBody el={el} deck={deck} scale={scale} />
        );

        const editable =
          onElementText &&
          el.text != null &&
          el.kind !== "shape" &&
          el.kind !== "bullets";

        const content = editable ? (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) =>
              onElementText(el.id, e.currentTarget.textContent ?? "")
            }
            style={{ outline: "none", cursor: "text", height: "100%" }}
          >
            {body}
          </div>
        ) : (
          body
        );

        if (!animated) {
          return (
            <div key={el.id} style={style}>
              {content}
            </div>
          );
        }

        if (el.morphId) {
          // Shared-element morph: same layoutId on adjacent slides makes
          // framer-motion animate position/size between them.
          return (
            <motion.div
              key={el.id}
              layoutId={el.morphId}
              layout
              transition={MORPH_SPRING}
              initial={false}
              animate={{
                opacity: 1,
                backgroundColor: el.bg ?? "rgba(0,0,0,0)",
              }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              style={{ ...style, background: undefined }}
            >
              {content}
            </motion.div>
          );
        }

        const v = entryVariants(slide.transition, i);
        return (
          <motion.div
            key={el.id}
            initial={v.initial}
            animate={v.animate}
            exit={v.exit}
            style={style}
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}
