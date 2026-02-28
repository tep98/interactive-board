import "./App.css";
import { Stage, Layer, Rect } from "react-konva";
import { useState, useEffect, useRef } from "react";

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
        onMouseEnter={() => setIsPointerInside(true)}
        onMouseLeave={() => setIsPointerInside(false)}
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
              draggable
              stroke= "black"

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