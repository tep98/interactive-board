import { useEffect } from "react";
import type { EditorState } from "../hooks/useTextEditor";

type Props = {
  editor: EditorState;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onClose: () => void;
};

export default function FloatingEditor({
  editor,
  textareaRef,
  onChange,
  onClose,
}: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && editor.target.field === "title") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, editor.target.field]);

  const isTitle = editor.target.field === "title";

  return (
    <textarea
      ref={textareaRef}
      value={editor.value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onClose}
      onKeyDown={(e) => e.stopPropagation()}
      placeholder={isTitle ? "Заголовок..." : "Текст..."}
      style={{
        position: "fixed",
        left: editor.screenX,
        top: editor.screenY,
        width: editor.screenWidth,
        height: editor.screenHeight,

        fontSize: editor.fontSize,
        fontWeight: editor.fontWeight,
        fontFamily: "system-ui, sans-serif",
        lineHeight: editor.lineHeight,
        color: isTitle ? "#f0f0f0" : "#b8b8c4",

        background: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        scrollbarWidth: "none",

        pointerEvents: "auto",
        zIndex: 100,
        caretColor: "#4da3ff",
      }}
    />
  );
}