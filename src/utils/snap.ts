export function snap(
  value: number,
  gridSize: number
) {

  return (
    Math.round(value / gridSize)
    * gridSize
  )

}