import {Stage, Layer} from "react-konva";
import {useRef} from "react";
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
}: Props) {
    const stageRef = useRef(null);
    const lastPointerRef = useRef<{x:number,y:number} | null>(null);

    function moveObject(id:string, x:number, y:number) {
        setObjects((prev) => 
            prev.map(o => 
                o.id === id ? {...o, x, y} : o
            )
        )
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
        }}
        onMouseUp={() => {
          setMode("idle")
          lastPointerRef.current = null;
        }}
        onMouseMove={() => {
            const stage = stageRef.current;
            const pointer = stage?.getPointerPosition();
            if (!pointer) return;
            pointerRef.current = pointer;
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
            />
          ))}
        </Layer>
      </Stage>
    )
}