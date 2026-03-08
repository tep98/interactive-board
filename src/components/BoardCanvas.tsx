import {Stage, Layer, Rect} from "react-konva";
import {useRef, useState} from "react";
import BoardObjectRenderer from "./BoardObjectRenderer";
import type { BoardObject, InteractionMode, Camera } from "../types/board"

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

    pointerRef: React.MutableRefObject<{x:number, y:number} | null>;

    selectedIds: string[];
    setSelectedIds: (ids: string[]) => void;
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
    setSelectedIds
}: Props) {
    const stageRef = useRef(null);
    const lastPointerRef = useRef<{x:number,y:number} | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionRect, setSelectionRect] = useState({
      x: 0,
      y: 0,
      width: 0,
      height: 0
    });

    function moveObject(id:string, x:number, y:number) {
        setObjects((prev) => 
            prev.map(o => 
                o.id === id ? {...o, x, y} : o
            )
        )
    }

    function handleSelect(id: string, shift: boolean) {
      if (shift) {
        setSelectedIds(prev => {
          if (prev.includes(id)) {
            return prev.filter(x => x !== id);
          }
          return [...prev, id];
        })
      } else {
        setSelectedIds([id]);
      }
    }

    return (
        <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          cursor: mode === "panning" ? "grabbing" : isSpacePressed ? "grab" : "default",
        }}
        
        onMouseEnter={() => setIsPointerInside(true)}
        onMouseLeave={() => setIsPointerInside(false)}
        onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedIds([]);
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
            }

            //selection box
            if (!isSpacePressed && e.evt.button === 0 && e.target.className !== "Rect") {
              setIsSelecting(true);
              setSelectionRect({
                x: pointer.x,
                y: pointer.y,
                width: 0,
                height: 0
              })
            }
        }}

        onMouseUp={() => {
          setMode("idle")
          lastPointerRef.current = null;

          if (isSelecting) {
            setIsSelecting(false);
            const box = selectionRect;

            const selected = objects.filter(obj => {
              const x = obj.x + camera.x;
              const y = obj.y + camera.y;
              const width = obj.x + camera.x + obj.width;
              const height = obj.y + camera.y + obj.height;

              const boxX1 = Math.min(box.x, box.x + box.width);
              const boxX2 = Math.max(box.x, box.x + box.width);
              const boxY1 = Math.min(box.y, box.y + box.height);
              const boxY2 = Math.max(box.y, box.y + box.height);

              return(
                x >= boxX1 && x <= boxX2 && y >= boxY1 && y <= boxY2
                ||
                width >= boxX1 && width <= boxX2 && height >= boxY1 && height <= boxY2
                ||
                x >= boxX1 && x <= boxX2 && height >= boxY1 && height <= boxY2
                ||
                width >= boxX1 && width <= boxX2 && y >= boxY1 && y <= boxY2
              )
            })
            .map(o => o.id)

            setSelectedIds(selected);
          }
        }}
        onMouseMove={() => {
            const stage = stageRef.current;
            const pointer = stage?.getPointerPosition();
            if (!pointer) return;
            pointerRef.current = pointer;

            if (isSelecting) {
              setSelectionRect(prev => ({
                ...prev,
                width: pointer.x - prev.x,
                height: pointer.y - prev.y,
              }))
            }

            if (mode != "panning" || !lastPointerRef.current) return;
            
            const dx = pointer.x - lastPointerRef.current.x;
            const dy = pointer.y - lastPointerRef.current.y;

            setCamera((prev) => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
            }))

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
          const clampedZoom = Math.max(0.2, Math.min(newZoom,4));

          const mousePointTo = {
            x: (pointer.x - camera.x) / oldZoom,
            y: (pointer.y - camera.y) / oldZoom,
          }

          const newCameraX = pointer.x - mousePointTo.x * clampedZoom;
          const newCameraY = pointer.y - mousePointTo.y * clampedZoom;

          setCamera({
            x: newCameraX,
            y: newCameraY,
            zoom: clampedZoom,
          })
        }}
      >
        <Layer
          x={camera.x}
          y={camera.y}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
        >
          {objects.map((obj) => (
            <BoardObjectRenderer
                key = {obj.id}
                object = {obj}
                draggable = {mode !== "panning" && !isSpacePressed}
                listening= {!isSpacePressed}
                onMove={moveObject}

                onSelect = {(id, shift) => handleSelect(id, shift)}
                isSelected = {selectedIds.includes(obj.id)}
            />
          ))}

          {isSelecting && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              stroke={'rgba(87, 193, 255, 0.8)'}
              fill={'rgba(0, 179, 255, 0.2)'}
              dash={[4,4]}
              opacity={0.4}
              cornerRadius={8}
            />
          )}
        </Layer>
      </Stage>
    )
}