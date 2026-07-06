import type { Deck, SlideElement } from "./types";

// 16:9 layout in inches (pptxgenjs LAYOUT_16x9 is 10" x 5.625").
const PAGE_W = 10;
const PAGE_H = 5.625;

const pct = (v: number, total: number) => (v / 100) * total;
const hex = (c: string) => c.replace("#", "");
// Reference canvas is 1280px wide mapped onto 10in → 128 px/in ≈ 1.33px per pt.
const px2pt = (px: number) => Math.round(px * 0.55);

function fontFace(choice: string, heading: boolean): string {
  switch (choice) {
    case "serif":
      return "Georgia";
    case "mono":
      return "Consolas";
    case "display":
      return heading ? "Trebuchet MS" : "Segoe UI";
    default:
      return "Segoe UI";
  }
}

/** Builds and downloads a .pptx from the deck (browser only). */
export async function exportPptx(deck: Deck) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = deck.title;

  const t = deck.theme;
  const headingFont = fontFace(t.headingFont, true);
  const bodyFont = fontFace(t.bodyFont, false);

  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    s.background = { color: hex(slide.background ?? t.background) };
    if (slide.notes) s.addNotes(slide.notes);

    for (const el of slide.elements) {
      const box = {
        x: pct(el.x, PAGE_W),
        y: pct(el.y, PAGE_H),
        w: pct(el.w, PAGE_W),
        h: pct(el.h, PAGE_H),
      };
      // pptxgenjs clips off-canvas shapes poorly; clamp decorative overflow.
      box.x = Math.max(-PAGE_W, Math.min(box.x, PAGE_W));
      box.y = Math.max(-PAGE_H, Math.min(box.y, PAGE_H));

      addElement(s, el, box, { t, headingFont, bodyFont });
    }
  }

  const fileName = `${deck.title.replace(/[^\w\d\- ]+/g, "").trim() || "deck"}.pptx`;
  await pptx.writeFile({ fileName });
}

type Ctx = {
  t: Deck["theme"];
  headingFont: string;
  bodyFont: string;
};

type Box = { x: number; y: number; w: number; h: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addElement(s: any, el: SlideElement, box: Box, ctx: Ctx) {
  const { t, headingFont, bodyFont } = ctx;
  const color = hex(el.color ?? t.text);
  const align = el.align;

  // Background card behind any element that declares a fill.
  if (el.bg && el.kind !== "shape") {
    s.addShape("roundRect", {
      ...box,
      fill: { color: hex(el.bg) },
      line: { type: "none" },
      rectRadius: Math.min(0.15, (el.radius ?? 0) / 128),
    });
  }

  switch (el.kind) {
    case "shape":
      s.addShape(el.radius && el.radius >= 200 ? "ellipse" : "roundRect", {
        ...box,
        fill: { color: hex(el.bg ?? t.accent) },
        line: { type: "none" },
        ...(el.radius && el.radius < 200
          ? { rectRadius: Math.min(0.3, el.radius / 128) }
          : {}),
      });
      return;
    case "kicker":
      s.addText(el.text ?? "", {
        ...box,
        fontFace: bodyFont,
        fontSize: px2pt(el.fontSize ?? 15),
        color: hex(el.color ?? t.accent),
        bold: true,
        charSpacing: 4,
        align,
        valign: "top",
      });
      return;
    case "heading":
      s.addText(el.text ?? "", {
        ...box,
        fontFace: headingFont,
        fontSize: px2pt(el.fontSize ?? 64),
        color,
        bold: true,
        align,
        valign: "top",
      });
      return;
    case "subheading":
      s.addText(el.text ?? "", {
        ...box,
        fontFace: bodyFont,
        fontSize: px2pt(el.fontSize ?? 28),
        color: hex(el.color ?? t.muted),
        align,
        valign: "top",
      });
      return;
    case "body":
      s.addText(el.text ?? "", {
        ...box,
        fontFace: bodyFont,
        fontSize: px2pt(el.fontSize ?? 21),
        color,
        align,
        valign: "top",
      });
      return;
    case "bullets":
      s.addText(
        (el.items ?? []).map((item) => ({
          text: item,
          options: {
            bullet: { code: "2022", indent: 12 },
            breakLine: true,
            paraSpaceAfter: 8,
          },
        })),
        {
          ...box,
          fontFace: bodyFont,
          fontSize: px2pt(el.fontSize ?? 22),
          color,
          align,
          valign: "top",
        },
      );
      return;
    case "stat":
      s.addText(
        [
          {
            text: el.text ?? "",
            options: {
              fontFace: headingFont,
              fontSize: px2pt(el.fontSize ?? 84),
              color: hex(el.color ?? t.accent),
              bold: true,
              breakLine: true,
            },
          },
          ...(el.label
            ? [
                {
                  text: el.label,
                  options: {
                    fontFace: bodyFont,
                    fontSize: px2pt(18),
                    color: hex(t.muted),
                  },
                },
              ]
            : []),
        ],
        { ...box, align, valign: "middle" },
      );
      return;
    case "quote":
      s.addText(
        [
          {
            text: `“${el.text ?? ""}”`,
            options: {
              fontFace: headingFont,
              fontSize: px2pt(el.fontSize ?? 40),
              color,
              italic: true,
              breakLine: true,
            },
          },
          ...(el.label
            ? [
                {
                  text: `— ${el.label}`,
                  options: {
                    fontFace: bodyFont,
                    fontSize: px2pt(18),
                    color: hex(el.color ?? t.accent),
                    bold: true,
                  },
                },
              ]
            : []),
        ],
        { ...box, align, valign: "middle" },
      );
      return;
    case "visual":
      s.addText(
        [
          {
            text: el.text ?? "",
            options: { fontSize: px2pt(el.fontSize ?? 72), breakLine: true },
          },
          ...(el.label
            ? [
                {
                  text: el.label,
                  options: {
                    fontFace: bodyFont,
                    fontSize: px2pt(16),
                    color: hex(el.color ?? t.muted),
                  },
                },
              ]
            : []),
        ],
        { ...box, align: "center", valign: "middle" },
      );
      return;
  }
}
