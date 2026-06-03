import { Rect, Image as KonvaImage, Transformer, Group, Text } from "react-konva";
import { Html } from "react-konva-utils";
import { memo, useEffect, useRef, useState, useCallback } from "react";
import type { BoardObject } from "../types/board";

const C = {
  border: "rgba(255,255,255,0.07)",
  borderSelected: "#4d4d57",
  anchorStroke: "#4d4d57",
  anchorFill: "#101418",
  shadow: "rgba(0,0,0,0.55)",
  dropzoneBg: "#1c1c22",
  dropzoneBorder: "rgba(255,255,255,0.12)",
  dropzoneHover: "rgba(87,193,255,0.08)",
  dropzoneBorderHover: "rgba(87,193,255,0.5)",
  tabBg: "#26262b",
  tabBorder: "rgba(255,255,255,0.09)",
  tabText: "rgba(255,255,255,0.65)",
  tabPlaceholder: "rgba(255,255,255,0.22)",
};

// Отступ сверху для кармашка (он выступает над карточкой)
const TAB_HEIGHT = 28;
const TAB_MIN_WIDTH = 80;
const TAB_PADDING_H = 10;
const TAB_FONT_SIZE = 12;
const TAB_CORNER = 6;

type Props = {
  object: BoardObject;
  draggable: boolean;
  listening: boolean;
  isSelected: boolean;
  editingField: "title" | "content" | null;

  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string, shift: boolean) => void;
  onGroupDragStart: (activeId: string, shift: boolean) => void;
  onGroupMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onResizeLive: (id: string, x: number, y: number, width: number, height: number) => void;
  onUpdateObject?: (id: string, patch: Partial<BoardObject>) => void;
};

