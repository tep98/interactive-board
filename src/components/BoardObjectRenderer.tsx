import { memo } from "react";
import type { BoardObject, TaskItem } from "../types/board";
import TextCard from "./TextCard";
import TasksCard from "./TasksCard";

type Props = {
  object: BoardObject;
  draggable: boolean;
  listening: boolean;
  isSelected: boolean;
  editingField: "title" | "content" | null;

  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string, shift: boolean) => void;
  onGroupDragStart: (activeId: string, shift: boolean) => void;
  onGroupMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onResizeLive: (id: string, x: number, y: number, width: number, height: number) => void;
  onEditTitle: (obj: BoardObject) => void;
  onEditContent: (obj: BoardObject) => void;
  onUpdateTasks?: (id: string, tasks: TaskItem[]) => void;
  onUpdateObject?: (id: string, patch: Partial<BoardObject>) => void;
};

function BoardObjectRenderer(props: Props) {
  switch (props.object.type) {
    case "text":
      return <TextCard {...props} />;
    case "tasks":
      return <TasksCard {...props} />;
    default:
      return null;
  }
}

export default memo(BoardObjectRenderer);