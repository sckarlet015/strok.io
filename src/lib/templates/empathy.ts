import { Editor } from "tldraw";

const richText = (text: string) => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});

const QUADRANTS = [
  { title: "Piensa y siente", color: "violet" as const, emoji: "🧠" },
  { title: "Ve", color: "blue" as const, emoji: "👁" },
  { title: "Escucha", color: "green" as const, emoji: "👂" },
  { title: "Dice y hace", color: "orange" as const, emoji: "💬" },
];

export function createEmpathyTemplate(editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const quadW = 300;
  const quadH = 250;
  const gap = 16;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: center.y - quadH - 80,
    props: {
      richText: richText("Mapa de Empatia"),
      size: "l",
      color: "yellow",
    },
  });

  // Persona center
  editor.createShape({
    type: "geo",
    x: center.x - 50,
    y: center.y - 40,
    props: {
      geo: "ellipse",
      w: 100,
      h: 80,
      color: "yellow",
      fill: "solid",
      richText: richText("Persona"),
      size: "s",
    },
  });

  const positions = [
    { x: center.x - quadW - gap / 2, y: center.y - quadH - gap / 2 },
    { x: center.x + gap / 2, y: center.y - quadH - gap / 2 },
    { x: center.x - quadW - gap / 2, y: center.y + gap / 2 },
    { x: center.x + gap / 2, y: center.y + gap / 2 },
  ];

  QUADRANTS.forEach((quad, i) => {
    const pos = positions[i];

    editor.createShape({
      type: "geo",
      x: pos.x,
      y: pos.y,
      props: {
        geo: "rectangle",
        w: quadW,
        h: quadH,
        color: quad.color,
        fill: "semi",
        richText: richText(`${quad.emoji} ${quad.title}`),
        size: "m",
        verticalAlign: "start",
      },
    });

    // Sample sticky
    editor.createShape({
      type: "note",
      x: pos.x + 20,
      y: pos.y + 50,
      props: {
        richText: richText("Escribe aqui..."),
        size: "s",
        color: quad.color,
      },
    });
  });

  // Pain and Gain at bottom
  const painGain = [
    { title: "Frustraciones", color: "red" as const, emoji: "😤" },
    { title: "Motivaciones", color: "green" as const, emoji: "🎯" },
  ];

  painGain.forEach((item, i) => {
    const x = center.x - quadW - gap / 2 + i * (quadW + gap);
    const y = center.y + quadH + gap + 16;

    editor.createShape({
      type: "geo",
      x,
      y,
      props: {
        geo: "rectangle",
        w: quadW,
        h: 150,
        color: item.color,
        fill: "semi",
        richText: richText(`${item.emoji} ${item.title}`),
        size: "m",
        verticalAlign: "start",
      },
    });
  });
}
