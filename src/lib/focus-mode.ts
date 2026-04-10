import { createTLStore, defaultShapeUtils, Editor, TLRecord } from "tldraw";

const STORAGE_PREFIX = "trazo-private-";

export function createPrivateStore(userId: string) {
  const store = createTLStore({ shapeUtils: defaultShapeUtils });

  // Load from localStorage
  const key = STORAGE_PREFIX + userId;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const records: TLRecord[] = Object.values(parsed.store ?? parsed ?? {});
      const docRecords = records.filter(
        (r) =>
          r.typeName !== "instance" &&
          r.typeName !== "instance_page_state" &&
          r.typeName !== "camera" &&
          r.typeName !== "pointer"
      );
      if (docRecords.length > 0) {
        store.put(docRecords);
      }
    }
  } catch {
    // Ignore load errors
  }

  // Auto-save to localStorage on changes
  store.listen(
    () => {
      try {
        const snapshot = store.getStoreSnapshot("document");
        localStorage.setItem(key, JSON.stringify(snapshot));
      } catch {
        // Ignore save errors
      }
    },
    { source: "user", scope: "document" }
  );

  return store;
}

export function publishToSharedCanvas(
  privateStore: ReturnType<typeof createTLStore>,
  publicEditor: Editor
) {
  const allRecords = privateStore.allRecords();
  const shapes = allRecords.filter((r) => r.typeName === "shape");

  if (shapes.length === 0) return;

  // Also get assets (images, etc)
  const assets = allRecords.filter((r) => r.typeName === "asset");
  if (assets.length > 0) {
    publicEditor.store.put(assets);
  }

  // Cameras are synced, so shapes go in their exact position
  publicEditor.store.put(shapes);

  // Clear private store
  const privateShapes = privateStore.allRecords().filter(
    (r) =>
      r.typeName === "shape" || r.typeName === "asset"
  );
  if (privateShapes.length > 0) {
    privateStore.remove(privateShapes.map((r) => r.id));
  }

  // Clear localStorage
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}
