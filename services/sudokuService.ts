import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Board, CellPosition, Hint } from '../types';

// --- Sudoku Game Logic ---

// Helper to check if a number can be placed at a given position
function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) {
      return false;
    }
  }
  // Check column
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) {
      return false;
    }
  }
  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) {
        return false;
      }
    }
  }
  return true;
}

// Helper to find the next empty cell
function findEmptyCell(board: Board): [number, number] | null {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === null) {
                return [i, j];
            }
        }
    }
    return null;
}

// Backtracking function to generate a full Sudoku solution
function generateSolution(board: Board): boolean {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) {
        return true; // Board is full
    }
    const [row, col] = emptyCell;

    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    // Shuffle numbers to get a different puzzle each time
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    for (const num of numbers) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            if (generateSolution(board)) {
                return true;
            }
            board[row][col] = null; // Backtrack
        }
    }

    return false;
}

function createPuzzle(solvedBoard: Board, difficulty: Difficulty) {
  const puzzle = JSON.parse(JSON.stringify(solvedBoard));
  let removals = 0;
  if (difficulty === Difficulty.Easy) removals = 35;
  else if (difficulty === Difficulty.Medium) removals = 45;
  else removals = 55;

  let attempts = removals;
  while (attempts > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);

    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      attempts--;
    }
  }
  return puzzle;
}

export const generateSudoku = (difficulty: Difficulty) => {
  const solution: Board = Array(9).fill(null).map(() => Array(9).fill(null));
  generateSolution(solution);
  const puzzle: Board = createPuzzle(JSON.parse(JSON.stringify(solution)), difficulty);
  return { puzzle, solution };
};

export const checkSolution = (board: Board): boolean => {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === null || isCellInConflict(board, i, j)) {
        return false;
      }
    }
  }
  return true;
};

export const isCellRelated = (cellA: CellPosition, cellB: CellPosition): boolean => {
    if (!cellA || !cellB) return false;
    const sameRow = cellA.row === cellB.row;
    const sameCol = cellA.col === cellB.col;
    const sameBox = Math.floor(cellA.row / 3) === Math.floor(cellB.row / 3) && Math.floor(cellA.col / 3) === Math.floor(cellB.col / 3);
    return (sameRow || sameCol || sameBox) && !(sameRow && sameCol);
};


export const isCellInConflict = (board: Board, row: number, col: number): boolean => {
  const value = board[row][col];
  if (value === null) return false;

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === value) return true;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === value) return true;
  }
  // Check 3x3 box
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;
  for (let r = boxStartRow; r < boxStartRow + 3; r++) {
    for (let c = boxStartCol; c < boxStartCol + 3; c++) {
      if (r !== row && c !== col && board[r][c] === value) return true;
    }
  }

  return false;
};

export const findAllConflicts = (board: Board): Set<string> => {
    const conflicts = new Set<string>();
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (const num of numbers) {
        // Check rows
        for (let r = 0; r < 9; r++) {
            const indices = board[r].map((val, c) => val === num ? c : -1).filter(c => c !== -1);
            if (indices.length > 1) indices.forEach(c => conflicts.add(`${r}-${c}`));
        }
        // Check columns
        for (let c = 0; c < 9; c++) {
            const indices = board.map((row, r) => row[c] === num ? r : -1).filter(r => r !== -1);
            if (indices.length > 1) indices.forEach(r => conflicts.add(`${r}-${c}`));
        }
        // Check boxes
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const indices: {r: number, c: number}[] = [];
                for (let r_off = 0; r_off < 3; r_off++) {
                    for (let c_off = 0; c_off < 3; c_off++) {
                        const r = br * 3 + r_off;
                        const c = bc * 3 + c_off;
                        if (board[r][c] === num) indices.push({r, c});
                    }
                }
                if (indices.length > 1) indices.forEach(({r, c}) => conflicts.add(`${r}-${c}`));
            }
        }
    }
    return conflicts;
};

// --- Gemini API Service ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const hintSchema = {
  type: Type.OBJECT,
  properties: {
    strategy: {
      type: Type.STRING,
      description: "The name of the Sudoku strategy used (e.g., 'Hidden Single', 'Naked Pair')."
    },
    explanation: {
      type: Type.STRING,
      description: "A very short (1-2 sentences) explanation of how to apply the strategy. Be encouraging, cute, and clear, like a fairy whispering a secret. IMPORTANT: Use 1-based indexing for rows and columns (e.g. '1行5列')."
    },
    highlightedCells: {
      type: Type.ARRAY,
      description: "An array of cell coordinates ({row, col}) that are key to this strategy. This could be a row, column, 3x3 box, or specific individual cells involved.",
      items: {
        type: Type.OBJECT,
        properties: {
          row: { type: Type.INTEGER, description: "The row index (0-8)." },
          col: { type: Type.INTEGER, description: "The column index (0-8)." }
        }
      }
    }
  },
  required: ['strategy', 'explanation', 'highlightedCells'],
};

function formatBoardForPrompt(board: Board): string {
    return board.map(row => row.map(cell => cell === null ? '_' : cell).join(' ')).join('\n');
}

export const getSudokuHint = async (currentBoard: Board, initialBoard: Board): Promise<Hint | null> => {
  const prompt = `
    あなたは、陽気なディズニーキャラクターのような性格を持つ、フレンドリーで親切な数独の専門家です。
    あなたの目標は、最終的な数字を直接明かすことなく、ユーザーがパズルを解くのに役立つ、単一で実用的なヒントを1つ提供することです。
    特定の数独戦略を、**妖精のささやきのように、簡潔に1〜2文で説明してください。**

    これが最初のパズルです:
    ${formatBoardForPrompt(initialBoard)}

    これがユーザーの現在の盤面の状態です（「_」は空のセルを表します）:
    ${formatBoardForPrompt(currentBoard)}

    ユーザーの盤面を分析し、「隠れたシングル」や「裸のペア/トリプル」、「ポインティングペア」のような一般的な数独戦略に基づいてヒントを提供してください。
    利用可能な最も簡単なヒントを見つけることに集中してください。
    ユーザーが学べるように、その戦略を説明し、関連するセルを特定してください。
    
    **重要：ヒントの中でセルに言及する場合は、必ず1から9までの行と列の番号を使用してください（例：「3行5列」）。0から始まる番号は使わないでください。**
    
    回答は指定されたJSON形式で、日本語で返してください。
  `;
  
  try {
    const response = await ai.models.generateContent({
      // FIX: Corrected model name from 'gem-2.5-flash' to 'gemini-2.5-flash' as per documentation.
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: hintSchema,
      }
    });
    
    const jsonString = response.text;
    const hintData = JSON.parse(jsonString) as Hint;

    // Basic validation of the returned data
    if (hintData && hintData.strategy && hintData.explanation && Array.isArray(hintData.highlightedCells)) {
        return hintData;
    }
    return null;

  } catch (error) {
    console.error("Error fetching hint from Gemini:", error);
    return null;
  }
};