import { useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { BoardObject, Camera } from "../types/board";

export type ProjectData = {
  version: number;
  camera: Camera;
  objects: BoardObject[];
};

const CURRENT_VERSION = 1;
const FILE_FILTERS = [{ name: "Board Project", extensions: ["board"] }];

export function useProjectFile() {
  // Путь к текущему открытому файлу (для Save без диалога)
  const currentPathRef = useRef<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Сохранить в конкретный путь ──────────────────────────────────────────
  const saveToPath = useCallback(
    async (path: string, objects: BoardObject[], camera: Camera) => {
      const data: ProjectData = {
        version: CURRENT_VERSION,
        camera,
        objects,
      };
      await invoke<void>("write_project_file", {
        path,
        content: JSON.stringify(data, null, 2),
      });
      currentPathRef.current = path;
      setCurrentPath(path);
      setIsDirty(false);
    },
    []
  );

  // ── Save As — всегда показывает диалог ──────────────────────────────────
  const saveAs = useCallback(
    async (objects: BoardObject[], camera: Camera): Promise<boolean> => {
      const path = await save({
        filters: FILE_FILTERS,
        defaultPath: "project.board",
      });
      if (!path) return false; // пользователь отменил

      await saveToPath(path, objects, camera);
      return true;
    },
    [saveToPath]
  );

  // ── Save — если путь уже есть, сохраняет без диалога ────────────────────
  const saveProject = useCallback(
    async (objects: BoardObject[], camera: Camera): Promise<boolean> => {
      const path = currentPathRef.current;
      if (path) {
        await saveToPath(path, objects, camera);
        return true;
      }
      return saveAs(objects, camera);
    },
    [saveToPath, saveAs]
  );

  // ── Open ─────────────────────────────────────────────────────────────────
  const openProject = useCallback(async (): Promise<ProjectData | null> => {
    const path = await open({
      filters: FILE_FILTERS,
      multiple: false,
    });
    if (!path || typeof path !== "string") return null;

    const raw = await invoke<string>("read_project_file", { path });
    const data = JSON.parse(raw) as ProjectData;

    currentPathRef.current = path;
    setCurrentPath(path);
    setIsDirty(false);

    return data;
  }, []);

  // ── New — сбросить текущий путь ──────────────────────────────────────────
  const newProject = useCallback(() => {
    currentPathRef.current = null;
    setCurrentPath(null);
    setIsDirty(false);
  }, []);

  // Вызывай markDirty() каждый раз когда objects меняются
  const markDirty = useCallback(() => setIsDirty(true), []);

  return {
    saveProject,
    saveAs,
    openProject,
    newProject,
    markDirty,
    currentPath,
    isDirty,
  };
}