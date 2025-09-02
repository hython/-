
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export interface CellPosition {
  row: number;
  col: number;
}

export type Board = (number | null)[][];

export type NotesBoard = (Set<number>)[][];

export interface Hint {
  strategy: string;
  explanation: string;
  highlightedCells: CellPosition[];
}

export interface GameResult {
  id: string;
  difficulty: Difficulty;
  time: number;
  solved: boolean;
  date: number;
}
