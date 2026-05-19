import { useRef, useState, useCallback } from "react";
import type { BoardObject, Camera, EditingTarget } from "../types/board";

type UseTextEditorOptions = {
  camera: Camera;
  onCommit: (id: string, field: "title" | "content", value: string) => void;
};

export const CARD_PADDING = 14;
export const TITLE_FONT_SIZE = 20;
export const CONTENT_FONT_SIZE = 15;
export const TITLE_CONTENT_GAP = 10; // вертикальный отступ между заголовком и контентом

export type EditorState = {
  target: EditingTarget;
  value: string;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
};

// Высота заголовка — динамическая (зависит от текста и ширины карточки)
// Для расчёта позиции textarea используем приближение: 1..N строк
export function calcTitleHeight(
  title: string,
  cardWidth: number
): number {
  const innerW = cardWidth - CARD_PADDING * 2;
  const charsPerLine = Math.max(1, Math.floor(innerW / (TITLE_FONT_SIZE * 0.6)));
  const lines = Math.max(1, Math.ceil((title || "A").length / charsPerLine));
  return lines * (TITLE_FONT_SIZE * 1.4) + 8; // 8 — верт. padding
}

function calcEditorState(
  obj: BoardObject,
  field: "title" | "content",
  camera: Camera,
  currentValue?: string
): EditorState {
  const toScreen = (wx: number, wy: number) => ({
    x: wx * camera.zoom + camera.x,
    y: wy * camera.zoom + camera.y,
  });

  const innerX = obj.x + CARD_PADDING;
  const innerW = obj.width - CARD_PADDING * 2;
  const titleH = calcTitleHeight(obj.title ?? "", obj.width);

  let fieldY: number;
  let fieldHeight: number;
  let fontSize: number;
  let fontWeight: string;
  let lineHeight: number;

  if (field === "title") {
    fieldY = obj.y + CARD_PADDING;
    fieldHeight = titleH;
    fontSize = TITLE_FONT_SIZE;
    fontWeight = "700";
    lineHeight = 1.4;
  } else {
    fieldY = obj.y + CARD_PADDING + titleH + TITLE_CONTENT_GAP;
    fieldHeight = obj.height - CARD_PADDING - titleH - TITLE_CONTENT_GAP - CARD_PADDING;
    fontSize = CONTENT_FONT_SIZE;
    fontWeight = "400";
    lineHeight = 1.55;
  }

  const topLeft = toScreen(innerX, fieldY);
  const value =
    currentValue !== undefined
      ? currentValue
      : field === "title"
      ? (obj.title ?? "")
      : (obj.content ?? "");

  return {
    target: { objectId: obj.id, field },
    value,
    screenX: topLeft.x,
    screenY: topLeft.y,
    screenWidth: innerW * camera.zoom,
    screenHeight: fieldHeight * camera.zoom,
    fontSize: fontSize * camera.zoom,
    fontWeight,
    lineHeight,
  };
}

export function useTextEditor({ camera, onCommit }: UseTextEditorOptions) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openEditor = useCallback(
    (obj: BoardObject, field: "title" | "content") => {
      setEditor(calcEditorState(obj, field, camera));
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      });
    },
    [camera]
  );

  const updateEditorGeometry = useCallback(
    (obj: BoardObject) => {
      setEditor((prev) => {
        if (!prev || prev.target.objectId !== obj.id) return prev;
        return calcEditorState(obj, prev.target.field, camera, prev.value);
      });
    },
    [camera]
  );

  const closeEditor = useCallback(() => {
    if (!editor) return;
    onCommit(editor.target.objectId, editor.target.field, editor.value);
    setEditor(null);
  }, [editor, onCommit]);

  const handleChange = useCallback((value: string) => {
    setEditor((prev) => (prev ? { ...prev, value } : null));
  }, []);

  return {
    editor,
    textareaRef,
    openEditor,
    closeEditor,
    handleChange,
    updateEditorGeometry,
  };
}
