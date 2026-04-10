import { Editor, TLShapeId } from "tldraw";

export type ZoneType = "group-on-drop" | "auto-connect" | "sort-order";

export interface TemplateZone {
  shapeId: TLShapeId;
  zoneType: ZoneType;
  config: Record<string, unknown>;
}

let registeredZones: TemplateZone[] = [];
let cleanupFn: (() => void) | null = null;
let setupMode = false;

export function setSetupMode(value: boolean) {
  setupMode = value;
}

export function registerTemplateZones(editor: Editor, zones: TemplateZone[]) {
  registeredZones = [...registeredZones, ...zones];

  // Only register the listener once
  if (cleanupFn) return;

  let processing = false;

  const removeListener = editor.store.listen(
    ({ changes }) => {
      if (processing || setupMode) return;
      processing = true;

      try {
        const updated = Object.values(changes.updated);

        for (const [, to] of updated) {
          const shape = to as unknown as { id: TLShapeId; typeName: string; x?: number; y?: number };
          if (shape.typeName !== "shape") continue;

          for (const zone of registeredZones) {
            const zoneShape = editor.getShape(zone.shapeId);
            if (!zoneShape) continue;

            const zs = zoneShape as unknown as { x: number; y: number; props?: { w?: number; h?: number } };
            const zx = zs.x;
            const zy = zs.y;
            const zw = zs.props?.w ?? 200;
            const zh = zs.props?.h ?? 200;

            if (shape.id === zone.shapeId) continue;

            const sx = shape.x ?? 0;
            const sy = shape.y ?? 0;

            if (zone.zoneType === "group-on-drop") {
              if (sx >= zx && sx <= zx + zw && sy >= zy && sy <= zy + zh) {
                const zoneColor = zone.config.color as string;
                if (zoneColor) {
                  const current = editor.getShape(shape.id);
                  if (current) {
                    const currentProps = (current as unknown as { props?: { color?: string } }).props;
                    if (currentProps && currentProps.color !== zoneColor) {
                      editor.updateShape({
                        id: shape.id,
                        type: (current as unknown as { type: string }).type as "geo",
                        props: { color: zoneColor as "green" },
                      });
                    }
                  }
                }
              }
            }

            if (zone.zoneType === "auto-connect") {
              const threshold = (zone.config.distance as number) ?? 120;
              const allShapes = editor.getCurrentPageShapes();

              for (const other of allShapes) {
                if (other.id === shape.id || other.id === zone.shapeId) continue;
                if ((other as unknown as { type: string }).type === "arrow") continue;

                const ox = (other as unknown as { x: number }).x;
                const oy = (other as unknown as { y: number }).y;
                const dist = Math.sqrt((sx - ox) ** 2 + (sy - oy) ** 2);

                if (dist < threshold) {
                  const arrows = allShapes.filter(
                    (s) => (s as unknown as { type: string }).type === "arrow"
                  );
                  const alreadyConnected = arrows.some((arrow) => {
                    const props = (arrow as unknown as { props: { start?: { boundShapeId?: string }; end?: { boundShapeId?: string } } }).props;
                    const startId = props.start?.boundShapeId;
                    const endId = props.end?.boundShapeId;
                    return (
                      (startId === shape.id && endId === other.id) ||
                      (startId === other.id && endId === shape.id)
                    );
                  });

                  if (!alreadyConnected) {
                    editor.createShape({
                      type: "arrow",
                      x: sx,
                      y: sy,
                      props: {
                        start: { x: 0, y: 0 },
                        end: { x: ox - sx, y: oy - sy },
                      },
                    });
                  }
                }
              }
            }

            if (zone.zoneType === "sort-order") {
              const allShapes = editor.getCurrentPageShapes();
              const shapesInZone = allShapes.filter((s) => {
                if (s.id === zone.shapeId) return false;
                if ((s as unknown as { type: string }).type === "arrow") return false;
                const ox = (s as unknown as { x: number }).x;
                const oy = (s as unknown as { y: number }).y;
                return ox >= zx && ox <= zx + zw && oy >= zy && oy <= zy + zh;
              });

              const sorted = [...shapesInZone].sort(
                (a, b) => (a as unknown as { y: number }).y - (b as unknown as { y: number }).y
              );

              const startY = zy + 50;
              const gap = 60;
              sorted.forEach((s, i) => {
                const targetY = startY + i * gap;
                const currentY = (s as unknown as { y: number }).y;
                if (Math.abs(currentY - targetY) > 5) {
                  editor.updateShape({
                    id: s.id,
                    type: (s as unknown as { type: string }).type as "geo",
                    x: zx + 20,
                    y: targetY,
                  });
                }
              });
            }
          }
        }
      } finally {
        processing = false;
      }
    },
    { source: "user", scope: "document" }
  );

  cleanupFn = () => {
    removeListener();
    registeredZones = [];
    cleanupFn = null;
  };
}

export function clearTemplateZones() {
  if (cleanupFn) cleanupFn();
}
