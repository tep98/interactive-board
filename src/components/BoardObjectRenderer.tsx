import { Rect, Transformer } from "react-konva"
import { memo, useEffect, useRef } from "react"
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

    onResize: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
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
    onGroupMove,
    onResize
}: Props) {
    const wasDraggingRef = useRef(false)
    const shapeRef = useRef<any>(null)
    const transformerRef = useRef<any>(null)

    useEffect(() => {

        if (
            isSelected &&
            transformerRef.current &&
            shapeRef.current
        ) {

            transformerRef.current.nodes([
            shapeRef.current
            ])

            transformerRef.current.getLayer()?.batchDraw()

        }

    }, [isSelected])

    if (object.type === "text") {
        return (
            <>
            <Rect
                x={object.x}
                y={object.y}
                width={object.width}
                height={object.height}
                fill={object.color}
                ref={shapeRef}
                strokeScaleEnabled={false}
                perfectDrawEnabled={false}

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

                onTransformEnd={() => {

                    const node = shapeRef.current

                    if (!node) return

                    const scaleX = node.scaleX()
                    const scaleY = node.scaleY()

                    // вычисляем новый размер
                    const newWidth = Math.max(
                        20,
                        object.width * scaleX
                    )

                    const newHeight = Math.max(
                        20,
                        object.height * scaleY
                    )

                    // сохраняем позицию
                    const newX = node.x()
                    const newY = node.y()

                    // сбрасываем scale
                    node.scaleX(1)
                    node.scaleY(1)

                    // обновляем state
                    onResize(
                        object.id,
                        newX,
                        newY,
                        newWidth,
                        newHeight
                    )

                }}
            />

            {isSelected && (
            <Transformer
                ref={transformerRef}
                rotateEnabled={false}

                boundBoxFunc={(oldBox, newBox) => {

                    if (
                        newBox.width < 40 ||
                        newBox.height < 40
                    ) {
                        return oldBox
                    }

                    return newBox
                }}
            />
            )}

            </>
        )
    }
    
    return null;
}

export default memo(BoardObjectRenderer);