import { Editor } from "tldraw";
import dagre from "dagre";

const richText = (text: string) => ({
  type: "doc",
  content: text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  })),
});

type TldrawColor = "black" | "blue" | "green" | "grey" | "light-blue" | "orange" | "red" | "violet" | "yellow";

function toColor(c: string): TldrawColor {
  const valid: TldrawColor[] = ["black", "blue", "green", "grey", "light-blue", "orange", "red", "violet", "yellow"];
  return valid.includes(c as TldrawColor) ? (c as TldrawColor) : "blue";
}

// ── Mindmap ──

interface MindmapData {
  central: { text: string; color: string };
  branches: { text: string; color: string; children?: { text: string }[] }[];
}

function mindmapToShapes(data: MindmapData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const cx = center.x;
  const cy = center.y;

  // Central node
  editor.createShape({
    type: "geo",
    x: cx - 100,
    y: cy - 40,
    props: {
      geo: "ellipse",
      w: 200,
      h: 80,
      color: toColor(data.central.color),
      fill: "solid",
      richText: richText(data.central.text),
      size: "m",
    },
  });

  const branches = data.branches || [];
  const angleStep = (2 * Math.PI) / Math.max(branches.length, 1);
  const branchRadius = 280;
  const childRadius = 180;

  branches.forEach((branch, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const bx = cx + Math.cos(angle) * branchRadius - 80;
    const by = cy + Math.sin(angle) * branchRadius - 25;
    const color = toColor(branch.color);

    editor.createShape({
      type: "geo",
      x: bx,
      y: by,
      props: {
        geo: "rectangle",
        w: 160,
        h: 50,
        color,
        fill: "semi",
        richText: richText(branch.text),
        size: "s",
      },
    });

    // Arrow from center to branch
    editor.createShape({
      type: "arrow",
      x: cx,
      y: cy,
      props: {
        start: { x: 0, y: 0 },
        end: { x: bx + 80 - cx, y: by + 25 - cy },
      },
    });

    // Children
    const children = branch.children || [];
    children.forEach((child, j) => {
      const childAngle = angle + ((j - (children.length - 1) / 2) * 0.4);
      const chx = bx + 80 + Math.cos(childAngle) * childRadius - 60;
      const chy = by + 25 + Math.sin(childAngle) * childRadius - 20;

      editor.createShape({
        type: "note",
        x: chx,
        y: chy,
        props: {
          richText: richText(child.text),
          size: "s",
          color,
        },
      });

      // Arrow from branch to child
      editor.createShape({
        type: "arrow",
        x: bx + 80,
        y: by + 25,
        props: {
          start: { x: 0, y: 0 },
          end: { x: chx + 60 - (bx + 80), y: chy + 20 - (by + 25) },
        },
      });
    });
  });
}

// ── Flowchart ──

interface FlowchartData {
  title: string;
  nodes: { id: string; text: string; shape: string; color: string }[];
  edges: { from: string; to: string; label?: string }[];
}

function flowchartToShapes(data: FlowchartData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());

  // Use dagre for layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodeW = 180;
  const nodeH = 60;

  for (const node of data.nodes) {
    g.setNode(node.id, { width: nodeW, height: nodeH });
  }
  for (const edge of data.edges) {
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  // Calculate offset to center the graph
  const graphLabel = g.graph();
  const gw = graphLabel.width ?? 400;
  const gh = graphLabel.height ?? 400;
  const offsetX = center.x - gw / 2;
  const offsetY = center.y - gh / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: offsetY - 70,
    props: {
      richText: richText(data.title || "Flowchart"),
      size: "l",
      color: "yellow",
    },
  });

  // Map to store positions for edges
  const nodePositions = new Map<string, { x: number; y: number }>();

  for (const node of data.nodes) {
    const layoutNode = g.node(node.id);
    if (!layoutNode) continue;
    const x = layoutNode.x + offsetX - nodeW / 2;
    const y = layoutNode.y + offsetY - nodeH / 2;
    nodePositions.set(node.id, { x: x + nodeW / 2, y: y + nodeH / 2 });

    const geoType = node.shape === "diamond" ? "diamond" : node.shape === "ellipse" ? "ellipse" : "rectangle";

    editor.createShape({
      type: "geo",
      x,
      y,
      props: {
        geo: geoType,
        w: nodeW,
        h: nodeH,
        color: toColor(node.color),
        fill: "semi",
        richText: richText(node.text),
        size: "s",
      },
    });
  }

  for (const edge of data.edges) {
    const from = nodePositions.get(edge.from);
    const to = nodePositions.get(edge.to);
    if (!from || !to) continue;

    editor.createShape({
      type: "arrow",
      x: from.x,
      y: from.y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: to.x - from.x, y: to.y - from.y },
      },
    });
  }
}

