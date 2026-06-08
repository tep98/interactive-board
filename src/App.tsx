import "./App.css";
import { useState, useEffect, useRef } from "react";
import BoardCanvas from "./components/BoardCanvas";
import CardPickerMenu from "./components/CardPickerMenu";
import { useProjectFile } from "./hooks/useProjectFile";
import type { BoardObject, CardType, InteractionMode, TaskItem } from "./types/board";
import { useCallback } from "react";  // useCallback уже может быть
import { useCloseGuard, type CloseDialogResult } from "./hooks/useCloseGuard";
import CloseConfirmDialog from "./components/CloseConfirmDialog";

type MenuPosition = { x: number; y: number } | null;

// Базовые объекты для нового проекта
const DEFAULT_OBJECTS: BoardObject[] = [];
const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

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
  const [fileMenuOpen, setFileMenuOpen] = useState(false);

  const [objects, setObjects] = useState<BoardObject[]>(DEFAULT_OBJECTS);
  const [camera, setCamera] = useState(DEFAULT_CAMERA);

  // ── Проект ────────────────────────────────────────────────────────────────
  const { saveProject, saveAs, openProject, newProject, markDirty, currentPath, isDirty } =
    useProjectFile();

  // Состояние диалога подтверждения выхода
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeDialogResolve, setCloseDialogResolve] =
    useState<((r: CloseDialogResult) => void) | null>(null);
 
  // Показывает диалог и ждёт выбора пользователя
  const openCloseDialog = useCallback((): Promise<CloseDialogResult> => {
    return new Promise((resolve) => {
      setShowCloseDialog(true);
      // Сохраняем resolve — вызовем когда пользователь нажмёт кнопку
      setCloseDialogResolve(() => resolve);
    });
  }, []);
 
  const handleCloseDialogResult = useCallback((result: CloseDialogResult) => {
    setShowCloseDialog(false);
    closeDialogResolve?.(result);
    setCloseDialogResolve(null);
  }, [closeDialogResolve]);
 
  // Подключаем перехват закрытия окна
  useCloseGuard(
    isDirty,
    openCloseDialog,
    () => saveProject(objects, camera)
  );

  // Помечаем проект как изменённый при любом изменении объектов
  useEffect(() => {
    markDirty();
  }, [objects]);

  // Отображаем путь в заголовке окна
  useEffect(() => {
    const name = currentPath ? currentPath.split(/[\\/]/).pop() : "Без названия";
    const dirty = isDirty ? " •" : "";
    document.title = `${name}${dirty} — interactive board`;
  }, [currentPath, isDirty]);

  // ── Хоткеи сохранения/открытия ───────────────────────────────────────────
  useEffect(() => {
    async function handleSaveKeys(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Ctrl+S — сохранить
      if (e.ctrlKey && e.code === "KeyS" && !e.shiftKey) {
        e.preventDefault();
        await saveProject(objects, camera);
        return;
      }

      // Ctrl+Shift+S — сохранить как
      if (e.ctrlKey && e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        await saveAs(objects, camera);
        return;
      }

      // Ctrl+O — открыть
      if (e.ctrlKey && e.code === "KeyO") {
        e.preventDefault();
        const data = await openProject();
        if (data) {
          setObjects(data.objects);
          setCamera(data.camera);
          setSelectedIds([]);
        }
        return;
      }

      // Ctrl+N — новый проект
      if (e.ctrlKey && e.code === "KeyN") {
        e.preventDefault();
        if (isDirty) {
          const result = await openCloseDialog();
          if (result === "cancel") return;
          if (result === "save") {
            const saved = await saveProject(objects, camera);
            if (!saved) return;
          }
        }
        newProject();
        setObjects([]);
        setCamera({ x: 0, y: 0, zoom: 1 });
        setSelectedIds([]);
        return;
      }
    }

    window.addEventListener("keydown", handleSaveKeys);
    return () => window.removeEventListener("keydown", handleSaveKeys);
  }, [objects, camera, isDirty, saveProject, saveAs, openProject, newProject, openCloseDialog]);

  // ── Создание карточки ─────────────────────────────────────────────────────
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

  // ── Вставка картинки из буфера обмена ────────────────────────────────────
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const selectedImageCard = objects.find(
            (o) => selectedIds.includes(o.id) && o.type === "image"
          );
          if (selectedImageCard) return;

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

  // ── Хоткеи создания карточек ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

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

      if (e.code === "KeyT" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        createCard((pointer.x - camera.x) / camera.zoom, (pointer.y - camera.y) / camera.zoom, "text");
      }

      if (e.code === "KeyL" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        createCard((pointer.x - camera.x) / camera.zoom, (pointer.y - camera.y) / camera.zoom, "tasks");
      }

      if (e.code === "KeyI" && !e.repeat && !e.ctrlKey && !e.shiftKey) {
        const pointer = pointerRef.current;
        if (!isPointerInside || !pointer) return;
        createCard((pointer.x - camera.x) / camera.zoom, (pointer.y - camera.y) / camera.zoom, "image");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera, isPointerInside, objects]);

  // ── Space ─────────────────────────────────────────────────────────────────
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

  // ── Delete / Duplicate / Copy / Paste ────────────────────────────────────
  useEffect(() => {
    const offset = 20;

    function handleDelete(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

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
      }
    }

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedIds, objects]);

  function handleUpdateTasks(id: string, tasks: TaskItem[]) {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, tasks } : o)));
  }

  function handleUpdateObject(id: string, patch: Partial<BoardObject>) {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleAddButtonClick() {
    pendingCreatePos.current = null;
    if (menuPosition) { setMenuPosition(null); return; }
    const btn = addButtonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({ x: rect.left, y: rect.bottom + 6 });
    }
  }

  // Имя файла для отображения в тулбаре
  const fileName = currentPath ? currentPath.split(/[\\/]/).pop() : null;

  // Кнопка «Добавить название» — показывается когда выбрана одна image-карточка без caption
  const selectedImageCard =
    selectedIds.length === 1
      ? objects.find((o) => o.id === selectedIds[0] && o.type === "image")
      : undefined;
  const showCaptionButton = selectedImageCard && selectedImageCard.caption === undefined;

  // Пропсы файловых операций для CardPickerMenu
  const fileActions = {
    onNew: async () => {
      if (isDirty) {
        const result = await openCloseDialog();
        if (result === "cancel") return;
        if (result === "save") {
          const saved = await saveProject(objects, camera);
          if (!saved) return;
        }
      }
      newProject();
      setObjects([]);
      setCamera({ x: 0, y: 0, zoom: 1 });
      setSelectedIds([]);
    },
    onOpen: async () => {
      const data = await openProject();
      if (data) { setObjects(data.objects); setCamera(data.camera); setSelectedIds([]); }
    },
    onSave: () => saveProject(objects, camera),
    onSaveAs: () => saveAs(objects, camera),
    isDirty,
    fileName,
  };

  return (
    <div>
      {/* ── Тулбар ── */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 6, alignItems: "center" }}>

        {/* "+" — открывает CardPickerMenu */}
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
            borderRadius: 8,
            background: menuPosition !== null ? "rgba(255,255,255,0.1)" : "#1a1a1a",
            border: "1px solid rgba(255, 255, 255, 0)",
            color: "#e0e0e8",
            cursor: "pointer",
            transition: "background 0.12s",
            outline: "none",
          }}

          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#202020";
            (e.currentTarget as HTMLElement).style.color = "rgb(255, 255, 255)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
            (e.currentTarget as HTMLElement).style.color = "#e0e0e8";
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: "block" }}
          >
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* "..." — разворачивает файловые операции */}
        <button
          onClick={() => setFileMenuOpen((v) => !v)}
          title="Параметры проекта"
          style={{
            width: 34, height: 34, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8,
            background: fileMenuOpen ? "rgba(255,255,255,0.1)" : "#1a1a1a",
            border: "1px solid rgba(255, 255, 255, 0)",
            color: "#e0e0e8", cursor: "pointer",
            transition: "background 0.12s",
            position: "relative",
            outline: "none",
          }}

          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#202020";
            (e.currentTarget as HTMLElement).style.color = "rgb(255, 255, 255)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
            (e.currentTarget as HTMLElement).style.color = "#e0e0e8";
          }}
        >
          <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
            <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="2" r="1.5" fill="currentColor"/>
            <circle cx="14" cy="2" r="1.5" fill="currentColor"/>
          </svg>
          {/* Индикатор несохранённых изменений */}
          {isDirty && !fileMenuOpen && (
            <div style={{
              position: "absolute", top: 7, right: 7,
              width: 5, height: 5, borderRadius: "50%",
              background: "#4da3ff", pointerEvents: "none",
            }} />
          )}
        </button>

        {/* Разворачиваемая панель */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          overflow: "hidden",
          maxWidth: fileMenuOpen ? 300 : 0,
          opacity: fileMenuOpen ? 1 : 0,
          transition: "max-width 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
          pointerEvents: fileMenuOpen ? "auto" : "none",
        }}>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

          <ToolbarButton title="Новый проект (Ctrl+N)" onClick={fileActions.onNew}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M9 1L13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M9 1V5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 14H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton title="Открыть проект (Ctrl+O)" onClick={fileActions.onOpen}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 5C2 4.44772 2.44772 4 3 4H6.38197L7.72361 6H13C13.5523 6 14 6.44772 14 7V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V5Z" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton title="Сохранить (Ctrl+S)" onClick={fileActions.onSave} active={isDirty}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="5" y="2" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="4" y="8" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton title="Сохранить как (Ctrl+Shift+S)" onClick={fileActions.onSaveAs}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="5" y="2" width="6" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="4" y="8" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M10 4.5L12 6.5L10 8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ToolbarButton>

          {fileName && (
            <div style={{
              fontSize: 11, fontFamily: "system-ui, sans-serif",
              color: "rgba(255,255,255,0.35)", paddingLeft: 4,
              maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {fileName}{isDirty ? " •" : ""}
            </div>
          )}
        </div>

        {/* Кнопка подписи к image-карточке */}
        {showCaptionButton && (
          <>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", flexShrink: 0  }} />
            <button
              onClick={() => handleUpdateObject(selectedImageCard!.id, { caption: "" })}
              title="Добавить название к изображению"
              style={{
                height: 30,
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontFamily: "system-ui, sans-serif",
                borderRadius: 7,
                background: "#1a1a1a",
                border: "1px solid transparent",
                color: "#e0e0e8",
                cursor: "pointer",
                transition: "background 0.12s, color 0.12s",
                animation: "fadeIn 0.15s ease-out",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#202020";
                (e.currentTarget as HTMLElement).style.color = "rgb(255, 255, 255)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
                (e.currentTarget as HTMLElement).style.color = "#e0e0e8";
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 10H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Название
            </button>
          </>
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
        fileActions={fileActions}
      />

      {showCloseDialog && (
        <CloseConfirmDialog onResult={handleCloseDialogResult} />
      )}

    </div>
  );
}

// ── Маленький компонент кнопки тулбара ────────────────────────────────────────
function ToolbarButton({
  children,
  title,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 7,
        background: active ? "rgba(77,163,255,0.15)" : "transparent",
        border: active ? "1px solid rgba(77,163,255,0.3)" : "1px solid transparent",
        color: active ? "#4da3ff" : "rgba(255,255,255,0.45)",
        cursor: "pointer",
        transition: "background 0.12s, color 0.12s, border-color 0.12s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
        }
      }}
    >
      {children}
    </button>
  );
}

export default App;