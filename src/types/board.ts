export type CardType = "image" | "text" | "tasks";
export type InteractionMode = "idle" | "panning";

export type BoardObject = {
  id: string
  type: CardType
  x: number
  y: number
  width: number
  height: number
  color: string
}

export type Camera = {
    x: number;
    y: number;
    zoom: number;
};