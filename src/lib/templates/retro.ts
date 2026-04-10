import { Editor } from "tldraw";

const richText = (text: string) => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});

const ZONES = [
  { title: "Que salio bien", color: "green" as const, emoji: "✅" },
  { title: "Que mejorar", color: "orange" as const, emoji: "🔧" },
  { title: "Que hacer", color: "blue" as const, emoji: "🚀" },
  { title: "Que dejar", color: "red" as const, emoji: "🛑" },
];

export function createRetroTemplate(editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const zoneW = 280;
  const zoneH = 350;
  const gap = 20;
  const totalW = ZONES.length * zoneW + (ZONES.length - 1) * gap;
  const startX = center.x - totalW / 2;
  const startY = center.y - zoneH / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: startY - 80,
    props: {
      richText: richText("Retrospectiva"),
      size: "l",
      color: "yellow",
    },
  });

  ZONES.forEach((zone, i) => {
    const x = startX + i * (zoneW + gap);

    editor.createShape({
      type: "geo",
      x,
      y: startY,
      props: {
        geo: "rectangle",
        w: zoneW,
        h: zoneH,
        color: zone.color,
        fill: "semi",
        richText: richText(`${zone.emoji} ${zone.title}`),
        size: "m",
        verticalAlign: "start",
      },
    });

    // Sample sticky
    editor.createShape({
      type: "note",
      x: x + 20,
      y: startY + 60,
      props: {
        richText: richText("Escribe aqui..."),
        size: "s",
        color: zone.color,
      },
    });
  });
}
