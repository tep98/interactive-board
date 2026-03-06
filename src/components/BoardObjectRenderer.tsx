import {Rect} from "react-konva";
import {memo} from "react";
import type {BoardObject} from "../types/board"

type Props = {
    object: BoardObject
    draggable: boolean
    listening: boolean
    onMove: (id: string, x: number, y: number) => void
    isSelected: boolean;
    onSelect: (id: string, shift: boolean) => void;
}

function BoardObjectRenderer({
    object,
    draggable,
    listening,
    onMove,
    isSelected,
    onSelect
}: Props) {
    if (object.type === "text") {
        return (
            <Rect
                x={object.x}
                y={object.y}
                width={object.width}
                height={object.height}
                fill={object.color}

                stroke= {isSelected? "#4da3ff" : "black"}
                strokeWidth={isSelected? 3 : 1}

                draggable = {draggable}
                listening = {listening}

                onDragEnd={(e) => {
                    onMove(object.id, e.target.x(), e.target.y())
                }}

                onMouseDown={(e) => {
                    const shift = e.evt.shiftKey;
                    onSelect(object.id, shift);
                }}
            />
        )
    }
    
    return null;
}

export default memo(BoardObjectRenderer);