function ImageCard({
  object,
  draggable,
  listening,
  isSelected,
  onMove,
  onSelect,
  onGroupDragStart,
  onGroupMove,
  onResize,
  onResizeLive,
  onUpdateObject,
}: Props) {
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isShiftRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!object.imageSrc;
  const hasCaption = object.caption !== undefined; // кармашек виден если не undefined
  const caption = object.caption ?? "";

  // Загружаем изображение в HTMLImageElement для Konva
  useEffect(() => {
    if (!object.imageSrc) {
      setKonvaImage(null);
      return;
    }
    const img = new window.Image();
    img.src = object.imageSrc;
    img.onload = () => setKonvaImage(img);
  }, [object.imageSrc]);

  // Transformer
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, hasImage]);

  // Фокус при редактировании caption
  useEffect(() => {
    if (editingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
      const len = captionInputRef.current.value.length;
      captionInputRef.current.setSelectionRange(len, len);
    }
  }, [editingCaption]);

  // Слушаем Shift для пропорционального ресайза
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") isShiftRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") isShiftRef.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Загрузка файла ───────────────────────────────────────────────────────────
  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return;
      // Подгоняем размер карточки под пропорции изображения
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight;
        const newWidth = object.width;
        const newHeight = Math.round(newWidth / aspect);
        onUpdateObject?.(object.id, {
          imageSrc: src,
          width: newWidth,
          height: newHeight,
        });
      };
    };
    reader.readAsDataURL(file);
  }, [object.id, object.width, onUpdateObject]);

  // ── Вставка из буфера обмена (глобально, когда карточка выбрана) ──────────
  useEffect(() => {
    if (!isSelected) return;
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) loadImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [isSelected, loadImageFile]);

  // ── Drag ─────────────────────────────────────────────────────────────────────
  function handlePointerDown(e: any) {
    e.cancelBubble = true;
    pointerStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    isDraggingRef.current = false;
  }

  function handlePointerMove(e: any) {
    if (!pointerStartRef.current) return;
    const dx = e.evt.clientX - pointerStartRef.current.x;
    const dy = e.evt.clientY - pointerStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      isDraggingRef.current = true;
      if (draggable && shapeRef.current && !shapeRef.current.isDragging()) {
        shapeRef.current.startDrag(e);
      }
    }
  }

  function handlePointerUp() {
    pointerStartRef.current = null;
  }

  function handleHtmlPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }

  function handleHtmlPointerMove(e: React.PointerEvent) {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      isDraggingRef.current = true;
      if (draggable && shapeRef.current && !shapeRef.current.isDragging()) {
        shapeRef.current.startDrag({ evt: e.nativeEvent });
      }
    }
  }

  function handleHtmlPointerUp() {
    pointerStartRef.current = null;
  }

  function handleDragStart(e: any) {
    isDraggingRef.current = true;
    const shift = e.evt.shiftKey;
    if (!isSelected) onSelect(object.id, shift);
    onGroupDragStart(object.id, shift);
  }

  function handleDragMove(e: any) {
    const x = e.target.x();
    const y = e.target.y();
    if (isSelected) onGroupMove(object.id, x, y);
    else onMove(object.id, x, y);
  }

  function handleDragEnd(e: any) {
    onMove(object.id, e.target.x(), e.target.y());
  }

  function handleClick(e: any) {
    if (isDraggingRef.current) return;
    onSelect(object.id, e.evt?.shiftKey ?? false);
  }

  // ── Resize ───────────────────────────────────────────────────────────────────
  function handleTransform() {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newW = Math.max(80, node.width() * scaleX);
    const newH = Math.max(60, node.height() * scaleY);
    node.width(newW);
    node.height(newH);
    node.scaleX(1);
    node.scaleY(1);
    onResizeLive(object.id, node.x(), node.y(), newW, newH);
  }

  function handleTransformEnd() {
    const node = shapeRef.current;
    if (!node) return;
    onResize(object.id, node.x(), node.y(), Math.max(80, node.width()), Math.max(60, node.height()));
  }

  // ── Caption: ширина кармашка ─────────────────────────────────────────────────
  const captionText = caption || "";
  const tabTextWidth = Math.max(
    TAB_MIN_WIDTH,
    captionText.length * TAB_FONT_SIZE * 0.58 + TAB_PADDING_H * 2 + 20 // +20 для крестика
  );
  const tabWidth = Math.min(tabTextWidth, object.width - 16);
  const tabX = object.x + 12; // небольшой отступ слева
  const tabY = object.y - TAB_HEIGHT + 4; // выступает над карточкой

  // ── Drop zone HTML ────────────────────────────────────────────────────────────
  // Показываем только если нет изображения
  const dropzoneY = object.y; // позиция в мировых координатах

  return (
    <>
      {/* ── Фон / placeholder ── */}
      <Rect
        ref={shapeRef}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={hasImage ? "transparent" : C.dropzoneBg}
        cornerRadius={hasImage ? 0 : 10}
        stroke={isSelected ? C.borderSelected : hasImage ? "transparent" : C.border}
        strokeWidth={isSelected ? 2 : 1}
        strokeScaleEnabled={false}
        shadowColor={C.shadow}
        shadowBlur={hasImage ? 20 : 0}
        shadowOffsetY={hasImage ? 6 : 0}
        shadowOpacity={0.6}
        draggable={draggable}
        listening={listening}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />

      {/* ── Картинка ── */}
      {hasImage && konvaImage && (
        <KonvaImage
          image={konvaImage}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          cornerRadius={4}
          listening={false}
        />
      )}

      {/* ── Drop zone (HTML-overlay когда нет картинки) ── */}
      {!hasImage && (
        <Html
          groupProps={{
            x: object.x,
            y: object.y,
            listening: true,
          }}
          divProps={{ style: { pointerEvents: "auto" } }}
        >
          <div
            onPointerDown={handleHtmlPointerDown}
            onPointerMove={handleHtmlPointerMove}
            onPointerUp={handleHtmlPointerUp}
            onClick={(e) => {
              e.stopPropagation();
              if (isDraggingRef.current) return;
              onSelect(object.id, e.shiftKey);
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) loadImageFile(file);
            }}
            style={{
              width: object.width,
              height: object.height,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderRadius: 10,
              border: `1.5px dashed ${isDragOver ? C.dropzoneBorderHover : C.dropzoneBorder}`,
              background: isDragOver ? C.dropzoneHover : "transparent",
              boxSizing: "border-box",
              cursor: "default",
              transition: "border-color 0.15s, background 0.15s",
              userSelect: "none",
            }}
          >
            {/* Иконка */}
            <div style={{ color: isDragOver ? "rgba(87,193,255,0.7)" : "rgba(255,255,255,0.18)", transition: "color 0.15s" }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="8" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 24L11 17L17 23L22 18L32 27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Текст */}
            <div style={{
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
              pointerEvents: "none",
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                {isDragOver ? "Отпусти для вставки" : "Перетащи или"}
              </div>
              {!isDragOver && (
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(87,193,255,0.7)",
                    cursor: "pointer",
                    pointerEvents: "auto",
                    textDecoration: "underline",
                    textDecorationColor: "rgba(87,193,255,0.35)",
                    textUnderlineOffset: 2,
                    marginTop: 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  выбери файл
                </div>
              )}
            </div>

            {/* Скрытый input[type=file] */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadImageFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </Html>
      )}

      {/* ── Кармашек (caption tab) ── */}
      {hasCaption && (
        <Html
          groupProps={{
            x: tabX,
            y: tabY,
            listening: true,
          }}
          divProps={{ style: { pointerEvents: "auto" } }}
        >
          <div
            onPointerDown={handleHtmlPointerDown}
            onPointerMove={handleHtmlPointerMove}
            onPointerUp={handleHtmlPointerUp}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: TAB_HEIGHT,
              maxWidth: object.width - 16,
              minWidth: TAB_MIN_WIDTH,
              background: C.tabBg,
              border: `1px solid ${C.tabBorder}`,
              borderBottom: "none",
              borderRadius: `${TAB_CORNER}px ${TAB_CORNER}px 0 0`,
              padding: `0 6px 0 ${TAB_PADDING_H}px`,
              boxSizing: "border-box",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.3)",
              userSelect: "none",
              cursor: "default",
            }}
          >
            {/* Текст / инпут */}
            {editingCaption ? (
              <input
                ref={captionInputRef}
                value={caption}
                onChange={(e) => onUpdateObject?.(object.id, { caption: e.target.value })}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === "Escape") setEditingCaption(false);
                }}
                onBlur={() => setEditingCaption(false)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  minWidth: 40,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: TAB_FONT_SIZE,
                  fontFamily: "system-ui, sans-serif",
                  padding: 0,
                  caretColor: "#4da3ff",
                }}
              />
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); if (!isDraggingRef.current) setEditingCaption(true); }}
                style={{
                  flex: 1,
                  fontSize: TAB_FONT_SIZE,
                  fontFamily: "system-ui, sans-serif",
                  color: caption ? C.tabText : C.tabPlaceholder,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: "text",
                  minWidth: 40,
                }}
              >
                {caption || "Название..."}
              </span>
            )}

            {/* Крестик */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                // Удаляем кармашек: caption становится undefined
                onUpdateObject?.(object.id, { caption: undefined });
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Убрать название"
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                color: "rgba(255,255,255,0.25)",
                cursor: "pointer",
                transition: "color 0.1s, background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.8)";
                (e.currentTarget as HTMLElement).style.background = "rgba(255,100,100,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </Html>
      )}

      {/* ── Transformer ── */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={true} // по умолчанию пропорционально
          borderStroke="#3a3a42"
          borderStrokeWidth={0}
          anchorStroke={C.anchorStroke}
          anchorFill={C.anchorFill}
          anchorSize={10}
          anchorCornerRadius={999}
          anchorStrokeWidth={2}
          ignoreStroke={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 80 || newBox.height < 60) return oldBox;
            // Непропорциональный ресайз только с Shift
            if (!isShiftRef.current) {
              const aspect = oldBox.width / oldBox.height;
              // Определяем ведущую ось
              const dw = Math.abs(newBox.width - oldBox.width);
              const dh = Math.abs(newBox.height - oldBox.height);
              if (dw >= dh) {
                return { ...newBox, height: newBox.width / aspect };
              } else {
                return { ...newBox, width: newBox.height * aspect };
              }
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default memo(ImageCard);
