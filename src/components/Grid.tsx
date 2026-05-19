import { Shape } from "react-konva"
import type { Camera } from "../types/board"

type Props = {
  camera: Camera
  width: number
  height: number
}

export default function Grid({
  camera,
  width,
  height
}: Props) {

    

    const baseGridSize = 25

    const zoomAdjustedGrid =
    baseGridSize / camera.zoom

    let gridSize = baseGridSize

    if (zoomAdjustedGrid > 20) {
    gridSize = 50
    console.log(50)
    }

    if (zoomAdjustedGrid > 40) {
    gridSize = 80
    console.log(70)
    }

    if (zoomAdjustedGrid > 60) {
    gridSize = 110
    console.log(100)
    }

    if (zoomAdjustedGrid > 80) {
    gridSize = 150
    console.log(150)
    }

    if (zoomAdjustedGrid > 400) {
    gridSize = 400
    }

    const majorEvery =
    gridSize >= 60
        ? 3
        : 5

  return (
    <Shape
      listening={false}

      sceneFunc={(context, shape) => {

        const padding = gridSize * 2

        const startX =
        Math.floor(
            (-camera.x / camera.zoom - padding)
            / gridSize
        ) * gridSize

        const endX =
        startX +
        width / camera.zoom +
        padding * 2

        const startY =
        Math.floor(
            (-camera.y / camera.zoom - padding)
            / gridSize
        ) * gridSize

        const endY =
        startY +
        height / camera.zoom +
        padding * 2

        for (
          let x = startX;
          x < endX;
          x += gridSize
        ) {

          for (
            let y = startY;
            y < endY;
            y += gridSize
          ) {

            const gx = x / gridSize
            const gy = y / gridSize

            const isMajor =
              gx % majorEvery === 0 &&
              gy % majorEvery === 0

            const radius =
              isMajor
                ? 2 / camera.zoom
                : 1 / camera.zoom

            context.beginPath()

            context.arc(
              x,
              y,
              radius,
              0,
              Math.PI * 2
            )

            context.fillStyle =
              isMajor
                ? "rgba(255,255,255,0.22)"
                : "rgba(255,255,255,0.10)"

            context.fill()

          }

        }

        context.fillStrokeShape(shape)

      }}
    />
  )

}