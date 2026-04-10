import { Editor } from "tldraw";

const richText = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

export function createBrainstormTemplate(editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());

  // Central idea
  editor.createShape({
    type: "geo",
    x: center.x - 100,
    y: center.y - 40,
    props: {
      geo: "ellipse",
      w: 200,
      h: 80,
      color: "blue",
      fill: "solid",
      richText: richText("Idea principal"),
      size: "m",
    },
  });

  // Surrounding ideas with arrows
  const ideas = [
    { angle: 0, text: "Idea 1", color: "green" as const },
    { angle: 72, text: "Idea 2", color: "orange" as const },
    { angle: 144, text: "Idea 3", color: "red" as const },
    { angle: 216, text: "Idea 4", color: "violet" as const },
    { angle: 288, text: "Idea 5", color: "yellow" as const },
  ];

  const cx = center.x;
  const cy = center.y;
  const radius = 200;

  ideas.forEach((idea) => {
    const rad = (idea.angle * Math.PI) / 180;
    const x = cx - 60 + Math.cos(rad) * radius;
    const y = cy - 30 + Math.sin(rad) * radius;

    editor.createShape({
      type: "note",
      x,
      y,
      props: {
        richText: richText(idea.text),
        size: "m",
        color: idea.color,
      },
    });

    // Arrow from center to idea
    editor.createShape({
      type: "arrow",
      x: cx,
      y: cy,
      props: {
        start: { x: 0, y: 0 },
        end: { x: x + 60 - cx, y: y + 30 - cy },
      },
    });
  });
}
