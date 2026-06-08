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
  {
    type: "image",
    label: "Изображение",
    description: "Картинка из файла или буфера",
    shortcut: "I",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <circle cx="6.5" cy="8" r="1.5" fill="currentColor" opacity="0.7" />
        <path d="M2 13L6 9L9.5 12.5L12 10L16 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    ),
  },
];

export type FileActions = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  isDirty: boolean;
  fileName: string | null | undefined;
};

type Props = {
  position: { x: number; y: number } | null;
  onSelect: (type: CardType) => void;
  onClose: () => void;
  fileActions?: FileActions;
};

export default function CardPickerMenu({ position, onSelect, onClose, fileActions }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      const opt = OPTIONS.find((o) => o.shortcut.toLowerCase() === e.key.toLowerCase());
      if (opt) { e.preventDefault(); onSelect(opt.type); }
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [position, onClose, onSelect]);

  if (!position) return null;

  const menuW = 240;
  // Высота: карточки + разделитель + файловые кнопки (если есть)
  const cardsSectionH = OPTIONS.length * 60 + 16 + 24;
  const fileSectionH = fileActions ? 1 + 8 + 30 + 3 + 30 + 10 : 0;
  const menuH = cardsSectionH + fileSectionH;
  const left = Math.min(position.x, window.innerWidth - menuW - 8);
  const top = Math.min(position.y, window.innerHeight - menuH - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left, top,
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

      {/* ── Заголовок ── */}
      <div style={{
        padding: "6px 10px 8px",
        fontSize: 10, fontFamily: "system-ui, sans-serif",
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.28)", fontWeight: 600,
      }}>
        Добавить карточку
      </div>

      {/* ── Варианты карточек ── */}
      {OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 10px", background: "transparent", border: "none",
            borderRadius: 8, cursor: "pointer", textAlign: "left",
            transition: "background 0.1s", color: "#e8e8f0",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "#b0b0c8",
          }}>
            {opt.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontFamily: "system-ui, sans-serif", fontWeight: 500, color: "#e8e8f0", lineHeight: 1.3 }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 11, fontFamily: "system-ui, sans-serif", color: "rgba(255,255,255,0.35)", lineHeight: 1.3, marginTop: 1 }}>
              {opt.description}
            </div>
          </div>
          <div style={{
            fontSize: 11, fontFamily: "system-ui, monospace",
            color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)",
            borderRadius: 4, padding: "2px 6px", flexShrink: 0,
          }}>
            {opt.shortcut}
          </div>
        </button>
      ))}

      {/* ── Файловые операции ── */}
      {fileActions && (
        <>
          <div style={{ margin: "6px 6px", height: 1, background: "rgba(255,255,255,0.07)" }} />

          <div style={{ padding: "4px 4px 6px", display: "flex", flexDirection: "column", gap: 3 }}>

            {/* Строка 1: Новый + Открыть */}
            <div style={{ display: "flex", gap: 3 }}>
              <FileRowButton
                active={false}
                onClick={() => { fileActions.onNew(); onClose(); }}
                title="Ctrl+N"
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M9 1L13 5M9 1V5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 14H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                }
                label="Новый"
              />
              <FileRowButton
                active={false}
                onClick={() => { fileActions.onOpen(); onClose(); }}
                title="Ctrl+O"
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 5C2 4.44772 2.44772 4 3 4H6.38197L7.72361 6H13C13.5523 6 14 6.44772 14 7V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V5Z" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                }
                label="Открыть"
              />
            </div>

            {/* Строка 2: Сохранить + Сохранить как */}
            <div style={{ display: "flex", gap: 3 }}>
              <FileRowButton
                active={fileActions.isDirty}
                onClick={() => { fileActions.onSave(); onClose(); }}
                title="Ctrl+S"
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="5" y="2" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="4" y="8" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                }
                label={fileActions.isDirty ? "Сохранить •" : "Сохранить"}
              />
              <FileRowButton
                active={false}
                onClick={() => { fileActions.onSaveAs(); onClose(); }}
                title="Ctrl+Shift+S"
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="5" y="2" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="4" y="8" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M10 4.5L12 6.5L10 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
                label="Сохр. как"
              />
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ── Кнопка файловой операции (иконка + метка в строчку) ──────────────────────
function FileRowButton({
  icon, label, title, onClick, active = false,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        height: 30, padding: "0 8px",
        borderRadius: 7, cursor: "pointer",
        background: active ? "rgba(77,163,255,0.1)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(77,163,255,0.25)" : "1px solid transparent",
        color: active ? "#4da3ff" : "rgba(255,255,255,0.45)",
        fontSize: 12, fontFamily: "system-ui, sans-serif", fontWeight: 500,
        transition: "background 0.1s, color 0.1s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
        }
      }}
    >
      {icon}
      {label}
    </button>
  );
}