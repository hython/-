import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Difficulty, Board, CellPosition, Hint, NotesBoard, GameResult } from '../types';
import { generateSudoku, checkSolution, isCellRelated, findAllConflicts } from '../services/sudokuService';
import { getSudokuHint } from '../services/sudokuService';
import { SparkleIcon } from './icons/SparkleIcon';
import { RestartIcon } from './icons/RestartIcon';
import { EraserIcon } from './icons/EraserIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { PauseIcon } from './icons/PauseIcon';
import { PencilIcon } from './icons/PencilIcon';
import { HelpIcon } from './icons/HelpIcon';
import { HistoryIcon } from './icons/HistoryIcon';

interface GameBoardProps {
  difficulty: Difficulty;
  onNewGame: () => void;
  // FIX: Corrected Omit syntax. The keys to omit should be a union type.
  onGameEnd: (result: Omit<GameResult, 'id' | 'date'>) => void;
}

const difficultyMap: Record<Difficulty, string> = {
  [Difficulty.Easy]: 'ひよこさん🐥',
  [Difficulty.Medium]: 'うさぎさん🐰',
  [Difficulty.Hard]: 'らいおんさん🦁',
};

const SUDOKU_TIPS_JP = [
  'まずは各ボックスで一番少ない数字から探してみましょう。',
  '行や列をスキャンして、1つしか入る場所がない数字を見つけよう。',
  '難しい時は、候補の数字をメモしてみるのも一つの手です。',
  '一つの数字に固執せず、全体を見渡してみましょう。',
  '行き詰まったら、一度休憩して新鮮な目で見てみよう！',
];

const createEmptyBoard = (): Board => Array(9).fill(null).map(() => Array(9).fill(null));

const calculateCompletedUnits = (board: Board): {rows: Set<number>, cols: Set<number>, boxes: Set<number>} => {
    const newCompleted = { rows: new Set<number>(), cols: new Set<number>(), boxes: new Set<number>() };

    // Check rows
    for (let i = 0; i < 9; i++) {
        const row = new Set(board[i]);
        if (row.size === 9 && !row.has(null)) {
            newCompleted.rows.add(i);
        }
    }

    // Check columns
    for (let i = 0; i < 9; i++) {
        const col = new Set(board.map(r => r[i]));
        if (col.size === 9 && !col.has(null)) {
            newCompleted.cols.add(i);
        }
    }

    // Check boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
            const boxIndex = boxRow * 3 + boxCol;
            const box = new Set<number | null>();
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    box.add(board[boxRow * 3 + r][boxCol * 3 + c]);
                }
            }
            if (box.size === 9 && !box.has(null)) {
                newCompleted.boxes.add(boxIndex);
            }
        }
    }
    return newCompleted;
};

const Fireworks: React.FC = () => (
  <div className="fireworks" aria-hidden="true">
    <div className="firework" style={{ top: '80%', left: '25%', animationDelay: '0s' }}></div>
    <div className="firework" style={{ top: '70%', left: '70%', animationDelay: '0.4s' }}></div>
    <div className="firework" style={{ top: '90%', left: '50%', animationDelay: '0.8s' }}></div>
    <div className="firework" style={{ top: '85%', left: '10%', animationDelay: '1.2s' }}></div>
    <div className="firework" style={{ top: '75%', left: '90%', animationDelay: '1.6s' }}></div>
  </div>
);

interface CompletionCelebrationProps {
  type: 'row' | 'col' | 'box';
  index: number;
  onAnimationEnd: () => void;
}

const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({ type, index, onAnimationEnd }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationEnd, 800); // Match animation duration
        return () => clearTimeout(timer);
    }, [onAnimationEnd]);

    const particles = useMemo(() => {
        const numParticles = type === 'box' ? 9 : 5;
        let top = 0, left = 0, width = 0, height = 0;
        
        const cellWidth = 100 / 9;
        
        if (type === 'row') {
            top = index * cellWidth;
            height = cellWidth;
            width = 100;
        } else if (type === 'col') {
            left = index * cellWidth;
            width = cellWidth;
            height = 100;
        } else { // box
            const boxRow = Math.floor(index / 3);
            const boxCol = index % 3;
            top = boxRow * 3 * cellWidth;
            left = boxCol * 3 * cellWidth;
            width = 3 * cellWidth;
            height = 3 * cellWidth;
        }

        return Array.from({ length: numParticles }).map((_, i) => ({
            id: i,
            style: {
                top: `${top + Math.random() * height}%`,
                left: `${left + Math.random() * width}%`,
                animationDelay: `${Math.random() * 0.2}s`,
            }
        }));
    }, [type, index]);

    return (
        <div className="absolute inset-0 pointer-events-none z-30">
            {particles.map(p => (
                <div key={p.id} className="mini-firework" style={p.style}></div>
            ))}
        </div>
    );
};


