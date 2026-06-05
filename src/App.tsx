import "./App.css";
import { useState, useEffect, useRef } from "react";
import BoardCanvas from "./components/BoardCanvas";
import CardPickerMenu from "./components/CardPickerMenu";
import type { BoardObject, CardType, InteractionMode, TaskItem } from "./types/board";

type MenuPosition = { x: number; y: number } | null;

function App() {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [mode, setMode] = useState<InteractionMode>("idle");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<BoardObject[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null);
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
    const height = type === "tasks" ? 260 : type === "image" ? 220 : 200;

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
    return newCard.id;
  }

  function handleMenuSelect(type: CardType) {
    setMenuPosition(null);

    const pos = pendingCreatePos.current;
    if (pos) {
      createCard(pos.x, pos.y, type);
    } else {
      const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
      const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;
      createCard(centerX, centerY, type);
    }
    pendingCreatePos.current = null;
  }

  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    window.addEventListener("wheel", preventZoom, { passive: false });
    return () => window.removeEventListener("wheel", preventZoom);
  }, []);

  // ── Глобальная вставка картинки из буфера обмена ─────────────────────────────
  // Если ни одна image-карточка не выделена — создаём новую по центру экрана
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          // Если выделена image-карточка — она сама обрабатывает paste
          const selectedImageCard = objects.find(
            (o) => selectedIds.includes(o.id) && o.type === "image"
          );
          if (selectedImageCard) return; // пусть ImageCard сам обработает

          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target?.result as string;
            if (!src) return;
            const img = new window.Image();
            img.src = src;
            img.onload = () => {
              const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
              const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;
              const maxW = 400;
              const aspect = img.naturalWidth / img.naturalHeight;
              const width = Math.min(maxW, img.naturalWidth);
              const height = Math.round(width / aspect);

              const newCard: BoardObject = {
                id: crypto.randomUUID(),
                type: "image",
                x: centerX - width / 2,
                y: centerY - height / 2,
                width,
                height,
                color: "",
                imageSrc: src,
              };
              setObjects((prev) => [...prev, newCard]);
              setSelectedIds([newCard.id]);
            };
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [camera, objects, selectedIds]);

  // ── Хоткеи ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "KeyA") {
        e.preventDefault();
        setSelectedIds(objects.map((o) => o.id));
        return;
      }

      // A — открыть меню у курсора
      if (e.code === "KeyA" && !e.repeat && !e.ctrlKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        pendingCreatePos.current = { x: worldX, y: worldY };
        setMenuPosition({ x: pointer.x + 8, y: pointer.y + 8 });
      }

      // T — текстовая карточка
      if (e.code === "KeyT" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        createCard(worldX, worldY, "text");
      }

      // L — список задач
      if (e.code === "KeyL" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        createCard(worldX, worldY, "tasks");
      }

      // I — карточка с изображением
      if (e.code === "KeyI" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        const worldX = (pointer.x - camera.x) / camera.zoom;
        const worldY = (pointer.y - camera.y) / camera.zoom;
        createCard(worldX, worldY, "image");
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

      if ((e.ctrlKey && e.code === "KeyD") || (e.shiftKey && e.code === "KeyD")) {
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
        // Если в буфере есть карточки — вставляем их
        if (clipboardRef.current.length > 0) {
          const pasted = clipboardRef.current.map((o) => ({
            ...o,
            id: crypto.randomUUID(),
            x: o.x + offset,
            y: o.y + offset,
          }));
          setObjects((prev) => [...prev, ...pasted]);
          setSelectedIds(pasted.map((o) => o.id));
        }
        // Paste картинки обрабатывается отдельным useEffect выше
      }
    }

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedIds, objects]);

  // ── Tasks update ──────────────────────────────────────────────────────────────
  function handleUpdateTasks(id: string, tasks: TaskItem[]) {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, tasks } : o))
    );
  }

  // ── Object patch ──────────────────────────────────────────────────────────────
  function handleUpdateObject(id: string, patch: Partial<BoardObject>) {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  }

  // ── Кнопка + ─────────────────────────────────────────────────────────────────
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

  // ── Кнопка «Добавить название» для выделенной image-карточки ─────────────────
  const selectedImageCard =
    selectedIds.length === 1
      ? objects.find((o) => o.id === selectedIds[0] && o.type === "image")
      : undefined;

  const showCaptionButton =
    selectedImageCard && selectedImageCard.caption === undefined;

  return (
    <div>
      {/* ── Тулбар ── */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          display: "flex",
          gap: 6,
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

        {/* Кнопка добавления кармашка с названием */}
        {showCaptionButton && (
          <button
            onClick={() => handleUpdateObject(selectedImageCard!.id, { caption: "" })}
            title="Добавить название к изображению"
            style={{
              height: 34,
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontFamily: "system-ui, sans-serif",
              borderRadius: 8,
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e0e0e8",
              cursor: "pointer",
              transition: "background 0.12s",
              animation: "fadeIn 0.15s ease-out",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 10H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Название
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
        onContextMenu={(screenX, screenY, worldX, worldY) => {
          pendingCreatePos.current = { x: worldX, y: worldY };
          setMenuPosition({ x: screenX, y: screenY });
        }}
      />

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