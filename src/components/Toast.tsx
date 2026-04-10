"use client";

import { useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onDismiss: () => void;
}

const variantColors: Record<ToastVariant, string> = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#3b82f6",
};

export default function Toast({ message, variant = "info", onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 10000,
        backgroundColor: variantColors[variant],
        color: "white",
        padding: "10px 18px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.2s, transform 0.2s",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
  );
}
