import { Editor } from "tldraw";

const richText = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const COLUMNS = [
  { title: "Por hacer", color: "light-blue" as const },
  { title: "En progreso", color: "yellow" as const },
  { title: "Revision", color: "orange" as const },
  { title: "Hecho", color: "green" as const },
];

export function createKanbanTemplate(editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const colW = 220;
  const colH = 400;
  const gap = 16;
  const totalW = COLUMNS.length * colW + (COLUMNS.length - 1) * gap;
  const startX = center.x - totalW / 2;
  const startY = center.y - colH / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 80,
    y: startY - 80,
    props: {
      richText: richText("Kanban Board"),
      size: "l",
      color: "yellow",
    },
  });

  COLUMNS.forEach((col, i) => {
    const x = startX + i * (colW + gap);

    editor.createShape({
      type: "geo",
      x,
      y: startY,
      props: {
        geo: "rectangle",
        w: colW,
        h: colH,
        color: col.color,
        fill: "semi",
        richText: richText(col.title),
        size: "m",
        verticalAlign: "start",
      },
    });

    // Sample cards
    for (let j = 0; j < 2; j++) {
      editor.createShape({
        type: "note",
        x: x + 15,
        y: startY + 50 + j * 70,
        props: {
          richText: richText(`Tarea ${i * 2 + j + 1}`),
          size: "s",
          color: col.color,
        },
      });
    }
  });
}
