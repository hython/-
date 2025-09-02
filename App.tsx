
import React, { useState } from 'react';
import { Difficulty, GameResult } from './types';
import GameBoard from './components/GameBoard';
import DifficultySelector from './components/DifficultySelector';
import PlayHistory from './components/PlayHistory';
import { CastleIcon } from './components/icons/CastleIcon';

const HISTORY_KEY = 'sudoku_history';

const saveGameResult = (result: Omit<GameResult, 'id' | 'date'>) => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        const history = historyJson ? JSON.parse(historyJson) : [];
        const newResult: GameResult = {
            ...result,
            id: `game_${Date.now()}`,
            date: Date.now(),
        };
        history.push(newResult);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save game result:", e);
    }
};


const App: React.FC = () => {
  const [view, setView] = useState<'selector' | 'game' | 'history'>('selector');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [gameId, setGameId] = useState<number>(1);

  const handleSelectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    setView('game');
    setGameId(prevId => prevId + 1);
  };
  
  const handleNewGame = () => {
    setDifficulty(null);
    setView('selector');
  }
  
  const handleGameEnd = (result: { difficulty: Difficulty; time: number; solved: boolean; }) => {
    saveGameResult(result);
  };

  const renderContent = () => {
    switch (view) {
        case 'history':
            return <PlayHistory onBack={() => setView('selector')} />;
        case 'game':
            if (difficulty) {
                return <GameBoard key={gameId} difficulty={difficulty} onNewGame={handleNewGame} onGameEnd={handleGameEnd} />;
            }
            // Fallback to selector if difficulty is not set
            setView('selector');
            return <DifficultySelector onSelectDifficulty={handleSelectDifficulty} onShowHistory={() => setView('history')} />;
        case 'selector':
        default:
            return <DifficultySelector onSelectDifficulty={handleSelectDifficulty} onShowHistory={() => setView('history')} />;
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 text-gray-800">
      <header className="text-center mb-4 sm:mb-6">
        <div className="flex justify-center items-center gap-2 sm:gap-4">
          <CastleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-pink-300" />
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-wider" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.3)' }}>
            魔法の数独
          </h1>
          <CastleIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-300" />
        </div>
        <p className="text-white/90 font-semibold mt-2 text-sm sm:text-base">おとぎ話のパズルアドベンチャー！</p>
      </header>

      <main className="w-full max-w-lg mx-auto">
        {renderContent()}
      </main>
      <footer className="mt-6 sm:mt-8 text-center text-white/80 text-xs sm:text-sm">
        <p>ReactとGeminiで作ったよ ✨</p>
      </footer>
    </div>
  );
};

export default App;