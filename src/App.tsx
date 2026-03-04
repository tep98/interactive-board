import "./App.css";
import { useState, useEffect, useRef} from "react";
import BoardCanvas from "./components/BoardCanvas";
import type { BoardObject, CardType, InteractionMode} from "./types/board"


function App() {

  const [isPointerInside, setIsPointerInside] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [objects, setObjects] = useState<BoardObject[]>([
    {
      id: "1",
      type: "text",
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
  const pointerRef = useRef<{x: number, y: number} | null>(null);


  function createCard(x: number, y: number, type: CardType) {
    const width = 200;
    const height = 200;

    const newCard = {
      id: crypto.randomUUID(),
      type: type,
      x: x-width/2,
      y: y-height/2,
      width,
      height,
      color: "orange",
    }

    setObjects(prev => [...prev, newCard]);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyA" && !e.repeat) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;

        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;

        createCard(worldX, worldY, "text");
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
            
            createCard(centerX, centerY, "text");
          }}
        >
          Add Card
        </button>
      </div>


      <BoardCanvas
        objects={objects}
        setObjects={setObjects}

        camera={camera}
        setCamera={setCamera}

        isPointerInside = {isPointerInside}
        setIsPointerInside={setIsPointerInside}

        mode = {mode}
        setMode={setMode}

        isSpacePressed = {isSpacePressed}

        pointerRef = {pointerRef}
      />
    </div>
  )
}

export default App