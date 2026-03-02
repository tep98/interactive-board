import "./App.css";
import { Stage, Layer, Rect } from "react-konva";
import { useState, useEffect, useRef} from "react";

type BoardObject = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
}


function App() {

  const [objects, setObjects] = useState<BoardObject[]>([
    {
      id: "1",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      color: "orange"
    }
  ]);

  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const lastPointerRef = useRef<{x: number, y: number} | null>(null);

  function createCard(x: number, y: number) {
    const width = 200;
    const height = 200;

    const newCard = {
      id: crypto.randomUUID(),
      x: x-width/2,
      y: y-height/2,
      width,
      height,
      color: "orange",
    }

    setObjects(prev => [...prev, newCard]);
  }

  const stageRef = useRef(null);
  const [isPointerInside, setIsPointerInside] = useState(false);
  type InteractionMode = "idle" | "panning";
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "a") {
        console.log(isPointerInside);
        if (!isPointerInside) return;

        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        if (pointer.x === null || pointer.y === null) return;

        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;

        createCard(worldX, worldY);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera, isPointerInside]);

  useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      };

      const up = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          setIsSpacePressed(false);
        }
      };

      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);

      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
      };
    }, []);

  return (
    <div>

      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            const centerX = window.innerWidth / 2 / camera.zoom - camera.x / camera.zoom;
            const centerY = window.innerHeight / 2 / camera.zoom - camera.y / camera.zoom;
            
            createCard(centerX, centerY);
          }}
        >
          Add Card
        </button>
      </div>


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
          if (!stage) return;

          const pointer = stage.getPointerPosition();
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
          if (mode != "panning") return;

          const stage = stageRef.current;
          const pointer = stage?.getPointerPosition();
          if (!pointer || !lastPointerRef.current) return;

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
          e.evt.preventDefault();

          const stage = stageRef.current;
          if (!stage) return;

          const pointer = stage.getPointerPosition();
          if(!pointer) return;

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
            <Rect
              key={obj.id}
              x={obj.x}
              y={obj.y}
              width={obj.width}
              height={obj.height}
              fill={obj.color}
              draggable = {mode != "panning" && !isSpacePressed}
              listening = {!isSpacePressed}
              stroke= "black"

              onDragStart={() => {
                if (isSpacePressed) return
                }
              }

              onDragEnd={(e) => {
                const newX = e.target.x();
                const newY = e.target.y();

                setObjects((prev) =>
                  prev.map((o) =>
                    o.id === obj.id ? { ...o, x: newX, y: newY } : o
                  )
                )
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

export default App