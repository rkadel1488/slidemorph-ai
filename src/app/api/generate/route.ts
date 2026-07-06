import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DECK_SCHEMA, type Deck } from "@/lib/ppt/types";

export const maxDuration = 300;

const SYSTEM = `You are an elite presentation designer — the kind who ships keynote decks for product launches. You design slide decks as structured JSON for a 1280x720 (16:9) canvas.

Design rules:
- Craft a cohesive, distinctive theme. Avoid generic AI aesthetics (no purple gradients on white/dark, no cookie-cutter layouts). Prefer bold editorial layouts: oversized type, asymmetric composition, generous negative space, a disciplined 2-color accent system on a dark or warm-neutral background.
- Position elements with x/y/w/h percentages. Keep at least 4% margin from every edge. Never let elements overlap unless one is a decorative "shape" behind text.
- Typography scale at 1280x720: hero headings 64-96px, section headings 44-60px, subheadings 26-34px, body 18-24px, kickers 14-16px letterspaced, stats 72-120px.
- Vary slide layouts: full-bleed title, split layouts, stat trios, quote slides, agenda, section dividers, closing slide. 1 idea per slide; max ~5 bullets, each under 10 words.
- Write concise, punchy copy. Every slide gets useful speaker notes (2-4 sentences).

MORPH (the signature effect): consecutive slides animate shared elements. Give an element the SAME morphId on two or more slides and it will glide/resize/recolor between them, like PowerPoint Morph.
- Use morph deliberately: a hero title that shrinks into a top-left kicker on the next slide; an accent shape that travels across slides as a motif; a stat card that grows into a full-slide highlight; agenda items that slide to a rail.
- 2-4 morphing elements between adjacent slides is ideal. Set those slides' transition to "morph". Use "fade"/"slide"/"zoom" for hard topic breaks.
- Include at least one decorative "shape" motif that morphs across most slides (position/size/color shifts) to give the deck a living, continuous feel.

Kinds: kicker, heading, subheading, body, bullets (items[]), stat (text=value, label=caption), quote (text=quote, label=attribution), visual (text=a single emoji, label=caption; rendered as a decorative card), shape (pure decoration; set bg).`;

interface GenerateBody {
  topic?: string;
  slideCount?: number;
  audience?: string;
  tone?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to .env.local to enable AI generation, or load the demo deck.",
      },
      { status: 501 },
    );
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = body.topic?.trim();
  if (!topic) {
    return NextResponse.json({ error: "Missing topic." }, { status: 400 });
  }
  const slideCount = Math.min(Math.max(body.slideCount ?? 8, 3), 16);

  const client = new Anthropic({ apiKey });

  const prompt = [
    `Design a ${slideCount}-slide presentation about: ${topic}`,
    body.audience ? `Audience: ${body.audience}` : null,
    body.tone ? `Tone/style direction: ${body.tone}` : null,
    `Return exactly ${slideCount} slides with rich morph continuity between adjacent slides.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      output_config: {
        format: {
          type: "json_schema",
          schema: DECK_SCHEMA,
        },
      },
      messages: [{ role: "user", content: prompt }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "The model declined this topic. Try rephrasing it." },
        { status: 422 },
      );
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const deck = JSON.parse(text) as Deck;
    if (!deck.slides?.length) {
      return NextResponse.json(
        { error: "The model returned an empty deck. Please retry." },
        { status: 502 },
      );
    }
    return NextResponse.json({ deck });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by the Claude API — wait a moment and retry." },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY." },
        { status: 401 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error (${err.status}): ${err.message}` },
        { status: 502 },
      );
    }
    console.error("Deck generation failed", err);
    return NextResponse.json(
      { error: "Deck generation failed. Please retry." },
      { status: 500 },
    );
  }
}