// ── Architecture ──

interface ArchitectureData {
  title: string;
  layers: { name: string; color: string; components: { name: string; description: string }[] }[];
  connections: { from: string; to: string; label?: string }[];
}

function architectureToShapes(data: ArchitectureData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const layerH = 120;
  const layerGap = 20;
  const compW = 160;
  const compH = 60;
  const compGap = 16;
  const layers = data.layers || [];

  const totalH = layers.length * (layerH + layerGap);
  let currentY = center.y - totalH / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 120,
    y: currentY - 70,
    props: {
      richText: richText(data.title || "Arquitectura"),
      size: "l",
      color: "yellow",
    },
  });

  const compPositions = new Map<string, { x: number; y: number }>();

  for (const layer of layers) {
    const comps = layer.components || [];
    const layerW = Math.max(comps.length * (compW + compGap) + compGap, 300);

    // Layer background
    editor.createShape({
      type: "geo",
      x: center.x - layerW / 2,
      y: currentY,
      props: {
        geo: "rectangle",
        w: layerW,
        h: layerH,
        color: toColor(layer.color),
        fill: "semi",
        richText: richText(layer.name),
        size: "m",
        verticalAlign: "start",
      },
    });

    // Components inside layer
    const startX = center.x - (comps.length * (compW + compGap) - compGap) / 2;
    comps.forEach((comp, j) => {
      const cx = startX + j * (compW + compGap);
      const cy = currentY + 40;

      editor.createShape({
        type: "geo",
        x: cx,
        y: cy,
        props: {
          geo: "rectangle",
          w: compW,
          h: compH,
          color: toColor(layer.color),
          fill: "solid",
          richText: richText(`${comp.name}\n${comp.description}`),
          size: "s",
        },
      });

      compPositions.set(comp.name, { x: cx + compW / 2, y: cy + compH / 2 });
    });

    currentY += layerH + layerGap;
  }

  // Connections
  for (const conn of data.connections || []) {
    const from = compPositions.get(conn.from);
    const to = compPositions.get(conn.to);
    if (!from || !to) continue;

    editor.createShape({
      type: "arrow",
      x: from.x,
      y: from.y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: to.x - from.x, y: to.y - from.y },
      },
    });
  }
}

// ── Timeline ──

interface TimelineData {
  title: string;
  items: { date: string; title: string; description: string; color: string }[];
}

function timelineToShapes(data: TimelineData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const items = data.items || [];
  const itemGap = 220;
  const totalW = (items.length - 1) * itemGap;
  const startX = center.x - totalW / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: center.y - 140,
    props: {
      richText: richText(data.title || "Timeline"),
      size: "l",
      color: "yellow",
    },
  });

  // Horizontal line
  editor.createShape({
    type: "geo",
    x: startX - 20,
    y: center.y - 3,
    props: {
      geo: "rectangle",
      w: totalW + 40,
      h: 6,
      color: "grey",
      fill: "solid",
      richText: richText(""),
      size: "s",
    },
  });

  items.forEach((item, i) => {
    const x = startX + i * itemGap;
    const above = i % 2 === 0;
    const color = toColor(item.color);

    // Dot on timeline
    editor.createShape({
      type: "geo",
      x: x - 12,
      y: center.y - 12,
      props: {
        geo: "ellipse",
        w: 24,
        h: 24,
        color,
        fill: "solid",
        richText: richText(""),
        size: "s",
      },
    });

    // Card above or below
    const cardY = above ? center.y - 120 : center.y + 30;
    editor.createShape({
      type: "note",
      x: x - 70,
      y: cardY,
      props: {
        richText: richText(`${item.date}\n${item.title}\n${item.description}`),
        size: "s",
        color,
      },
    });
  });
}

