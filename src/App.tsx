import "./App.css";
import { useState, useEffect, useRef } from "react";
import BoardCanvas from "./components/BoardCanvas";
import CardPickerMenu from "./components/CardPickerMenu";
import type { BoardObject, CardType, InteractionMode, TaskItem } from "./types/board";

// Позиция меню: null — скрыто, {x,y} — у курсора или у кнопки
type MenuPosition = { x: number; y: number } | null;

function App() {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<BoardObject[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Позиция меню выбора типа карточки
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null);
  // Позиция в мировых координатах куда создавать карточку (для горячей клавиши)
  const pendingCreatePos = useRef<{ x: number; y: number } | null>(null);

  const [objects, setObjects] = useState<BoardObject[]>([
    {
      id: "1",
      type: "text",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      color: "orange",
    },
  ]);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // ── Создание карточки ────────────────────────────────────────────────────────
  function createCard(x: number, y: number, type: CardType) {
    const width = 220;
    const height = type === "tasks" ? 260 : 200;

    const newCard: BoardObject = {
      id: crypto.randomUUID(),
      type,
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
      color: "orange",
      ...(type === "tasks" ? { tasks: [] } : {}),
    };

    setObjects((prev) => [...prev, newCard]);
  }

  // Вызывается из CardPickerMenu: создаём там, где стоял курсор (или центр экрана)
  function handleMenuSelect(type: CardType) {
    setMenuPosition(null);

    const pos = pendingCreatePos.current;
    if (pos) {
      createCard(pos.x, pos.y, type);
    } else {
      // Создаём по центру экрана (клик по кнопке)
      const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
      const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;
      createCard(centerX, centerY, type);
    }
    pendingCreatePos.current = null;
  }

  useEffect(() => {
    const preventZoom = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventZoom);
    };
  }, []);

  // ── Хоткей A — открыть меню у курсора ───────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "KeyA") {
        e.preventDefault();
        setSelectedIds(objects.map((o) => o.id));
        return;
      }

      if (e.code === "KeyA" && !e.repeat && !e.ctrlKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;

        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;

        pendingCreatePos.current = { x: worldX, y: worldY };
        setMenuPosition({ x: pointer.x + 8, y: pointer.y + 8 });
      }

      // T — быстро создать текстовую карточку
      if (e.code === "KeyT" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        createCard(worldX, worldY, "text");
      }

      // L — быстро создать карточку-список
      if (e.code === "KeyL" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        createCard(worldX, worldY, "tasks");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera, isPointerInside, objects]);

  // ── Space ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setIsSpacePressed(true); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Delete / Duplicate / Copy / Paste ────────────────────────────────────────
  useEffect(() => {
    const offset = 20;

    function handleDelete(e: KeyboardEvent) {
      if (e.key === "Delete") {
        setObjects((prev) => prev.filter((obj) => !selectedIds.includes(obj.id)));
        setSelectedIds([]);
      }

      if (e.ctrlKey && e.code === "KeyD" || e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        const selected = objects.filter((o) => selectedIds.includes(o.id));
        if (selected.length === 0) return;
        const duplicates = selected.map((o) => ({
          ...o,
          id: crypto.randomUUID(),
          x: o.x + offset,
          y: o.y + offset,
        }));
        setObjects((prev) => [...prev, ...duplicates]);
        setSelectedIds(duplicates.map((o) => o.id));
      }

      if (e.ctrlKey && e.code === "KeyC") {
        clipboardRef.current = objects.filter((o) => selectedIds.includes(o.id));
      }

      if (e.ctrlKey && e.code === "KeyX") {
        clipboardRef.current = objects.filter((o) => selectedIds.includes(o.id));
        setObjects((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
        setSelectedIds([]);
      }

      if (e.ctrlKey && e.code === "KeyV") {
        const pasted = clipboardRef.current.map((o) => ({
          ...o,
          id: crypto.randomUUID(),
          x: o.x + offset,
          y: o.y + offset,
        }));
        setObjects((prev) => [...prev, ...pasted]);
        setSelectedIds(pasted.map((o) => o.id));
      }
    }

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedIds, objects]);

  // ── Tasks update ─────────────────────────────────────────────────────────────
  function handleUpdateTasks(id: string, tasks: TaskItem[]) {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, tasks } : o))
    );
  }

  // ── Object patch (для checkboxMode, tasksLocked и т.д.) ──────────────────────
  function handleUpdateObject(id: string, patch: Partial<BoardObject>) {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  }

  // ── Кнопка + ────────────────────────────────────────────────────────────────
  function handleAddButtonClick() {
    pendingCreatePos.current = null;
    if (menuPosition) {
      setMenuPosition(null);
      return;
    }
    const btn = addButtonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({ x: rect.left, y: rect.bottom + 6 });
    }
  }

  return (
    <div>
      {/* ── Тулбар ── */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
        }}
      >
        <button
          ref={addButtonRef}
          onClick={handleAddButtonClick}
          title="Добавить карточку (A)"
          style={{
            width: 34,
            height: 34,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            lineHeight: 1,
            borderRadius: 8,
            background: menuPosition !== null ? "rgba(255,255,255,0.1)" : "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#e0e0e8",
            cursor: "pointer",
            transition: "background 0.12s, border-color 0.12s",
          }}
        >
          +
        </button>
      </div>

      <BoardCanvas
        objects={objects}
        setObjects={setObjects}
        camera={camera}
        setCamera={setCamera}
        isPointerInside={isPointerInside}
        setIsPointerInside={setIsPointerInside}
        mode={mode}
        setMode={setMode}
        isSpacePressed={isSpacePressed}
        pointerRef={pointerRef}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onUpdateTasks={handleUpdateTasks}
        onUpdateObject={handleUpdateObject}
      />

      {/* ── Меню выбора типа карточки ── */}
      <CardPickerMenu
        position={menuPosition}
        onSelect={handleMenuSelect}
        onClose={() => {
          setMenuPosition(null);
          pendingCreatePos.current = null;
        }}
      />
    </div>
  );
}

export default App;