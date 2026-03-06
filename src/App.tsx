import "./App.css";
import { useState, useEffect, useRef, type KeyboardEvent} from "react";
import BoardCanvas from "./components/BoardCanvas";
import type { BoardObject, CardType, InteractionMode} from "./types/board"


function App() {

  const [isPointerInside, setIsPointerInside] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<BoardObject[]>([]);
  const pointerRef = useRef<{x: number, y: number} | null>(null);
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
  
  useEffect(() => {
    function handleDelete(e: KeyboardEvent) {
      const offset = 20; 

      if (e.key === "Delete") {
        setObjects(prev => 
          prev.filter(obj => !selectedIds.includes(obj.id))
        )
        setSelectedIds([]);
      }

      if (e.ctrlKey && e.code === "KeyD" ||
        e.shiftKey && e.code === "KeyD"
      ) {
        e.preventDefault();

        const selected = objects.filter(o => selectedIds.includes(o.id));
        if (selected.length === 0) return;

        const duplicates = selected.map(o => ({
          ...o,
          id: crypto.randomUUID(),
          x: o.x + offset,
          y: o.y + offset
        }));

        setObjects(prev => [...prev, ...duplicates]);
        setSelectedIds(duplicates.map(o => o.id));
      }

      if (e.ctrlKey && e.code === "KeyC") {
        clipboardRef.current = objects.filter(o => selectedIds.includes(o.id));
      }

      if (e.ctrlKey && e.code === "KeyX") {
        clipboardRef.current = objects.filter(o => selectedIds.includes(o.id));
        setObjects(prev => prev.filter(o => !selectedIds.includes(o.id)));

        setSelectedIds([]);
      }

      if (e.ctrlKey && e.code === "KeyV") {
        const pasted = clipboardRef.current.map(o => ({
          ...o,
          id: crypto.randomUUID(),
          x: o.x + offset,
          y: o.y + offset,
        }))

        setObjects(prev => [...prev, ...pasted]);
        setSelectedIds(pasted.map(o => o.id));
      }
    }
    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedIds])


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

        selectedIds = {selectedIds}
        setSelectedIds = {setSelectedIds}
      />
    </div>
  )
}

export default App