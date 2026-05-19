import { memo } from "react";
import type { BoardObject } from "../types/board";
import TextCard from "./TextCard";

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
};

function BoardObjectRenderer(props: Props) {
  switch (props.object.type) {
    case "text":
      return <TextCard {...props} />;
    // case "image":
    //   return <ImageCard {...props} />;
    // case "tasks":
    //   return <TasksCard {...props} />;
    default:
      return null;
  }
}

export default memo(BoardObjectRenderer);
