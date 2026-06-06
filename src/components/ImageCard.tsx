import { Rect, Image as KonvaImage, Transformer, Group, Text, Line } from "react-konva";
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

const TAB_HEIGHT = 28;
const TAB_MIN_WIDTH = 80;
const TAB_PADDING_H = 10;
const TAB_FONT_SIZE = 12;
const TAB_CORNER = 6;

// Цвета дропзоны для Konva (без HTML)
const DROPZONE_ICON_COLOR = "rgba(255,255,255,0.18)";
const DROPZONE_TEXT_COLOR = "rgba(255,255,255,0.45)";
const DROPZONE_LINK_COLOR = "rgba(87,193,255,0.7)";

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
  // Сохраняем начальную позицию указателя и позицию узла в момент начала drag
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const nodeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isShiftRef = useRef(false);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!object.imageSrc;
  const hasCaption = object.caption !== undefined;
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
  // По умолчанию ресайз НЕПРОПОРЦИОНАЛЬНЫЙ, Shift = ПРОПОРЦИОНАЛЬНЫЙ
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

  // ── Вставка из буфера обмена ─────────────────────────────────────────────────
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

  // ── Активация дроп-оверлея только при drag файла из ОС ──────────────────────
  // dragenter на window срабатывает когда файл входит в окно браузера;
  // dragleave на window — когда уходит за пределы окна.
  // Это позволяет держать pointerEvents:none в обычном режиме (не мешает Konva drag)
  // и включать оверлей только когда реально тащат файл.
  useEffect(() => {
    if (hasImage) return;
    let enterCount = 0; // счётчик для вложенных dragenter/dragleave
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      enterCount++;
      if (enterCount === 1) setIsDragOver(true);
    };
    const onLeave = () => {
      enterCount--;
      if (enterCount <= 0) { enterCount = 0; setIsDragOver(false); }
    };
    const onDrop = () => { enterCount = 0; setIsDragOver(false); };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [hasImage]);

  // ── Drag через Konva (для Rect-фона) ─────────────────────────────────────────
  function handlePointerDown(e: any) {
    e.cancelBubble = true;
    pointerStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    // Запоминаем текущую позицию узла
    if (shapeRef.current) {
      nodeStartRef.current = { x: shapeRef.current.x(), y: shapeRef.current.y() };
    }
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
    nodeStartRef.current = null;
  }

  // ── Drag через HTML (дропзона, кармашек) ─────────────────────────────────────
  // ИСПРАВЛЕНИЕ: при startDrag из HTML мышь уже не в "центре" узла —
  // нужно явно восстанавливать позицию узла, чтобы не было прыжка.



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
    // Пустая карточка — открыть файловый пикер по клику в любом месте
    if (!hasImage) {
      fileInputRef.current?.click();
    }
  }

  // Клик по дропзоне (Konva) — делегируем в handleClick
  function handleDropzoneClick(e: any) {
    handleClick(e);
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

  // ── Caption geometry ─────────────────────────────────────────────────────────
  const captionText = caption || "";
  const tabTextWidth = Math.max(
    TAB_MIN_WIDTH,
    captionText.length * TAB_FONT_SIZE * 0.58 + TAB_PADDING_H * 2 + 20
  );
  const tabWidth = Math.min(tabTextWidth, object.width - 16);
  const tabX = object.x + 12;
  const tabY = object.y - TAB_HEIGHT + 4;

  // ── Dropzone Konva geometry ───────────────────────────────────────────────────
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  const iconSize = 36;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2 - 20;
  const textY = iconY + iconSize + 10;
  const linkY = textY + 18;

  return (
    <>
      {/* ── Скрытый file input (в DOM, вне canvas) — управляется через fileInputRef ── */}
      {!hasImage && (
        <Html groupProps={{ x: 0, y: 0, listening: false }} divProps={{ style: { pointerEvents: "none" } }}>
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
        </Html>
      )}

      {/* ── Фон / placeholder ── */}
      <Rect
        ref={shapeRef}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={hasImage ? "transparent" : isDragOver ? C.dropzoneHover : C.dropzoneBg}
        cornerRadius={hasImage ? 0 : 10}
        stroke={
          isSelected
            ? C.borderSelected
            : hasImage
            ? "transparent"
            : isDragOver
            ? C.dropzoneBorderHover
            : C.dropzoneBorder
        }
        strokeWidth={isSelected ? 2 : 1.5}
        dash={hasImage ? undefined : [6, 4]}
        strokeScaleEnabled={false}
        shadowColor={C.shadow}
        shadowBlur={hasImage ? 20 : 0}
        shadowOffsetY={hasImage ? 6 : 0}
        shadowOpacity={0.6}
        draggable={draggable}
        listening={listening}
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

      {/* ── Дропзона (чистый Konva, без Html) ── */}
      {!hasImage && (
        <Group
          listening={listening}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onClick={handleDropzoneClick}
        >
          {/* Иконка изображения */}
          <Group x={iconX} y={iconY} listening={false}>
            {/* rect */}
            <Rect
              x={4 / 36 * iconSize}
              y={8 / 36 * iconSize}
              width={28 / 36 * iconSize}
              height={20 / 36 * iconSize}
              cornerRadius={3}
              stroke={isDragOver ? "rgba(87,193,255,0.7)" : DROPZONE_ICON_COLOR}
              strokeWidth={1.5}
              fill="transparent"
              listening={false}
            />
            {/* circle (солнце) — рисуем как маленький круг */}
            <Rect
              x={7.5 / 36 * iconSize}
              y={11.5 / 36 * iconSize}
              width={5 / 36 * iconSize}
              height={5 / 36 * iconSize}
              cornerRadius={999}
              stroke={isDragOver ? "rgba(87,193,255,0.7)" : DROPZONE_ICON_COLOR}
              strokeWidth={1.5}
              fill="transparent"
              listening={false}
            />
            {/* горы (линия) */}
            <Line
              points={[
                4 / 36 * iconSize, 27 / 36 * iconSize,
                11 / 36 * iconSize, 17 / 36 * iconSize,
                17 / 36 * iconSize, 23 / 36 * iconSize,
                22 / 36 * iconSize, 18 / 36 * iconSize,
                32 / 36 * iconSize, 27 / 36 * iconSize,
              ]}
              stroke={isDragOver ? "rgba(87,193,255,0.7)" : DROPZONE_ICON_COLOR}
              strokeWidth={1.5}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          </Group>

          {/* Текст "Перетащи или" */}
          <Text
            x={object.x}
            y={textY}
            width={object.width}
            text={isDragOver ? "Отпусти для вставки" : "Перетащи или"}
            fontSize={12}
            fontFamily="system-ui, sans-serif"
            fill={DROPZONE_TEXT_COLOR}
            align="center"
            listening={false}
          />

          {/* Ссылка "выбери файл" */}
          {!isDragOver && (
            <Text
              x={object.x}
              y={linkY}
              width={object.width}
              text="выбери файл"
              fontSize={12}
              fontFamily="system-ui, sans-serif"
              fill={DROPZONE_LINK_COLOR}
              align="center"
              listening={false}
            />
          )}
        </Group>
      )}

      {/* ── Drag-over overlay (подсветка при перетаскивании файла в браузер) ── */}
      {!hasImage && (
        <Html
          groupProps={{ x: object.x, y: object.y, listening: false }}
          divProps={{ style: { pointerEvents: "none", zIndex: 0 } }}
        >
          <div
            style={{
              width: object.width,
              height: object.height,
              position: "absolute",
              top: 0,
              left: 0,
              background: "transparent",
              pointerEvents: isDragOver ? "auto" : "none",
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) loadImageFile(file);
            }}
          />
        </Html>
      )}

      {/* ── Кармашек (caption tab) — чистый Konva, без Html ── */}
      {hasCaption && (
        <>
          {/* Фон кармашка */}
          <Rect
            x={tabX}
            y={tabY}
            width={tabWidth}
            height={TAB_HEIGHT}
            fill={C.tabBg}
            cornerRadius={[TAB_CORNER, TAB_CORNER, 0, 0]}
            stroke={C.tabBorder}
            strokeWidth={1}
            strokeScaleEnabled={false}
            shadowColor="rgba(0,0,0,0.3)"
            shadowBlur={12}
            shadowOffsetY={-4}
            listening={listening}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onClick={(e) => {
              e.cancelBubble = true;
              if (isDraggingRef.current) return;
              onSelect(object.id, e.evt.shiftKey);
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />

          {/* Текст кармашка */}
          {!editingCaption && (
            <Text
              x={tabX + TAB_PADDING_H}
              y={tabY + (TAB_HEIGHT - TAB_FONT_SIZE) / 2}
              width={tabWidth - TAB_PADDING_H - 22} // 22 = место для крестика
              height={TAB_FONT_SIZE + 4}
              text={caption || "Название..."}
              fontSize={TAB_FONT_SIZE}
              fontFamily="system-ui, sans-serif"
              fill={caption ? C.tabText : C.tabPlaceholder}
              ellipsis
              wrap="none"
              listening={listening}
              onDblClick={(e) => {
                e.cancelBubble = true;
                setEditingCaption(true);
              }}
            />
          )}

          {/* Крестик — удалить кармашек */}
          <Text
            x={tabX + tabWidth - 20}
            y={tabY + (TAB_HEIGHT - 14) / 2}
            width={14}
            height={14}
            text="✕"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
            fill="rgba(255,255,255,0.25)"
            align="center"
            listening={listening}
            onClick={(e) => {
              e.cancelBubble = true;
              onUpdateObject?.(object.id, { caption: undefined });
            }}
          />

          {/* HTML инпут для редактирования caption — остаётся Html, но только когда активен */}
          {editingCaption && (
            <Html
              groupProps={{ x: tabX + TAB_PADDING_H, y: tabY + (TAB_HEIGHT - 18) / 2, listening: false }}
              divProps={{ style: { pointerEvents: "auto" } }}
            >
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
                  width: tabWidth - TAB_PADDING_H - 22,
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
            </Html>
          )}
        </>
      )}

      {/* ── Transformer ── */}
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={true}
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
            // Shift = пропорционально, без Shift = свободно
            if (isShiftRef.current) {
              const aspect = oldBox.width / oldBox.height;
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