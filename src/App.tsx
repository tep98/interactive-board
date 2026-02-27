import "./App.css";
import {Stage, Layer, Rect} from "react-konva";
import { useState } from "react";

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
    {id: "1",
      x:100,
      y: 100,
      width: 200,
      height: 200,
      color: "orange"
    }
  ]);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        {objects.map((obj) => (
          <Rect
            key={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill={obj.color}
            draggable

            onDragEnd={(e) => {
              const newX = e.target.x();
              const newY = e.target.y();

              setObjects((prev) =>
                prev.map((o) => 
                  o.id === obj.id ? {...o, x:newX, y:newY} : o
                )
              )
            }}
          />
        ))}
      </Layer>
    </Stage>
  )
}

export default App