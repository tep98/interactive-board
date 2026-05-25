import { useEffect, useRef } from "react";
import type { CardType } from "../types/board";

type CardOption = {
  type: CardType;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut: string;
};

const OPTIONS: CardOption[] = [
  {
    type: "text",
    label: "Текстовая карточка",
    description: "Заголовок и произвольный текст",
    shortcut: "T",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="2" rx="1" fill="currentColor" opacity="0.9" />
        <rect x="2" y="7" width="11" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
        <rect x="2" y="10" width="13" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
        <rect x="2" y="13" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
      </svg>
    ),
  },
  {
    type: "tasks",
    label: "Список задач",
    description: "Карточка с чекбоксами",
    shortcut: "L",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <path d="M3.5 5.5L4.5 6.5L7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <rect x="9" y="4.5" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.55" />
        <rect x="2" y="10" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <rect x="9" y="11.5" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
];

type Props = {
  /** Позиция меню в пикселях экрана (или null — скрыто) */
  position: { x: number; y: number } | null;
  onSelect: (type: CardType) => void;
  onClose: () => void;
};

export default function CardPickerMenu({ position, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику снаружи и Escape
  useEffect(() => {
    if (!position) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const opt = OPTIONS.find(
        (o) => o.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      if (opt) {
        e.preventDefault();
        onSelect(opt.type);
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [position, onClose, onSelect]);

  if (!position) return null;

  // Чтобы меню не выходило за правый/нижний край
  const menuW = 240;
  const menuH = OPTIONS.length * 60 + 16;
  const left = Math.min(position.x, window.innerWidth - menuW - 8);
  const top = Math.min(position.y, window.innerHeight - menuH - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left,
        top,
        width: menuW,
        background: "#1c1c22",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 16px 48px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)",
        zIndex: 1000,
        overflow: "hidden",
        padding: "6px",
        animation: "menuAppear 0.12s ease-out",
      }}
    >
      <style>{`
        @keyframes menuAppear {
          from { opacity: 0; transform: scale(0.93) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        style={{
          padding: "6px 10px 8px",
          fontSize: 10,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          fontWeight: 600,
        }}
      >
        Добавить карточку
      </div>

      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 10px",
            background: "transparent",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.1s",
            color: "#e8e8f0",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          {/* Иконка */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#b0b0c8",
            }}
          >
            {opt.icon}
          </div>

          {/* Текст */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 500,
                color: "#e8e8f0",
                lineHeight: 1.3,
              }}
            >
              {opt.label}
            </div>
            <div
              style={{
                fontSize: 11,
                fontFamily: "system-ui, sans-serif",
                color: "rgba(255,255,255,0.35)",
                lineHeight: 1.3,
                marginTop: 1,
              }}
            >
              {opt.description}
            </div>
          </div>

          {/* Shortcut */}
          <div
            style={{
              fontSize: 11,
              fontFamily: "system-ui, monospace",
              color: "rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              padding: "2px 6px",
              flexShrink: 0,
            }}
          >
            {opt.shortcut}
          </div>
        </button>
      ))}
    </div>
  );
}