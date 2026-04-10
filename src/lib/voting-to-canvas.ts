import { Editor } from "tldraw";
import { VotingSession } from "./liveblocks.config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRichText(text: string): any {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function resultsToShapes(session: VotingSession, editor: Editor) {
  const votes = session.votes;
  const voteEntries = Object.values(votes);

  if (voteEntries.length === 0) return;

  let posX: number;
  let posY: number;

  if (session.linkedShapeIds.length > 0) {
    let sumX = 0, sumY = 0, count = 0;
    for (const id of session.linkedShapeIds) {
      const shape = editor.getShape(id as never);
      if (shape) {
        sumX += (shape as unknown as { x: number }).x;
        sumY += (shape as unknown as { y: number }).y;
        count++;
      }
    }
    if (count > 0) {
      posX = sumX / count;
      posY = sumY / count + 120;
    } else {
      const center = editor.screenToPage(editor.getViewportScreenCenter());
      posX = center.x - 150;
      posY = center.y;
    }
  } else {
    const center = editor.screenToPage(editor.getViewportScreenCenter());
    posX = center.x - 150;
    posY = center.y;
  }

  const date = new Date(session.closedAt ?? Date.now()).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (session.type === "approval") {
    const ups = voteEntries.filter((v) => v === "up").length;
    const downs = voteEntries.filter((v) => v === "down").length;
    const total = ups + downs;
    const upPct = total > 0 ? Math.round((ups / total) * 100) : 0;
    const downPct = total > 0 ? 100 - upPct : 0;

    // Title note
    editor.createShape({
      type: "note",
      x: posX,
      y: posY - 80,
      props: {
        richText: toRichText(`Resultado — ${date}\n${session.question}`),
        size: "s",
        color: "yellow",
      },
    });

    const barWidth = 300;
    const barY = posY;

    if (upPct > 0) {
      editor.createShape({
        type: "geo",
        x: posX,
        y: barY,
        props: {
          geo: "rectangle",
          w: (barWidth * upPct) / 100,
          h: 32,
          color: "green",
          fill: "solid",
          richText: toRichText(`${upPct}% (${ups})`),
          size: "s",
        },
      });
    }

    if (downPct > 0) {
      editor.createShape({
        type: "geo",
        x: posX + (barWidth * upPct) / 100,
        y: barY,
        props: {
          geo: "rectangle",
          w: (barWidth * downPct) / 100,
          h: 32,
          color: "red",
          fill: "solid",
          richText: toRichText(`${downPct}% (${downs})`),
          size: "s",
        },
      });
    }

    editor.createShape({
      type: "geo",
      x: posX,
      y: barY + 40,
      props: {
        geo: "rectangle",
        w: 140,
        h: 24,
        color: "grey",
        fill: "none",
        richText: toRichText(`Total: ${total} votos`),
        size: "s",
      },
    });
  } else if (session.type === "stars") {
    const values = voteEntries.map(Number).filter((n) => !isNaN(n));
    const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "0";
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: values.filter((v) => v === star).length,
    }));

    editor.createShape({
      type: "note",
      x: posX,
      y: posY - 80,
      props: {
        richText: toRichText(`Resultado — ${date}\n${session.question}\nPromedio: ${avg}/5 (${values.length} votos)`),
        size: "s",
        color: "yellow",
      },
    });

    const barWidth = 200;
    distribution.forEach((d, i) => {
      const barY = posY + i * 30;
      const pct = values.length > 0 ? d.count / values.length : 0;

      editor.createShape({
        type: "geo",
        x: posX,
        y: barY,
        props: {
          geo: "rectangle",
          w: Math.max(barWidth * pct, 12) + 40,
          h: 24,
          color: "yellow",
          fill: "solid",
          richText: toRichText(`${d.star} - ${d.count}`),
          size: "s",
        },
      });
    });
  } else if (session.type === "dot") {
    const tally: Record<string, number> = {};
    for (const opt of session.options) tally[opt] = 0;

    for (const v of voteEntries) {
      const key = String(v);
      if (key in tally) tally[key]++;
    }

    const maxVotes = Math.max(...Object.values(tally), 1);
    const barWidth = 250;

    editor.createShape({
      type: "note",
      x: posX,
      y: posY - 80,
      props: {
        richText: toRichText(`Resultado — ${date}\n${session.question} (${voteEntries.length} votos)`),
        size: "s",
        color: "yellow",
      },
    });

    const colors = ["blue", "green", "orange", "red", "violet"] as const;
    session.options.forEach((opt, i) => {
      const barY = posY + i * 34;
      const pct = tally[opt] / maxVotes;

      editor.createShape({
        type: "geo",
        x: posX,
        y: barY,
        props: {
          geo: "rectangle",
          w: Math.max(barWidth * pct, 12),
          h: 28,
          color: colors[i % colors.length],
          fill: "solid",
          richText: toRichText(`${opt}: ${tally[opt]}`),
          size: "s",
        },
      });
    });
  }
}
