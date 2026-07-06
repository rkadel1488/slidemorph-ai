// Deck model shared by the generator API, the renderer, and the .pptx exporter.
// Coordinates are percentages of a 1280x720 (16:9) canvas; fontSize is px at
// that reference size and gets scaled by the renderer.

export type FontChoice = "sans" | "serif" | "mono" | "display";

export interface DeckTheme {
  name: string;
  background: string; // hex, e.g. "#0e0f13"
  surface: string; // hex, panel/card fill
  accent: string; // hex, primary accent
  accent2: string; // hex, secondary accent
  text: string; // hex, main text color
  muted: string; // hex, secondary text color
  headingFont: FontChoice;
  bodyFont: FontChoice;
}

export type ElementKind =
  | "kicker" // small uppercase label
  | "heading"
  | "subheading"
  | "body"
  | "bullets"
  | "stat" // big number (text) + label
  | "quote" // quote (text) + attribution (label)
  | "visual" // decorative card: large emoji (text) + caption (label)
  | "shape"; // pure decorative block

export interface SlideElement {
  id: string;
  /** Elements on different slides sharing a morphId glide/resize between them (PowerPoint-Morph style). */
  morphId: string | null;
  kind: ElementKind;
  text: string | null;
  items: string[] | null; // bullets only
  label: string | null; // stat label / quote attribution / visual caption
  x: number; // 0-100, % of slide width
  y: number; // 0-100, % of slide height
  w: number; // 0-100
  h: number; // 0-100
  color: string | null; // hex override
  bg: string | null; // hex fill or null for none
  fontSize: number | null; // px at 1280x720
  align: "left" | "center" | "right";
  radius: number | null; // corner radius px
}

export type SlideTransition = "morph" | "fade" | "slide" | "zoom";

export interface Slide {
  id: string;
  transition: SlideTransition;
  background: string | null; // hex override of theme background
  elements: SlideElement[];
  notes: string; // speaker notes
}

export interface Deck {
  title: string;
  subtitle: string;
  theme: DeckTheme;
  slides: Slide[];
}

const HEX = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" } as const;
const NULLABLE_HEX = {
  type: ["string", "null"],
  pattern: "^#[0-9a-fA-F]{6}$",
} as const;
const FONT = { type: "string", enum: ["sans", "serif", "mono", "display"] } as const;

/** JSON schema handed to Claude via output_config.format (structured outputs). */
export const DECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "subtitle", "theme", "slides"],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    theme: {
      type: "object",
      additionalProperties: false,
      required: [
        "name",
        "background",
        "surface",
        "accent",
        "accent2",
        "text",
        "muted",
        "headingFont",
        "bodyFont",
      ],
      properties: {
        name: { type: "string" },
        background: HEX,
        surface: HEX,
        accent: HEX,
        accent2: HEX,
        text: HEX,
        muted: HEX,
        headingFont: FONT,
        bodyFont: FONT,
      },
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "transition", "background", "elements", "notes"],
        properties: {
          id: { type: "string" },
          transition: {
            type: "string",
            enum: ["morph", "fade", "slide", "zoom"],
          },
          background: NULLABLE_HEX,
          notes: { type: "string" },
          elements: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "morphId",
                "kind",
                "text",
                "items",
                "label",
                "x",
                "y",
                "w",
                "h",
                "color",
                "bg",
                "fontSize",
                "align",
                "radius",
              ],
              properties: {
                id: { type: "string" },
                morphId: { type: ["string", "null"] },
                kind: {
                  type: "string",
                  enum: [
                    "kicker",
                    "heading",
                    "subheading",
                    "body",
                    "bullets",
                    "stat",
                    "quote",
                    "visual",
                    "shape",
                  ],
                },
                text: { type: ["string", "null"] },
                items: { type: ["array", "null"], items: { type: "string" } },
                label: { type: ["string", "null"] },
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" },
                color: NULLABLE_HEX,
                bg: NULLABLE_HEX,
                fontSize: { type: ["number", "null"] },
                align: { type: "string", enum: ["left", "center", "right"] },
                radius: { type: ["number", "null"] },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const FONT_STACKS: Record<FontChoice, string> = {
  sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Geist Mono', ui-monospace, monospace",
  display: "'Trebuchet MS', 'Segoe UI', ui-sans-serif, sans-serif",
};
