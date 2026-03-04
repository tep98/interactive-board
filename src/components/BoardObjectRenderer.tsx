import {Rect} from "react-konva";
import {memo} from "react";
import type {BoardObject} from "../types/board"

type Props = {
    object: BoardObject
    draggable: boolean
    listening: boolean
    onMove: (id: string, x: number, y: number) => void
}

function BoardObjectRenderer({
    object,
    draggable,
    listening,
    onMove
}: Props) {
    if (object.type === "text") {
        return (
            <Rect
                x={object.x}
                y={object.y}
                width={object.width}
                height={object.height}
                fill={object.color}
                stroke= "black"

                draggable = {draggable}
                listening = {listening}

                onDragEnd={(e) => {
                    onMove(object.id, e.target.x(), e.target.y())
                }}
            />
        )
    }
    
    return null;
}

export default memo(BoardObjectRenderer);