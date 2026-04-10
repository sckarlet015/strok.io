import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory rate limit
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

type DiagramType = "mindmap" | "flowchart" | "architecture" | "timeline" | "table" | "wireframe";

const SYSTEM_PROMPTS: Record<DiagramType, string> = {
  mindmap: `Eres un generador de mapas mentales. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "mindmap",
  "central": { "text": "string", "color": "blue" },
  "branches": [
    {
      "text": "string",
      "color": "green|orange|red|violet|yellow|light-blue",
      "children": [{ "text": "string" }]
    }
  ]
}
Genera entre 4 y 7 branches. Cada branch puede tener 1-3 children. Usa colores variados.`,

  flowchart: `Eres un generador de diagramas de flujo. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "flowchart",
  "title": "string",
  "nodes": [
    { "id": "string", "text": "string", "shape": "rectangle|diamond|ellipse", "color": "blue|green|orange|red|violet|yellow" }
  ],
  "edges": [
    { "from": "string", "to": "string", "label": "string (optional)" }
  ]
}
Genera entre 5 y 12 nodos. Usa "ellipse" para inicio/fin, "diamond" para decisiones, "rectangle" para procesos. El primer nodo es inicio, el último es fin.`,

  architecture: `Eres un generador de diagramas de arquitectura. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "architecture",
  "title": "string",
  "layers": [
    {
      "name": "string",
      "color": "blue|green|orange|red|violet|yellow|light-blue",
      "components": [{ "name": "string", "description": "string" }]
    }
  ],
  "connections": [
    { "from": "string", "to": "string", "label": "string (optional)" }
  ]
}
Organiza en 3-5 capas (ej: Frontend, API, Backend, Database). Cada capa tiene 1-4 componentes. Los connections usan nombres de componentes.`,

  timeline: `Eres un generador de timelines. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "timeline",
  "title": "string",
  "items": [
    { "date": "string", "title": "string", "description": "string", "color": "blue|green|orange|red|violet|yellow" }
  ]
}
Genera entre 4 y 8 items ordenados cronológicamente. Usa colores variados.`,

  table: `Eres un generador de tablas comparativas. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "table",
  "title": "string",
  "headers": ["string"],
  "rows": [["string"]]
}
Genera entre 3 y 6 columnas y 3-8 filas. Los headers son descriptivos.`,

  wireframe: `Eres un generador de wireframes básicos. Responde SOLO con JSON válido, sin texto adicional, sin markdown.
Formato requerido:
{
  "type": "wireframe",
  "title": "string",
  "elements": [
    { "type": "header|text|button|input|image|nav|card|list", "text": "string", "width": number, "height": number, "x": number, "y": number }
  ]
}
El canvas es 400x700 (mobile) o 800x600 (desktop, según el prompt). Posiciona elementos con x,y relativo al top-left. Genera entre 5-15 elementos para un wireframe básico pero claro.`,
};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Limite de generaciones alcanzado (10/hora). Intenta mas tarde." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { type, prompt, language = "es" } = body as {
      type: DiagramType;
      prompt: string;
      language?: "es" | "en";
    };

    if (!type || !prompt || !SYSTEM_PROMPTS[type]) {
      return NextResponse.json({ error: "Tipo o prompt invalido" }, { status: 400 });
    }

    const langNote = language === "en"
      ? "Respond in English."
      : "Responde en español.";

    const result = await callClaude(type, prompt, langNote);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: "Error al generar. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

async function callClaude(type: DiagramType, prompt: string, langNote: string, retry = false): Promise<unknown> {
  const systemPrompt = SYSTEM_PROMPTS[type] + "\n" + langNote;
  const userPrompt = retry
    ? `${prompt}\n\nIMPORTANTE: Tu respuesta anterior no fue JSON válido. Responde UNICAMENTE con JSON, sin backticks, sin texto antes o después.`
    : prompt;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    if (!retry) {
      return callClaude(type, prompt, langNote, true);
    }
    throw new Error("No se pudo parsear la respuesta de AI como JSON");
  }
}
