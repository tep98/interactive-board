import { Rect, Text, Transformer } from "react-konva";
import { Html } from "react-konva-utils";
import { memo, useEffect, useRef, useState } from "react";
import type { BoardObject, TaskItem } from "../types/board";
import { CARD_PADDING, TITLE_FONT_SIZE } from "../hooks/useTextEditor";

const C = {
  bg: "#202025",
  bgHover: "#23232a",
  border: "rgba(255,255,255,0.07)",
  borderSelected: "#4d4d57",
  anchorStroke: "#4d4d57",
  anchorFill: "#101418",
  titleText: "#f0f0f0",
  titlePlaceholder: "rgba(255,255,255,0.18)",
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
  onUpdateTasks?: (id: string, tasks: TaskItem[]) => void;
  onUpdateObject?: (id: string, patch: Partial<BoardObject>) => void;
};

const TASKS_TITLE_H = TITLE_FONT_SIZE * 1.4 + 8 + CARD_PADDING;
const TOOLBAR_BTN_SIZE = TITLE_FONT_SIZE; // размер кнопки = размер символа заголовка

// SVG иконка: список без чекбоксов
const IconList = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="2" cy="3" r="1.2" fill="currentColor" />
    <rect x="5" y="2.2" width="6" height="1.5" rx="0.75" fill="currentColor" />
    <circle cx="2" cy="6" r="1.2" fill="currentColor" />
    <rect x="5" y="5.2" width="6" height="1.5" rx="0.75" fill="currentColor" />
    <circle cx="2" cy="9" r="1.2" fill="currentColor" />
    <rect x="5" y="8.2" width="6" height="1.5" rx="0.75" fill="currentColor" />
  </svg>
);

