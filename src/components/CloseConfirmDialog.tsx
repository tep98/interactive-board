import { useEffect, useRef } from "react";
import type { CloseDialogResult } from "../hooks/useCloseGuard";

type Props = {
  onResult: (result: CloseDialogResult) => void;
};

/**
 * Модальное окно подтверждения при выходе.
 * Показывается поверх всего, блокирует взаимодействие с остальным UI.
 * Три кнопки: Сохранить / Не сохранять / Отмена
 */
export default function CloseConfirmDialog({ onResult }: Props) {
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Фокус на кнопку "Сохранить" при появлении
  useEffect(() => {
    saveButtonRef.current?.focus();
  }, []);

  // Escape = отмена
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onResult("cancel");
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onResult]);

  return (
    <>
      {/* Затемнение фона */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(2px)",
          zIndex: 9998,
        }}
        onClick={() => onResult("cancel")}
      />

      {/* Диалог */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: 360,
          background: "#1e1e24",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)",
          padding: "28px 24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          animation: "dialogIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes dialogIn {
            from { opacity: 0; transform: translate(-50%, calc(-50% - 8px)); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
          }
        `}</style>

        {/* Иконка */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: "50%",
            background: "rgba(255, 193, 7, 0.12)",
            border: "1px solid rgba(255, 193, 7, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3L18 17H2L10 3Z" stroke="#ffc107" strokeWidth="1.5"
                strokeLinejoin="round"/>
              <path d="M10 8V12" stroke="#ffc107" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="10" cy="14.5" r="0.75" fill="#ffc107"/>
            </svg>
          </div>
        </div>

        {/* Заголовок */}
        <div style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 16,
          fontWeight: 600,
          color: "#f0f0f0",
          textAlign: "center",
          marginBottom: 8,
        }}>
          Несохранённые изменения
        </div>

        {/* Описание */}
        <div style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 1.5,
          marginBottom: 24,
        }}>
          Хочешь сохранить изменения перед выходом?
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Сохранить */}
          <button
            ref={saveButtonRef}
            onClick={() => onResult("save")}
            style={{
              width: "100%",
              height: 40,
              background: "#3b82f6",
              border: "none",
              borderRadius: 9,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#2563eb")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#3b82f6")}
          >
            Сохранить
          </button>

          {/* Не сохранять */}
          <button
            onClick={() => onResult("discard")}
            style={{
              width: "100%",
              height: 40,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 9,
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
          >
            Не сохранять
          </button>

          {/* Отмена */}
          <button
            onClick={() => onResult("cancel")}
            style={{
              width: "100%",
              height: 36,
              background: "transparent",
              border: "none",
              borderRadius: 9,
              color: "rgba(255,255,255,0.35)",
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              cursor: "pointer",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
          >
            Отмена
          </button>
        </div>
      </div>
    </>
  );
}
