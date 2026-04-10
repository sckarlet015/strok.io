"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Editor } from "tldraw";
import { useIsMobile } from "@/lib/useIsMobile";

interface MenuBarProps {
  editor: Editor | null;
  roomId: string;
  onTogglePlayback: () => void;
  onToggleFocus: () => void;
  isFocusMode: boolean;
}

type MenuId = "file" | "edit" | "view" | "insert" | "help" | null;

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

export default function MenuBar({ editor, roomId, onTogglePlayback, onToggleFocus, isFocusMode }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Close on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openMenu]);

  const handleExportPNG = useCallback(async () => {
    if (!editor) return;
    const ids = editor.getCurrentPageShapeIds();
    if (ids.size === 0) return;
    try {
      const result = await editor.toImage([...ids], { format: "png", background: true });
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `canvas-${roomId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setOpenMenu(null);
  }, [editor, roomId]);

  const handleExportSVG = useCallback(async () => {
    if (!editor) return;
    const ids = editor.getCurrentPageShapeIds();
    if (ids.size === 0) return;
    try {
      const result = await editor.toImage([...ids], { format: "svg", background: true });
      if (!result) return;
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `canvas-${roomId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setOpenMenu(null);
  }, [editor, roomId]);

  const handleExportJSON = useCallback(() => {
    if (!editor) return;
    const snapshot = editor.store.getStoreSnapshot("document");
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-${roomId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  }, [editor, roomId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setOpenMenu(null);
  }, []);

  const menus: { id: MenuId; label: string; items: MenuItem[] }[] = [
    {
      id: "file",
      label: "Archivo",
      items: [
        { label: "Compartir link", shortcut: "", action: handleCopyLink },
        { label: "divider", divider: true },
        { label: "Exportar como PNG", action: handleExportPNG },
        { label: "Exportar como SVG", action: handleExportSVG },
        { label: "Exportar como JSON", action: handleExportJSON },
      ],
    },
    {
      id: "edit",
      label: "Editar",
      items: [
        { label: "Deshacer", shortcut: "Cmd+Z", action: () => { editor?.undo(); setOpenMenu(null); } },
        { label: "Rehacer", shortcut: "Cmd+Shift+Z", action: () => { editor?.redo(); setOpenMenu(null); } },
        { label: "divider", divider: true },
        { label: "Seleccionar todo", shortcut: "Cmd+A", action: () => { editor?.selectAll(); setOpenMenu(null); } },
        { label: "Deseleccionar", action: () => { editor?.selectNone(); setOpenMenu(null); } },
        { label: "divider", divider: true },
        {
          label: "Eliminar seleccion",
          shortcut: "Del",
          action: () => {
            if (!editor) return;
            const ids = editor.getSelectedShapeIds();
            if (ids.length > 0) editor.deleteShapes(ids);
            setOpenMenu(null);
          },
        },
        {
          label: "Limpiar canvas",
          action: () => {
            if (!editor) return;
            const all = [...editor.getCurrentPageShapeIds()];
            if (all.length > 0 && confirm("Eliminar todo del canvas?")) {
              editor.deleteShapes(all);
            }
            setOpenMenu(null);
          },
        },
      ],
    },
    {
      id: "view",
      label: "Vista",
      items: [
        { label: "Zoom al contenido", shortcut: "Shift+1", action: () => { editor?.zoomToFit(); setOpenMenu(null); } },
        { label: "Zoom a seleccion", shortcut: "Shift+2", action: () => { editor?.zoomToSelection(); setOpenMenu(null); } },
        { label: "Zoom 100%", shortcut: "Cmd+0", action: () => { editor?.resetZoom(); setOpenMenu(null); } },
        { label: "divider", divider: true },
        { label: "Acercar", shortcut: "Cmd++", action: () => { editor?.zoomIn(); setOpenMenu(null); } },
        { label: "Alejar", shortcut: "Cmd+-", action: () => { editor?.zoomOut(); setOpenMenu(null); } },
        { label: "divider", divider: true },
        {
          label: isFocusMode ? "Salir de Modo Foco" : "Modo Foco",
          action: () => { onToggleFocus(); setOpenMenu(null); },
        },
        { label: "Playback", action: () => { onTogglePlayback(); setOpenMenu(null); } },
      ],
    },
    {
      id: "insert",
      label: "Insertar",
      items: [
        {
          label: "Nota adhesiva",
          action: () => {
            if (!editor) return;
            const center = editor.screenToPage(editor.getViewportScreenCenter());
            editor.createShape({
              type: "note",
              x: center.x - 50,
              y: center.y - 50,
              props: {
                richText: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Nueva nota" }] }] },
                size: "m",
                color: "yellow",
              },
            });
            setOpenMenu(null);
          },
        },
        {
          label: "Rectangulo",
          action: () => {
            if (!editor) return;
            const center = editor.screenToPage(editor.getViewportScreenCenter());
            editor.createShape({
              type: "geo",
              x: center.x - 75,
              y: center.y - 50,
              props: { geo: "rectangle", w: 150, h: 100, color: "blue", fill: "semi", richText: { type: "doc", content: [{ type: "paragraph", content: [] }] }, size: "m" },
            });
            setOpenMenu(null);
          },
        },
        {
          label: "Circulo",
          action: () => {
            if (!editor) return;
            const center = editor.screenToPage(editor.getViewportScreenCenter());
            editor.createShape({
              type: "geo",
              x: center.x - 50,
              y: center.y - 50,
              props: { geo: "ellipse", w: 100, h: 100, color: "green", fill: "semi", richText: { type: "doc", content: [{ type: "paragraph", content: [] }] }, size: "m" },
            });
            setOpenMenu(null);
          },
        },
        {
          label: "Texto",
          action: () => {
            if (!editor) return;
            const center = editor.screenToPage(editor.getViewportScreenCenter());
            editor.createShape({
              type: "text",
              x: center.x - 50,
              y: center.y - 15,
              props: { richText: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Texto" }] }] }, size: "m", color: "black" },
            });
            setOpenMenu(null);
          },
        },
      ],
    },
    {
      id: "help",
      label: "Ayuda",
      items: [
        { label: "Atajos de teclado", action: () => { alert("Cmd+Z: Deshacer\nCmd+Shift+Z: Rehacer\nCmd+A: Seleccionar todo\nDel/Backspace: Eliminar\nCmd+0: Zoom 100%\nCmd++/-: Zoom\nShift+1: Zoom al contenido\nEspacio+Drag: Mover canvas"); setOpenMenu(null); } },
        { label: "divider", divider: true },
        { label: "Acerca de Strok.io", action: () => { alert("Strok.io — Canvas colaborativo en tiempo real"); setOpenMenu(null); } },
      ],
    },
  ];

  // ── Mobile layout ──
  if (isMobile) {
    return (
      <>
        <div
          ref={barRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 44,
            zIndex: 350,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 12px",
            paddingTop: "var(--sat)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setMobileDrawer(!mobileDrawer)}
            style={{
              width: 36,
              height: 36,
              border: "none",
              backgroundColor: mobileDrawer ? "#f3f4f6" : "transparent",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
              {mobileDrawer ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>

          {/* Logo */}
          <span style={{ fontSize: 15, fontWeight: 700, color: "#4f46e5", letterSpacing: "-0.02em" }}>
            Strok.io
          </span>

          {/* Spacer to center logo */}
          <div style={{ width: 36 }} />
        </div>

        {/* Mobile drawer overlay */}
        {mobileDrawer && (
          <>
            <div
              onClick={() => setMobileDrawer(false)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.3)",
                zIndex: 351,
              }}
            />
            <div
              style={{
                position: "fixed",
                top: 44,
                left: 0,
                bottom: 0,
                width: "75vw",
                maxWidth: 300,
                backgroundColor: "white",
                zIndex: 352,
                overflowY: "auto",
                padding: "8px 0",
                boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
                paddingTop: "var(--sat)",
                animation: "mobileDrawerIn 0.2s ease-out",
              }}
            >
              {menus.map((menu) => (
                <div key={menu.id}>
                  <div style={{ padding: "10px 16px 4px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {menu.label}
                  </div>
                  {menu.items.map((item, i) =>
                    item.divider ? null : (
                      <button
                        key={i}
                        onClick={() => { item.action?.(); setMobileDrawer(false); }}
                        disabled={item.disabled}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          border: "none",
                          backgroundColor: "transparent",
                          cursor: item.disabled ? "default" : "pointer",
                          fontSize: 14,
                          color: item.disabled ? "#d1d5db" : "#374151",
                          textAlign: "left",
                        }}
                      >
                        <span>{item.label}</span>
                      </button>
                    )
                  )}
                  <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "4px 12px" }} />
                </div>
              ))}
            </div>
          </>
        )}

        <style>{`
          @keyframes mobileDrawerIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </>
    );
  }

  // ── Desktop layout ──
  return (
    <div
      ref={barRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        zIndex: 350,
        display: "flex",
        alignItems: "stretch",
        backgroundColor: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e5e7eb",
        paddingLeft: 8,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          paddingRight: 12,
          fontSize: 14,
          fontWeight: 700,
          color: "#4f46e5",
          letterSpacing: "-0.02em",
          userSelect: "none",
        }}
      >
        Strok.io
      </div>

      {/* Menu items */}
      {menus.map((menu) => (
        <div key={menu.id} style={{ position: "relative" }}>
          <button
            onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => { if (openMenu) setOpenMenu(menu.id); }}
            style={{
              height: "100%",
              padding: "0 10px",
              border: "none",
              backgroundColor: openMenu === menu.id ? "#f3f4f6" : "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "#374151",
              fontWeight: 400,
              transition: "background 0.1s",
            }}
            onMouseLeave={(e) => {
              if (openMenu !== menu.id) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {menu.label}
          </button>

          {/* Dropdown */}
          {openMenu === menu.id && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                minWidth: 220,
                backgroundColor: "white",
                borderRadius: "0 0 8px 8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                border: "1px solid #e5e7eb",
                borderTop: "none",
                padding: "4px 0",
                zIndex: 360,
                animation: "menuFadeIn 0.1s ease-out",
              }}
            >
              {menu.items.map((item, i) =>
                item.divider ? (
                  <div key={i} style={{ height: 1, backgroundColor: "#f3f4f6", margin: "4px 8px" }} />
                ) : (
                  <button
                    key={i}
                    onClick={item.action}
                    disabled={item.disabled}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 14px",
                      border: "none",
                      backgroundColor: "transparent",
                      cursor: item.disabled ? "default" : "pointer",
                      fontSize: 13,
                      color: item.disabled ? "#d1d5db" : "#374151",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!item.disabled) e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 20 }}>{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}

      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