// ── Table ──

interface TableData {
  title: string;
  headers: string[];
  rows: string[][];
}

function tableToShapes(data: TableData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const colW = 180;
  const rowH = 50;
  const headers = data.headers || [];
  const rows = data.rows || [];
  const totalW = headers.length * colW;
  const totalH = (rows.length + 1) * rowH;
  const startX = center.x - totalW / 2;
  const startY = center.y - totalH / 2;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: startY - 70,
    props: {
      richText: richText(data.title || "Tabla"),
      size: "l",
      color: "yellow",
    },
  });

  // Headers
  headers.forEach((header, i) => {
    editor.createShape({
      type: "geo",
      x: startX + i * colW,
      y: startY,
      props: {
        geo: "rectangle",
        w: colW,
        h: rowH,
        color: "blue",
        fill: "solid",
        richText: richText(header),
        size: "s",
      },
    });
  });

  // Rows
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (ci >= headers.length) return;
      editor.createShape({
        type: "geo",
        x: startX + ci * colW,
        y: startY + (ri + 1) * rowH,
        props: {
          geo: "rectangle",
          w: colW,
          h: rowH,
          color: ri % 2 === 0 ? "grey" : "light-blue",
          fill: "semi",
          richText: richText(cell),
          size: "s",
        },
      });
    });
  });
}

// ── Wireframe ──

interface WireframeData {
  title: string;
  elements: { type: string; text: string; width: number; height: number; x: number; y: number }[];
}

function wireframeToShapes(data: WireframeData, editor: Editor) {
  const center = editor.screenToPage(editor.getViewportScreenCenter());
  const offsetX = center.x - 200;
  const offsetY = center.y - 300;

  // Title
  editor.createShape({
    type: "note",
    x: center.x - 100,
    y: offsetY - 70,
    props: {
      richText: richText(data.title || "Wireframe"),
      size: "l",
      color: "yellow",
    },
  });

  // Phone/screen frame
  editor.createShape({
    type: "geo",
    x: offsetX - 10,
    y: offsetY - 10,
    props: {
      geo: "rectangle",
      w: 420,
      h: 720,
      color: "grey",
      fill: "none",
      richText: richText(""),
      size: "s",
    },
  });

  for (const el of data.elements || []) {
    const x = offsetX + (el.x || 0);
    const y = offsetY + (el.y || 0);
    const w = el.width || 160;
    const h = el.height || 40;

    let color: TldrawColor = "grey";
    let fill: "none" | "semi" | "solid" = "semi";
    const geo: "rectangle" | "ellipse" = "rectangle";

    switch (el.type) {
      case "header": color = "blue"; fill = "solid"; break;
      case "button": color = "blue"; fill = "solid"; break;
      case "input": color = "grey"; fill = "none"; break;
      case "image": color = "light-blue"; fill = "semi"; break;
      case "nav": color = "grey"; fill = "solid"; break;
      case "card": color = "grey"; fill = "semi"; break;
      default: break;
    }

    editor.createShape({
      type: "geo",
      x,
      y,
      props: {
        geo,
        w,
        h,
        color,
        fill,
        richText: richText(el.text || el.type),
        size: "s",
      },
    });
  }
}

// ── Main dispatcher ──

export type AIResultType = "mindmap" | "flowchart" | "architecture" | "timeline" | "table" | "wireframe";

export function insertAIResult(type: AIResultType, data: unknown, editor: Editor) {
  switch (type) {
    case "mindmap":
      mindmapToShapes(data as MindmapData, editor);
      break;
    case "flowchart":
      flowchartToShapes(data as FlowchartData, editor);
      break;
    case "architecture":
      architectureToShapes(data as ArchitectureData, editor);
      break;
    case "timeline":
      timelineToShapes(data as TimelineData, editor);
      break;
    case "table":
      tableToShapes(data as TableData, editor);
      break;
    case "wireframe":
      wireframeToShapes(data as WireframeData, editor);
      break;
  }
}
