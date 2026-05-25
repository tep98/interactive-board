import { Rect, Text, Transformer, Group } from "react-konva";
import { memo, useEffect, useRef, useState } from "react";
import type { BoardObject } from "../types/board";
import {
  CARD_PADDING,
  TITLE_FONT_SIZE,
  CONTENT_FONT_SIZE,
  TITLE_CONTENT_GAP,
  calcTitleHeight,
} from "../hooks/useTextEditor";

const C = {
  bg: "#26262b",
  bgHover: "#2c2c32",
  border: "rgba(255,255,255,0.07)",
  borderSelected: "#4d4d57",
  anchorStroke: "#4d4d57",
  anchorFill: "#101418",
  titleText: "#f0f0f0",
  titlePlaceholder: "rgba(255,255,255,0.18)",
  contentText: "#b8b8c4",
  contentPlaceholder: "rgba(255,255,255,0.13)",
  shadow: "rgba(0,0,0,0.55)",
};

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
  onEditTitle: (obj: BoardObject) => void;
  onEditContent: (obj: BoardObject) => void;
};

function TextCard({
  object,
  draggable,
  listening,
  isSelected,
  editingField,
  onMove,
  onSelect,
  onGroupDragStart,
  onGroupMove,
  onResize,
  onResizeLive,
  onEditTitle,
  onEditContent,
}: Props) {
  const isDraggingRef = useRef(false);
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const pointerStartRef = useRef<{
    x:number;
    y:number;
  } | null>(null);

  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const pad = CARD_PADDING;
  const innerW = object.width - pad * 2;
  const titleH = calcTitleHeight(object.title ?? "", object.width);

  const titleY = object.y + pad;
  const contentY = object.y + pad + titleH + TITLE_CONTENT_GAP;
  const contentH = object.height - pad - titleH - TITLE_CONTENT_GAP - pad;

  // ── Drag ────────────────────────────────────────────────────────────────────
  // Любой mousedown на карточке (включая текстовые поля) форсирует drag
  // на фоновом Rect через shapeRef.current.startDrag(e).
  // Дочерние Text/Rect имеют listening=true чтобы ловить события,
  // но drag идёт всегда через основной shape.

  function handlePointerDown(e: any) {
    e.cancelBubble = true;

    pointerStartRef.current = {
      x: e.evt.clientX,
      y: e.evt.clientY
    };

    isDraggingRef.current = false;
  }

  function handlePointerMove(e: any) {
    if (!pointerStartRef.current) return;

    const dx =
      e.evt.clientX -
      pointerStartRef.current.x;
    const dy =
      e.evt.clientY -
      pointerStartRef.current.y;
    const distance =
      Math.sqrt(dx * dx + dy * dy);

    // threshold
    if (distance > 4) {
      isDraggingRef.current = true;

      if (
        draggable &&
        shapeRef.current &&
        !shapeRef.current.isDragging()
      ) {
        shapeRef.current.startDrag(e);
      }
    }
  }

  function handlePointerUp() {
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
    if (isSelected) {
      onGroupMove(object.id, x, y);
    } else {
      onMove(object.id, x, y);
    }
  }

  function handleDragEnd(e: any) {
    onMove(object.id, e.target.x(), e.target.y());
  }

  // ── Клики ───────────────────────────────────────────────────────────────────
  // Срабатывают только если не было drag

  function handleTitleClick(e: any) {
    e.cancelBubble = true;
    if (isDraggingRef.current) return;
    onSelect(object.id, e.evt.shiftKey);
    onEditTitle(object);
  }

  function handleContentClick(e: any) {
    e.cancelBubble = true;
    if (isDraggingRef.current) return;
    onSelect(object.id, e.evt.shiftKey);
    onEditContent(object);
  }

  // Клик по фону (мимо текста) → открываем контент по умолчанию
  function handleBgClick(e: any) {
    if (isDraggingRef.current) return;
    onSelect(object.id, e.evt.shiftKey);
    onEditContent(object);
  }

  // ── Resize ──────────────────────────────────────────────────────────────────

  function handleTransform() {

    const node = shapeRef.current;

    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const newW = Math.max(
      160,
      node.width() * scaleX
    );

    const newH = Math.max(
      100,
      node.height() * scaleY
    );

    const newX = node.x();
    const newY = node.y();

    // IMPORTANT
    node.width(newW);
    node.height(newH);

    node.scaleX(1);
    node.scaleY(1);

    onResizeLive(
      object.id,
      newX,
      newY,
      newW,
      newH
    );

  }

  function handleTransformEnd() {

    const node = shapeRef.current;

    if (!node) return;

    const newW = Math.max(
      160,
      node.width()
    );

    const newH = Math.max(
      100,
      node.height()
    );

    onResize(
      object.id,
      node.x(),
      node.y(),
      newW,
      newH
    );

  }

  // Зона заголовка для клика: включает и область где рисуется текст,
  // и пустое пространство до контента
  const titleClickH = titleH + TITLE_CONTENT_GAP / 2;
  // Зона контента: от середины gap до низа карточки
  const contentClickY = object.y + pad + titleH + TITLE_CONTENT_GAP / 2;
  const contentClickH = object.height - pad - titleH - TITLE_CONTENT_GAP / 2 - pad;

  return (
    <>
      {/* ── Фон — единственный draggable ── */}
      <Rect
        ref={shapeRef}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={isHovered ? C.bgHover : C.bg}
        cornerRadius={10}
        shadowColor={C.shadow}
        shadowBlur={24}
        shadowOffsetY={8}
        shadowOpacity={0.7}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        stroke={isSelected ? C.borderSelected : C.border}
        strokeWidth={isSelected ? 2 : 1}
        draggable={draggable}
        listening={listening}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleBgClick}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />

      <Group
        clipX={object.x}
        clipY={object.y}
        clipWidth={object.width}
        clipHeight={object.height}
      >

      {/* ── Невидимая зона клика для заголовка ── */}
      <Rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={titleClickH}
        fill="transparent"
        listening={listening}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleTitleClick}
      />

      {/* ── Невидимая зона клика для контента ── */}
      <Rect
        x={object.x}
        y={contentClickY}
        width={object.width}
        height={contentClickH}
        fill="transparent"
        listening={listening}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleContentClick}
      />

      {/* ── Заголовок (или плейсхолдер) ── */}
      {editingField !== "title" && (
        <Text
          x={object.x + pad}
          y={titleY}
          width={innerW}
          text={object.title || "Заголовок"}
          fontSize={TITLE_FONT_SIZE}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          lineHeight={1.4}
          fill={object.title ? C.titleText : C.titlePlaceholder}
          wrap="word"
          listening={false} // клик ловим через прозрачный Rect выше
        />
      )}

      {/* ── Контент (или плейсхолдер) ── */}
      {editingField !== "content" && (
        <Text
          x={object.x + pad}
          y={contentY}
          width={innerW}
          height={contentH}
          text={object.content || "Текст"}
          fontSize={CONTENT_FONT_SIZE}
          fontFamily="system-ui, sans-serif"
          lineHeight={1.55}
          fill={object.content ? C.contentText : C.contentPlaceholder}
          wrap="word"
          ellipsis
          listening={false}
        />
      )}

      </Group>

      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={false}
          borderStroke="#3a3a42"
          borderStrokeWidth={0}
          anchorStroke= {C.anchorStroke}
          anchorFill= {C.anchorFill}
          anchorSize={10}
          anchorCornerRadius={999}
          anchorStrokeWidth={2}
          ignoreStroke={true}

          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 160 || newBox.height < 100) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default memo(TextCard);