const GameBoard: React.FC<GameBoardProps> = ({ difficulty, onNewGame, onGameEnd }) => {
  const [initialBoard, setInitialBoard] = useState<Board>(createEmptyBoard);
  const [solutionBoard, setSolutionBoard] = useState<Board>(createEmptyBoard);
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [notes, setNotes] = useState<NotesBoard>(() => Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>())));
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [mistakes, setMistakes] = useState<CellPosition[]>([]);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);
  
  const [history, setHistory] = useState<{ board: Board, notes: NotesBoard }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [time, setTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isNotesMode, setIsNotesMode] = useState<boolean>(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  const [hintHistory, setHintHistory] = useState<Hint[]>([]);
  const [randomTip, setRandomTip] = useState('');
  
  const [mistakeMessage, setMistakeMessage] = useState<string>('');
  const [isHintHistoryModalOpen, setIsHintHistoryModalOpen] = useState(false);
  const [isGameWonModalOpen, setIsGameWonModalOpen] = useState(false);
  
  const [completedUnits, setCompletedUnits] = useState({ rows: new Set<number>(), cols: new Set<number>(), boxes: new Set<number>() });
  const [justCompletedUnits, setJustCompletedUnits] = useState({ rows: new Set<number>(), cols: new Set<number>(), boxes: new Set<number>() });
  const [completionCelebrations, setCompletionCelebrations] = useState<{ id: number; type: 'row' | 'col' | 'box'; index: number }[]>([]);
  
  const numberCounts = useMemo(() => {
    const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    board.forEach(row => row.forEach(cell => {
      if (cell) counts[cell]++;
    }));
    return counts;
  }, [board]);
  
  const initializeGame = useCallback(() => {
    const { puzzle, solution } = generateSudoku(difficulty);
    const initialNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set<number>()));
    setInitialBoard(JSON.parse(JSON.stringify(puzzle)));
    setSolutionBoard(solution);
    setBoard(puzzle);
    setNotes(initialNotes);
    setSelectedCell(null);
    setIsSolved(false);
    setMistakes([]);
    setConflicts(new Set());
    setHighlightedNumber(null);
    setHistory([{ board: puzzle, notes: initialNotes }]);
    setHistoryIndex(0);
    setTime(0);
    setIsPaused(false);
    setIsNotesMode(false);
    setHint(null);
    setIsHintLoading(false);
    setHintHistory([]);
    setIsGameWonModalOpen(false);
    setCompletedUnits({ rows: new Set(), cols: new Set(), boxes: new Set() });
    setJustCompletedUnits({ rows: new Set(), cols: new Set(), boxes: new Set() });
    setCompletionCelebrations([]);
    setRandomTip(SUDOKU_TIPS_JP[Math.floor(Math.random() * SUDOKU_TIPS_JP.length)]);
    setMistakeMessage('');
  }, [difficulty]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isPaused && !isSolved) {
      timer = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPaused, isSolved]);
  
  const updateHistory = useCallback((newBoard: Board, newNotes: NotesBoard) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ board: newBoard, notes: newNotes });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const updateCompletedUnits = useCallback((currentBoard: Board) => {
    const newCompleted = calculateCompletedUnits(currentBoard);
    setCompletedUnits(newCompleted);
  }, []);

  useEffect(() => {
    if (initialBoard[0][0] === undefined) return;
    const isFull = board.every(row => row.every(cell => cell !== null));
    if (isFull) {
        if (checkSolution(board)) {
            setIsSolved(true);
            setIsGameWonModalOpen(true);
            onGameEnd({ difficulty, time, solved: true });
        }
    }
  }, [board, initialBoard, difficulty, time, onGameEnd]);

  const handleCellClick = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
    setHighlightedNumber(board[row][col]);
  }, [board]);
  
  const handleNumpadClick = (num: number) => {
    if (!selectedCell || initialBoard[selectedCell.row][selectedCell.col] !== null) return;
    
    setHint(null);
    setMistakes([]);
    setMistakeMessage('');

    const { row, col } = selectedCell;
    const newBoard = JSON.parse(JSON.stringify(board));
    const newNotes = notes.map(r => r.map(noteSet => new Set(noteSet)));
    
    if (isNotesMode) {
      if (newNotes[row][col].has(num)) {
        newNotes[row][col].delete(num);
      } else {
        newNotes[row][col].add(num);
      }
      newBoard[row][col] = null;
      setNotes(newNotes);
    } else {
      newBoard[row][col] = newBoard[row][col] === num ? null : num;
      newNotes[row][col] = new Set();
      setNotes(newNotes);
    }
    
    const oldCompleted = completedUnits;
    const newCompleted = calculateCompletedUnits(newBoard);
    
    setBoard(newBoard);
    updateHistory(newBoard, newNotes);
    setConflicts(findAllConflicts(newBoard));
    setCompletedUnits(newCompleted);
    
    // --- Celebration Logic ---
    const newlyCompleted = { rows: new Set<number>(), cols: new Set<number>(), boxes: new Set<number>() };
    const newCelebrations = [];
    const currentNum = newBoard[row][col];

    if (currentNum !== null) { // Only celebrate on placing a number
        if (newCompleted.rows.has(row) && !oldCompleted.rows.has(row)) {
            newlyCompleted.rows.add(row);
            newCelebrations.push({ id: Date.now() + Math.random(), type: 'row', index: row });
        }
        if (newCompleted.cols.has(col) && !oldCompleted.cols.has(col)) {
            newlyCompleted.cols.add(col);
            newCelebrations.push({ id: Date.now() + Math.random(), type: 'col', index: col });
        }
        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        if (newCompleted.boxes.has(boxIndex) && !oldCompleted.boxes.has(boxIndex)) {
            newlyCompleted.boxes.add(boxIndex);
            newCelebrations.push({ id: Date.now() + Math.random(), type: 'box', index: boxIndex });
        }
    }
    
    if (newCelebrations.length > 0) {
        setJustCompletedUnits(newlyCompleted);
        setCompletionCelebrations(prev => [...prev, ...newCelebrations]);
        setTimeout(() => {
            setJustCompletedUnits({ rows: new Set(), cols: new Set(), boxes: new Set() });
        }, 1200);
    }
    
    setHighlightedNumber(newBoard[row][col] === num ? num : null);
  };

  const handleErase = () => {
    if (!selectedCell || initialBoard[selectedCell.row][selectedCell.col] !== null) return;
    
    setHint(null);
    setMistakes([]);
    setMistakeMessage('');

    const { row, col } = selectedCell;
    const newBoard = JSON.parse(JSON.stringify(board));
    const newNotes = notes.map(r => r.map(noteSet => new Set(noteSet)));
    
    newBoard[row][col] = null;
    newNotes[row][col] = new Set();
    
    setBoard(newBoard);
    setNotes(newNotes);
    updateHistory(newBoard, newNotes);
    setConflicts(findAllConflicts(newBoard));
    updateCompletedUnits(newBoard);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevState = history[newIndex];
      setBoard(prevState.board);
      setNotes(prevState.notes);
      setConflicts(findAllConflicts(prevState.board));
      updateCompletedUnits(prevState.board);
      setMistakes([]);
      setMistakeMessage('');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex];
      setBoard(nextState.board);
      setNotes(nextState.notes);
      setConflicts(findAllConflicts(nextState.board));
      updateCompletedUnits(nextState.board);
      setMistakes([]);
      setMistakeMessage('');
    }
  };

  const handleGetHint = async () => {
    setIsHintLoading(true);
    setHint(null);
    setMistakeMessage('');
    const result = await getSudokuHint(board, initialBoard);
    if (result) {
        setHint(result);
        setHintHistory(prev => [...prev, result]);
    } else {
        setHint({
            strategy: "うーん...",
            explanation: "ごめんなさい、魔法の水晶玉が曇っててヒントが見つからないみたい。もう一度試してみてね！",
            highlightedCells: []
        });
    }
    setIsHintLoading(false);
  };

  const handleMistakeCheck = () => {
    const wrongCells: CellPosition[] = [];
    board.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell !== null && initialBoard[r][c] === null && cell !== solutionBoard[r][c]) {
                wrongCells.push({ row: r, col: c });
            }
        });
    });
    setMistakes(wrongCells);
    if (wrongCells.length > 0) {
      setMistakeMessage(`${wrongCells.length}個のまちがいが見つかったよ。`);
    } else {
      setMistakeMessage('すごい！今のところ、まちがいは見つからないよ。');
    }
    setHint(null);
  };
  
  const handleClearMistakes = () => {
    const newBoard = JSON.parse(JSON.stringify(board));
    mistakes.forEach(({ row, col }) => {
      if (initialBoard[row][col] === null) {
        newBoard[row][col] = null;
      }
    });
    setBoard(newBoard);
    updateHistory(newBoard, notes);
    setConflicts(findAllConflicts(newBoard));
    updateCompletedUnits(newBoard);
    setMistakes([]);
    setMistakeMessage('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  const handleAbandonGame = () => {
      onGameEnd({ difficulty, time, solved: false });
      onNewGame();
  }
  
  const renderCell = (row: number, col: number) => {
    const cellValue = board[row][col];
    const initialValue = initialBoard[row][col];
    const cellNotes = notes[row][col];
    
    const isInitial = initialValue !== null;
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isRelated = selectedCell ? isCellRelated({ row, col }, selectedCell) : false;
    const isHighlighted = highlightedNumber !== null && cellValue === highlightedNumber;
    const isConflict = conflicts.has(`${row}-${col}`);
    const isMistake = mistakes.some(m => m.row === row && m.col === col);
    const isHintHighlighted = hint?.highlightedCells.some(c => c.row === row && c.col === col) ?? false;
    
    const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const isNewlyCompleted = justCompletedUnits.rows.has(row) || justCompletedUnits.cols.has(col) || justCompletedUnits.boxes.has(boxIndex);

    const cellClasses = [
        "flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-200 aspect-square cursor-pointer",
        "border-r border-b border-dotted border-purple-200/80",
        isInitial ? "text-purple-900" : "text-pink-600",
        isSelected ? "bg-pink-200/80 z-10 scale-110 rounded-lg shadow-lg" : "",
        isRelated && !isSelected ? "bg-purple-100/70" : "",
        isHighlighted && !isSelected ? "bg-yellow-200/80 rounded-lg" : "",
        isConflict && !isInitial ? "bg-red-300 text-white" : "",
        isMistake ? "ring-2 ring-red-500 z-20 rounded-lg" : "",
        isHintHighlighted ? "bg-green-300/80 rounded-lg" : "",
        isNewlyCompleted ? "sparkle-animation" : "",
        (col === 2 || col === 5) ? "!border-r-2 !border-r-purple-300" : "",
        (row === 2 || row === 5) ? "!border-b-2 !border-b-purple-300" : "",
        (col === 8) ? "border-r-0" : "",
        (row === 8) ? "border-b-0" : ""
    ].join(" ");
    
    return (
        <div key={`${row}-${col}`} className={cellClasses} onClick={() => handleCellClick(row, col)}>
          {cellValue ? (
            cellValue
          ) : (
            <div className="grid grid-cols-3 grid-rows-3 text-xs w-full h-full text-purple-400">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center">
                  {cellNotes.has(i + 1) ? i + 1 : ''}
                </div>
              ))}
            </div>
          )}
        </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      <div className="w-full max-w-md flex justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-xl shadow-md">
        <div className="font-bold text-base sm:text-lg text-purple-700">{difficultyMap[difficulty]}</div>
        <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2 font-bold text-base sm:text-lg text-purple-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              <span>{formatTime(time)}</span>
            </div>
            <button onClick={handleAbandonGame} className="py-1 px-3 text-sm bg-pink-400 text-white rounded-lg shadow-md font-semibold hover:bg-pink-500 transition-colors">
                リセット
            </button>
            <button onClick={() => setIsPaused(!isPaused)} className="p-2 rounded-full hover:bg-purple-200/50 transition">
              <PauseIcon className="w-5 h-5 text-purple-600" />
            </button>
        </div>
      </div>
      
      <div className="relative w-full max-w-md flex flex-col items-center gap-3 sm:gap-4">
        {isPaused && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-40 rounded-xl space-y-4">
            <h2 className="text-4xl font-bold text-purple-600 animate-pulse">PAUSED</h2>
            <button 
              onClick={() => setIsPaused(false)} 
              className="py-3 px-8 text-xl font-bold text-white bg-gradient-to-r from-teal-300 to-sky-400 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              続ける
            </button>
          </div>
        )}
        
        <div className="relative grid grid-cols-9 w-full bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border-2 border-purple-300 overflow-hidden">
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 9 }).map((_, col) => renderCell(row, col))
          )}
          {completionCelebrations.map(celebration => (
              <CompletionCelebration
                key={celebration.id}
                type={celebration.type}
                index={celebration.index}
                onAnimationEnd={() => {
                  setCompletionCelebrations(prev => prev.filter(c => c.id !== celebration.id));
                }}
              />
          ))}
        </div>
        
        <div className="w-full p-3 bg-white/60 backdrop-blur-md rounded-xl shadow-md min-h-[80px] flex items-center justify-center max-h-36 overflow-y-auto">
          {mistakeMessage ? (
              <div className="text-center text-red-600 font-bold">
                  <p>{mistakeMessage}</p>
                  {mistakes.length > 0 && (
                      <button 
                        onClick={handleClearMistakes}
                        className="mt-2 py-1 px-3 text-sm bg-red-400 text-white rounded-lg shadow-md font-semibold hover:bg-red-500 transition-colors"
                      >
                        まちがいを全部クリア
                      </button>
                  )}
              </div>
          ) : isHintLoading ? (
              <div className="text-purple-600 font-semibold">魔法の水晶玉でヒントを探しているよ...</div>
          ) : hint ? (
              <div className="text-left text-fuchsia-800 w-full">
                  <p className="font-bold text-sm sm:text-base">🧚‍♀️妖精のヒント: 「{hint.strategy}」</p>
                  <p className="text-xs sm:text-sm text-fuchsia-700">{hint.explanation}</p>
              </div>
          ) : (
              <div className="text-center text-purple-500 italic">
                  <p className="font-semibold">今日の魔法のヒント✨</p>
                  <p>{randomTip}</p>
              </div>
          )}
        </div>

        <div className="grid grid-cols-9 gap-1 sm:gap-2 w-full px-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleNumpadClick(i + 1)}
              disabled={numberCounts[i + 1] === 9}
              className="flex items-center justify-center text-2xl sm:text-3xl font-bold rounded-lg aspect-square bg-white/70 backdrop-blur-sm shadow-lg text-pink-500 border border-pink-200 hover:bg-pink-100/80 disabled:bg-gray-200/70 disabled:text-gray-400 disabled:cursor-not-allowed transform hover:scale-110 transition-all duration-200"
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 w-full max-w-md">
          <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-100 transition-colors"><UndoIcon className="w-6 h-6 text-purple-600" /></button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-100 transition-colors"><RedoIcon className="w-6 h-6 text-purple-600" /></button>
          <button onClick={handleErase} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-purple-100 transition-colors"><EraserIcon className="w-6 h-6 text-purple-600" /></button>
          <button onClick={() => setIsNotesMode(!isNotesMode)} className={`p-3 rounded-lg shadow-md flex items-center justify-center transition-colors ${isNotesMode ? 'bg-cyan-300' : 'bg-white/70 backdrop-blur-sm hover:bg-purple-100'}`}><PencilIcon className="w-6 h-6 text-purple-600" /></button>
          <button onClick={handleGetHint} disabled={isHintLoading} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center disabled:opacity-50 hover:bg-purple-100 transition-colors"><SparkleIcon className="w-6 h-6 text-yellow-500" /></button>
          <button onClick={() => setIsHintHistoryModalOpen(true)} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-purple-100 transition-colors"><HistoryIcon className="w-6 h-6 text-purple-700" /></button>
          <button onClick={handleMistakeCheck} className="p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center hover:bg-purple-100 transition-colors"><HelpIcon className="w-6 h-6 text-red-500" /></button>
        </div>
      </div>
      
      {isGameWonModalOpen && <Fireworks />}
      
      {isGameWonModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl text-center flex flex-col items-center gap-4 transform scale-100 transition-transform">
            <SparkleIcon className="w-16 h-16 text-yellow-400" />
            <h2 className="text-3xl font-bold text-purple-600">おめでとう！</h2>
            <p className="text-lg text-gray-700">パズルをクリアしました！</p>
            <p className="text-xl font-semibold">タイム: <span className="text-pink-500">{formatTime(time)}</span></p>
            <button onClick={onNewGame} className="mt-4 w-full py-3 text-xl font-bold text-white bg-gradient-to-r from-teal-300 to-sky-400 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              新しいゲーム
            </button>
          </div>
        </div>
      )}
      
      {isHintHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-lg p-6 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-sm w-11/12 h-3/4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-purple-600">ヒントの履歴</h2>
                <button onClick={() => setIsHintHistoryModalOpen(false)} className="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <div className="overflow-y-auto flex-grow pr-2">
                {hintHistory.length > 0 ? (
                    hintHistory.map((h, i) => (
                        <div key={i} className="mb-4 p-3 bg-purple-50 rounded-lg">
                            <p className="font-bold text-purple-800">🧚‍♀️ ヒント {i+1}: 「{h.strategy}」</p>
                            <p className="text-sm text-purple-700">{h.explanation}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center mt-8">まだヒントは使っていないよ。</p>
                )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GameBoard;