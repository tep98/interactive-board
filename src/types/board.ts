export type CardType = "image" | "text" | "tasks";
export type InteractionMode = "idle" | "panning";

export type TaskItem = {
  id: string;
  text: string;
  done: boolean;
};

export type BoardObject = {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  // Контент текстовой карточки
  title?: string;
  content?: string;
  // Контент карточки-списка
  tasks?: TaskItem[];
  // false = обычный список (без чекбоксов), true = с чекбоксами (по умолчанию)
  checkboxMode?: boolean;
  // true = чекбоксы заблокированы (нельзя менять состояние)
  tasksLocked?: boolean;
  // Контент карточки-изображения
  imageSrc?: string;          // base64 data URL
  caption?: string;           // undefined = кармашек скрыт, string = виден (может быть пустой)
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
