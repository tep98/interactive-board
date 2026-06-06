import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export type CloseDialogResult = "save" | "discard" | "cancel";

export function useCloseGuard(
  isDirty: boolean,
  showDialog: () => Promise<CloseDialogResult>,
  onSave: () => Promise<boolean>
) {
  // Refs — чтобы обработчик всегда видел актуальные значения
  const isDirtyRef = useRef(isDirty);
  const showDialogRef = useRef(showDialog);
  const onSaveRef = useRef(onSave);

  isDirtyRef.current = isDirty;
  showDialogRef.current = showDialog;
  onSaveRef.current = onSave;

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getCurrentWindow().onCloseRequested(async (event) => {
      if (!isDirtyRef.current) {
        // Нет изменений — закрываем штатно (не вызываем preventDefault)
        return;
      }

      // Отменяем автоматическое закрытие
      event.preventDefault();

      const result = await showDialogRef.current();

      if (result === "save") {
        const saved = await onSaveRef.current();
        if (saved) {
          // Вызываем Rust-команду — гарантированное закрытие
          await invoke("close_app");
        }
        // saved=false — пользователь отменил Save As — остаёмся
      } else if (result === "discard") {
        await invoke("close_app");
      }
      // "cancel" — ничего не делаем, остаёмся
    }).then((fn) => {
      unlisten = fn;
    });

    return () => { unlisten?.(); };
  }, []); // один раз, актуальные значения — через refs
}