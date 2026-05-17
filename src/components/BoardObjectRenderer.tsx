import {Rect} from "react-konva";
import { memo, useRef } from "react"
import type {BoardObject} from "../types/board"

type Props = {
    object: BoardObject
    draggable: boolean
    listening: boolean
    onMove: (id: string, x: number, y: number) => void
    isSelected: boolean;
    onSelect: (id: string, shift: boolean) => void;
    onGroupDragStart: (activeId: string, shift: boolean) => void;
    onGroupMove: (
    id:string,
    x:number,
    y:number
    ) => void
}

function BoardObjectRenderer({
    object,
    draggable,
    listening,
    onMove,
    isSelected,
    onSelect,
    onGroupDragStart,
    onGroupMove
}: Props) {
    const wasDraggingRef = useRef(false)

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

                onMouseDown={() => {

                wasDraggingRef.current = false

                }}

                onDragStart={(e) => {

                wasDraggingRef.current = true

                const shift = e.evt.shiftKey

                // если объект не выделен —
                // обновляем selection
                if (!isSelected) {

                    onSelect(object.id, shift)

                }

                onGroupDragStart(
                    object.id,
                    shift
                )

                }}

                onDragMove={(e) => {

                    const x = e.target.x()
                    const y = e.target.y()

                    if (isSelected) {
                        onGroupMove(object.id, x, y)
                    } else {
                        onMove(object.id, x, y)
                    }

                }}

                onClick={(e) => {

                // если был drag —
                // click игнорируем
                if (wasDraggingRef.current) {
                    return
                }

                const shift = e.evt.shiftKey

                onSelect(object.id, shift)

                }}
            />
        )
    }
    
    return null;
}

export default memo(BoardObjectRenderer);