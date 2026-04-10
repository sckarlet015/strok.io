import { Editor } from "tldraw";

const richText = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

export function createVotingBoardTemplate(editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const cardW = 180;
  const cardH = 120;
  const cols = 3;
  const rows = 3;
  const gap = 20;
  const totalW = cols * cardW + (cols - 1) * gap;
  const totalH = rows * cardH + (rows - 1) * gap;
  const startX = center.x - totalW / 2;
  const startY = center.y - totalH / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: startY - 80,
    props: {
      richText: richText("Voting Board"),
      size: "l",
      color: "yellow",
    },
  });

  // Description
  editor.createShape({
    type: "geo",
    x: center.x - 160,
    y: startY - 40,
    props: {
      geo: "rectangle",
      w: 320,
      h: 24,
      color: "grey",
      fill: "none",
      richText: richText("Agrega ideas y usa el boton Votar para priorizar"),
      size: "s",
    },
  });

  const colors = ["light-blue", "light-green", "light-violet", "yellow", "orange", "light-red", "blue", "green", "violet"] as const;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      editor.createShape({
        type: "note",
        x,
        y,
        props: {
          richText: richText(`Idea ${idx + 1}`),
          size: "m",
          color: colors[idx % colors.length],
        },
      });
    }
  }
}
