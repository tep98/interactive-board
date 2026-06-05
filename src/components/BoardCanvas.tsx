import { Stage, Layer, Rect } from "react-konva";
import { useRef, useState } from "react";
import BoardObjectRenderer from "./BoardObjectRenderer";
import FloatingEditor from "./FloatingEditor";
import type { BoardObject, InteractionMode, Camera, TaskItem } from "../types/board";
import Grid from "./Grid";
import { snap } from "../utils/snap";
import { useTextEditor } from "../hooks/useTextEditor";

type Props = {
  objects: BoardObject[];
  setObjects: React.Dispatch<React.SetStateAction<BoardObject[]>>;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  isSpacePressed: boolean;
  isPointerInside: boolean;
  setIsPointerInside: (value: boolean) => void;
  pointerRef: React.MutableRefObject<{ x: number; y: number } | null>;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onUpdateTasks?: (id: string, tasks: TaskItem[]) => void;
  onUpdateObject?: (id: string, patch: Partial<BoardObject>) => void;
  onContextMenu?: (screenX: number, screenY: number, worldX: number, worldY: number) => void;
};

export default function BoardCanvas({
  objects,
  setObjects,
  camera,
  setCamera,
  mode,
  setMode,
  isSpacePressed,
  isPointerInside,
  setIsPointerInside,
  pointerRef,
  selectedIds,
  setSelectedIds,
  onUpdateTasks,
  onUpdateObject,
  onContextMenu,
}: Props) {
  const stageRef = useRef(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const groupDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const {
    editor,
    textareaRef,
    openEditor,
    closeEditor,
    handleChange,
    updateEditorGeometry,
  } = useTextEditor({
    camera,
    onCommit(id, field, value) {
      setObjects((prev) =>
        prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
      );
    },
  });

  const editingObjectId = editor?.target.objectId ?? null;
  const editingField = editor?.target.field ?? null;

  function moveObject(id: string, x: number, y: number) {
    const gridSize = 25;
    setObjects((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, x: snap(x, gridSize), y: snap(y, gridSize) } : o
      )
    );
  }

  function resizeObject(id: string, x: number, y: number, width: number, height: number) {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, x, y, width, height } : o))
    );
  }

  function resizeObjectLive(id: string, x: number, y: number, width: number, height: number) {
    setObjects((prev) => {
      const updated = prev.map((o) =>
        o.id === id ? { ...o, x, y, width, height } : o
      );
      if (editingObjectId === id) {
        const obj = updated.find((o) => o.id === id);
        if (obj) updateEditorGeometry(obj);
      }
      return updated;
    });
  }

  function handleSelect(
    id: string,
    shift: boolean
  ) {
    setObjects(prev => {
      const target =
        prev.find(o => o.id === id);

      if (!target) return prev;

      const without =
        prev.filter(o => o.id !== id);

      return [
        ...without,
        target
      ];
    });

    if (shift) {
      setSelectedIds(prev =>
        prev.includes(id)
          ? prev.filter(x => x !== id)
          : [...prev, id]
      );

    } else {
      setSelectedIds([id]);
    }
  }
  

  function screenToWorld(pointer: { x: number; y: number }) {
    return {
      x: (pointer.x - camera.x) / camera.zoom,
      y: (pointer.y - camera.y) / camera.zoom,
    };
  }

  function startGroupDrag(activeId: string, shift: boolean) {
    const positions = new Map<string, { x: number; y: number }>();
    const dragSelection = selectedIds.includes(activeId)
      ? selectedIds
      : shift
      ? [...selectedIds, activeId]
      : [activeId];

    objects.forEach((obj) => {
      if (dragSelection.includes(obj.id)) {
        positions.set(obj.id, { x: obj.x, y: obj.y });
      }
    });
    groupDragStartRef.current = positions;
  }

  function moveGroup(draggedId: string, newX: number, newY: number) {
    const draggedStart = groupDragStartRef.current.get(draggedId);
    if (!draggedStart) return;
    const dx = newX - draggedStart.x;
    const dy = newY - draggedStart.y;

    setObjects((prev) =>
      prev.map((obj) => {
        if (!selectedIds.includes(obj.id)) return obj;
        const start = groupDragStartRef.current.get(obj.id);
        if (!start) return obj;
        return { ...obj, x: start.x + dx, y: start.y + dy };
      })
    );
  }

  return (
    <>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          cursor:
            mode === "panning"
              ? "grabbing"
              : isSpacePressed
              ? "grab"
              : "default",
        }}
        onMouseEnter={() => setIsPointerInside(true)}
        onMouseLeave={() => setIsPointerInside(false)}
        onMouseDown={(e) => {
          if (editor) {
            closeEditor();
            return;
          }

          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (!pointer) return;

          const middleMouseButton = e.evt.button === 1;
          const spacePan = e.evt.button === 0 && isSpacePressed;

          if (middleMouseButton || spacePan) {
            e.evt.preventDefault();
            setMode("panning");
            lastPointerRef.current = pointer;
            return;
          }

          const clickedOnEmpty = e.target === e.target.getStage();
          if (!isSpacePressed && e.evt.button === 0 && clickedOnEmpty) {
            setSelectedIds([]);
            const world = screenToWorld(pointer);
            setIsSelecting(true);
            setSelectionRect({ x: world.x, y: world.y, width: 0, height: 0 });
          }
        }}
        onMouseUp={(e) => {
          setMode("idle");
          lastPointerRef.current = null;

          if (isSelecting) {
            setIsSelecting(false);
            const box = selectionRect;
            const boxX1 = Math.min(box.x, box.x + box.width);
            const boxX2 = Math.max(box.x, box.x + box.width);
            const boxY1 = Math.min(box.y, box.y + box.height);
            const boxY2 = Math.max(box.y, box.y + box.height);

            const selected = objects
              .filter((obj) => {
                const ox2 = obj.x + obj.width;
                const oy2 = obj.y + obj.height;
                return !(ox2 < boxX1 || obj.x > boxX2 || oy2 < boxY1 || obj.y > boxY2);
              })
              .map((o) => o.id);

            if (e.evt.shiftKey) {
              setSelectedIds((prev) => [...new Set([...prev, ...selected])]);
            } else {
              setSelectedIds(selected);
            }
          }
        }}
        onMouseMove={() => {
          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (!pointer) return;
          pointerRef.current = pointer;

          if (isSelecting) {
            const world = screenToWorld(pointer);
            setSelectionRect((prev) => ({
              ...prev,
              width: world.x - prev.x,
              height: world.y - prev.y,
            }));
          }

          if (mode !== "panning" || !lastPointerRef.current) return;
          const dx = pointer.x - lastPointerRef.current.x;
          const dy = pointer.y - lastPointerRef.current.y;
          setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastPointerRef.current = pointer;
        }}
        onWheel={(e) => {
          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (!pointer) return;

          const scaleBy = 1.1;
          const oldZoom = camera.zoom;
          const direction = e.evt.deltaY > 0 ? -1 : 1;
          const newZoom = direction > 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
          const clampedZoom = Math.max(0.2, Math.min(newZoom, 4));

          const mousePointTo = {
            x: (pointer.x - camera.x) / oldZoom,
            y: (pointer.y - camera.y) / oldZoom,
          };

          setCamera({
            x: pointer.x - mousePointTo.x * clampedZoom,
            y: pointer.y - mousePointTo.y * clampedZoom,
            zoom: clampedZoom,
          });
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const stage = stageRef.current as any;
          const pointer = stage?.getPointerPosition();
          if (!pointer || !onContextMenu) return;
          const worldX = (pointer.x - camera.x) / camera.zoom;
          const worldY = (pointer.y - camera.y) / camera.zoom;
          onContextMenu(pointer.x, pointer.y, worldX, worldY);
        }}
      >
        <Layer x={camera.x} y={camera.y} scaleX={camera.zoom} scaleY={camera.zoom}>
          <Grid camera={camera} width={window.innerWidth} height={window.innerHeight} />

          {objects.map((obj) => (
            <BoardObjectRenderer
              key={obj.id}
              object={obj}
              draggable={mode !== "panning" && !isSpacePressed}
              listening={!isSpacePressed}
              isSelected={selectedIds.includes(obj.id)}
              editingField={editingObjectId === obj.id ? editingField : null}
              onMove={moveObject}
              onSelect={(id, shift) => handleSelect(id, shift)}
              onGroupDragStart={startGroupDrag}
              onGroupMove={moveGroup}
              onResize={resizeObject}
              onResizeLive={resizeObjectLive}
              onEditTitle={(obj) => openEditor(obj, "title")}
              onEditContent={(obj) => openEditor(obj, "content")}
              onUpdateTasks={onUpdateTasks}
              onUpdateObject={onUpdateObject}
            />
          ))}

          {isSelecting && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              stroke="rgba(87, 193, 255, 0.8)"
              dash={[6, 6]}
              fill="rgba(0, 179, 255, 0.06)"
              cornerRadius={8}
            />
          )}
        </Layer>
      </Stage>

      {editor && (
        <FloatingEditor
          editor={editor}
          textareaRef={textareaRef}
          onChange={handleChange}
          onClose={closeEditor}
        />
      )}
    </>
  );
}