// SVG иконка: замок
const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2.5" y="5.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="6" cy="8" r="1" fill="currentColor" />
  </svg>
);

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: TOOLBAR_BTN_SIZE,
        height: TOOLBAR_BTN_SIZE,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: active
          ? "rgba(255,255,255,0.9)"
          : hovered
          ? "rgba(255,255,255,0.12)"
          : "transparent",
        color: active ? "#1e1e24" : "rgba(255,255,255,0.45)",
        transition: "background 0.12s, color 0.12s",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function TasksCard({
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
  onUpdateTasks,
  onUpdateObject,
}: Props) {
  const isDraggingRef = useRef(false);
  const shapeRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const tasks: TaskItem[] = object.tasks ?? [];
  const checkboxMode = object.checkboxMode !== false; // по умолчанию true
  const tasksLocked = object.tasksLocked === true;

  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      const len = titleInputRef.current.value.length;
      titleInputRef.current.setSelectionRange(len, len);
    }
  }, [editingTitle]);

  // ── Drag ────────────────────────────────────────────────────────────────────
  function handlePointerDown(e: any) {
    e.cancelBubble = true;
    pointerStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
    isDraggingRef.current = false;
  }

  function handleHtmlPointerDown(e: React.MouseEvent) {
    e.stopPropagation();

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    isDraggingRef.current = false;
  }

  function handleHtmlPointerMove(e: React.MouseEvent) {
    if (!pointerStartRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      isDraggingRef.current = true;

      if (
        draggable &&
        shapeRef.current &&
        !shapeRef.current.isDragging()
      ) {
        shapeRef.current.startDrag({
          evt: e.nativeEvent,
        });
      }
    }
  }

  function handleHtmlPointerUp() {
    pointerStartRef.current = null;
  }

  function handleHtmlClick(e: React.MouseEvent) {
    if (isDraggingRef.current) return;

    onSelect(object.id, e.shiftKey);
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

  function handleBgClick(e: any) {
    if (isDraggingRef.current) return;
    onSelect(object.id, e.evt.shiftKey);
  }

  // ── Resize ──────────────────────────────────────────────────────────────────
  function handleTransform() {
    const node = shapeRef.current;
    if (!node) return;
    const newW = Math.max(180, node.width() * node.scaleX());
    const newH = Math.max(120, node.height() * node.scaleY());
    node.width(newW); node.height(newH);
    node.scaleX(1); node.scaleY(1);
    onResizeLive(object.id, node.x(), node.y(), newW, newH);
  }

  function handleTransformEnd() {
    const node = shapeRef.current;
    if (!node) return;
    onResize(object.id, node.x(), node.y(), Math.max(180, node.width()), Math.max(120, node.height()));
  }

  // ── Tasks logic ─────────────────────────────────────────────────────────────
  function toggleTask(taskId: string) {
    if (tasksLocked) return;
    const updated = tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t);
    onUpdateTasks?.(object.id, updated);
  }

  function updateTaskText(taskId: string, text: string) {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, text } : t));
    onUpdateTasks?.(object.id, updated);
  }

  function addTask() {
    const newTask: TaskItem = { id: crypto.randomUUID(), text: "", done: false };
    const updated = [...tasks, newTask];
    onUpdateTasks?.(object.id, updated);
    setEditingTaskId(newTask.id);
  }

  function deleteTask(taskId: string) {
    const updated = tasks.filter((t) => t.id !== taskId);
    onUpdateTasks?.(object.id, updated);
    if (editingTaskId === taskId) setEditingTaskId(null);
  }

  function handleTaskKeyDown(e: React.KeyboardEvent, taskId: string, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Создаём новый таск после текущего
      const newTask: TaskItem = { id: crypto.randomUUID(), text: "", done: false };
      const updated = [...tasks.slice(0, idx + 1), newTask, ...tasks.slice(idx + 1)];
      onUpdateTasks?.(object.id, updated);
      setEditingTaskId(newTask.id);
    }
    if (e.key === "Backspace" && tasks[idx].text === "") {
      e.preventDefault();
      deleteTask(taskId);
      const prevId = tasks[idx - 1]?.id;
      if (prevId) setEditingTaskId(prevId);
    }
    if (e.key === "Escape") setEditingTaskId(null);
  }

  // Ghost row — всегда пустая строка в конце, при вводе создаёт таск
  const [ghostText, setGhostText] = useState("");
  const [ghostFocused, setGhostFocused] = useState(false);

  function handleGhostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.trim() !== "") {
      // создаём новый таск с этим текстом
      const newTask: TaskItem = { id: crypto.randomUUID(), text: val, done: false };
      onUpdateTasks?.(object.id, [...tasks, newTask]);
      setEditingTaskId(newTask.id);
      setGhostText("");
    } else {
      setGhostText(val);
    }
  }

  function handleGhostKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
      setGhostText("");
    }
    if (e.key === "Escape") {
      setGhostFocused(false);
      setGhostText("");
    }
  }

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      {/* ── Фон ── */}
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
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
      />

      {/* ── Заголовок на canvas ── */}


      {editingField !== "title" && (
        <Text
          x={object.x + CARD_PADDING}
          y={object.y + CARD_PADDING}
          width={object.width - CARD_PADDING * 2 - (TOOLBAR_BTN_SIZE + 4) * 2 - 4}
          text={object.title || "Список"}
          fontSize={TITLE_FONT_SIZE}
          fontStyle="bold"
          fontFamily="system-ui, sans-serif"
          lineHeight={1.4}
          fill={object.title ? C.titleText : C.titlePlaceholder}
          wrap="word"
          listening={false}
        />
      )}

      {/* ── Счётчик прогресса ── */}
      {tasks.length > 0 && (
        <Text
          x={object.x + CARD_PADDING}
          y={object.y + TASKS_TITLE_H - 4}
          width={object.width - CARD_PADDING * 2}
          text={`${doneCount} / ${tasks.length}`}
          fontSize={11}
          fontFamily="system-ui, sans-serif"
          fill="rgba(255,255,255,0.28)"
          listening={false}
        />
      )}

      {/* ── HTML-оверлей ── */}
      <Html
        groupProps={{ x: object.x, y: object.y }}
      >
        <div
          onMouseDown={handleHtmlPointerDown}
          onMouseMove={handleHtmlPointerMove}
          onMouseUp={handleHtmlPointerUp}
          onClick={handleHtmlClick}
          style={{
            width: object.width,
            height: object.height,
            overflow: "hidden",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* ── Тулбар (правый верхний угол) ── */}
          <div
            style={{
              position: "absolute",
              top: CARD_PADDING,
              right: CARD_PADDING,
              display: "flex",
              gap: 4,
              zIndex: 2,
            }}
          >
            {checkboxMode &&
              <ToolbarButton
                active={tasksLocked}
                title="Заблокировать чекбоксы"
                onClick={() =>
                  onUpdateObject?.(object.id, { tasksLocked: !tasksLocked })
                }
              >
                <IconLock />
              </ToolbarButton>
            }

            <ToolbarButton
              active={!checkboxMode}
              title="Список без чекбоксов"
              onClick={() =>
                onUpdateObject?.(object.id, { checkboxMode: checkboxMode ? false : true })
              }
            >
              <IconList />
            </ToolbarButton>
          </div>

          {/* ── Заголовок (редактируемый) ── */}
          {editingTitle ? (
            <input
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              ref={titleInputRef}
              value={object.title ?? ""}
              onChange={(e) =>
                onUpdateObject?.(object.id, { title: e.target.value })
              }
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
              }}
              placeholder="Список"
              style={{
                position: "absolute",
                top: CARD_PADDING,
                left: CARD_PADDING,
                width: object.width - CARD_PADDING * 2 - (TOOLBAR_BTN_SIZE + 4) * 2 - 4,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f0f0f0",
                fontSize: TITLE_FONT_SIZE,
                fontWeight: "700",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.4,
                caretColor: "#4da3ff",
                padding: 0,
              }}
            />
          ) : (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setEditingTitle(true)}
              style={{
                position: "absolute",
                top: CARD_PADDING,
                left: CARD_PADDING,
                width: object.width - CARD_PADDING * 2 - (TOOLBAR_BTN_SIZE + 4) * 2 - 4,
                height: TITLE_FONT_SIZE * 1.4 + 8,
                cursor: "text",
              }}
            />
          )}

          {/* ── Список задач ── */}
          <div
            style={{
              position: "absolute",
              top: TASKS_TITLE_H + (tasks.length > 0 ? 16 : 0),
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: "auto",
              paddingLeft: CARD_PADDING,
              paddingRight: CARD_PADDING,
              paddingBottom: CARD_PADDING,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              scrollbarWidth: "none",
            }}
          >
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "3px 4px 3px 6px",
                  borderRadius: 6,
                  background: "transparent",
                  transition: "background 0.12s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  const del = e.currentTarget.querySelector<HTMLElement>(".task-delete");
                  if (del) del.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  const del = e.currentTarget.querySelector<HTMLElement>(".task-delete");
                  if (del) del.style.opacity = "0";
                }}
              >
                {/* Checkbox или буллет */}
                {checkboxMode ? (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      width: 16, height: 16, minWidth: 16,
                      borderRadius: 4,
                      border: tasksLocked
                        ? "2px solid rgba(255, 0, 0, 0.15)"
                        : task.done
                        ? "2px solid #6b6b6e"
                        : "2px solid #6b6b6e",
                      background: tasksLocked ? "transparent" : task.done ? "#6b6b6e" : "transparent",
                      cursor: tasksLocked ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                      transition: "all 0.12s",
                      flexShrink: 0,
                    }}
                  >
                    {task.done && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div style={{
                    width: 5, height: 5, minWidth: 5,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.35)",
                    marginTop: 1, flexShrink: 0,
                  }} />
                )}

                {/* Текст задачи */}
                {editingTaskId === task.id ? (
                  <input
                    onMouseDown={(e) => e.stopPropagation()}
                    autoFocus
                    value={task.text}
                    onChange={(e) => updateTaskText(task.id, e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      handleTaskKeyDown(e, task.id, idx);
                    }}
                    onBlur={() => {
                      setEditingTaskId(null);
                      if (task.text.trim() === "") deleteTask(task.id);
                    }}
                    style={{
                      textAlign: "center",
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#e0e0e8",
                      fontSize: 13,
                      fontFamily: "system-ui, sans-serif",
                      lineHeight: "1.45",
                      padding: 0,
                      caretColor: "#4da3ff",
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingTaskId(task.id)}
                    style={{
                      flex: 1,
                      color: (task.done && checkboxMode) ? "rgba(255,255,255,0.3)" : "#c8c8d4",
                      fontSize: 13,
                      fontFamily: "system-ui, sans-serif",
                      lineHeight: "1.45",
                      textDecoration: (task.done && checkboxMode) ? "line-through" : "none",
                      cursor: "text",
                      wordBreak: "break-word",
                      minHeight: 18,
                    }}
                  >
                    {task.text || <span style={{ color: "rgba(255,255,255,0.18)" }}>Новая задача</span>}
                  </span>
                )}

                {/* Кнопка удаления */}
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="task-delete"
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                  style={{
                    opacity: 0,
                    width: 16, height: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.35)",
                    borderRadius: 4,
                    flexShrink: 0,
                    transition: "opacity 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.8)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Ghost row — всегда в конце */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "3px 4px 3px 6px", borderRadius: 6,
                background: ghostFocused ? "rgba(255,255,255,0.04)" : "transparent",
              }}
            >
              {checkboxMode ? (
                <div style={{
                  width: 16, height: 16, minWidth: 16, borderRadius: 4,
                  border: "2px dashed rgba(255,255,255,0.12)",
                  flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 5, height: 5, minWidth: 5, borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)", flexShrink: 0, marginTop: 1,
                }} />
              )}
              <input
                onMouseDown={(e) => e.stopPropagation()}
                value={ghostText}
                onChange={handleGhostChange}
                onKeyDown={(e) => { e.stopPropagation(); handleGhostKeyDown(e); }}
                onFocus={() => setGhostFocused(true)}
                onBlur={() => { setGhostFocused(false); setGhostText(""); }}
                placeholder="добавить пункт..."
                style={{
                  textAlign: "center",
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e0e0e8",
                  fontSize: 13,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: "1.45",
                  padding: 0,
                  caretColor: "#4da3ff",
                  userSelect: ghostText ? "text" : "none",
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  "::placeholder": { color: "rgba(255,255,255,0.22)" },
                }}
              />
            </div>
          </div>
        </div>
      </Html>

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
            if (newBox.width < 220 || newBox.height < 160) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default memo(TasksCard);