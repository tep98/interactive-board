export type CardType = "image" | "text" | "tasks";
export type InteractionMode = "idle" | "panning";

export type BoardObject = {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  // Контент карточки
  title?: string;
  content?: string;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

// Параметры редактируемого поля поверх canvas
export type EditingTarget = {
  objectId: string;
  field: "title" | "content";
};
