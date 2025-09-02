
import React from 'react';
import { Difficulty } from '../types';

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onShowHistory: () => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelectDifficulty, onShowHistory }) => {
  return (
    <div className="p-6 sm:p-8 bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl shadow-purple-400/30 flex flex-col items-center gap-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-purple-700">どの魔法レベルに挑戦する？</h2>
      <div className="w-full flex flex-col gap-4">
        <button
          onClick={() => onSelectDifficulty(Difficulty.Easy)}
          className="w-full py-3 sm:py-4 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-green-300 to-cyan-400 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          ひよこさんコース 🐥
        </button>
        <button
          onClick={() => onSelectDifficulty(Difficulty.Medium)}
          className="w-full py-3 sm:py-4 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-yellow-300 to-orange-400 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          うさぎさんコース 🐰
        </button>
        <button
          onClick={() => onSelectDifficulty(Difficulty.Hard)}
          className="w-full py-3 sm:py-4 text-lg sm:text-xl font-bold text-white bg-gradient-to-r from-pink-400 to-red-500 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          らいおんさんコース 🦁
        </button>
         <button
          onClick={onShowHistory}
          className="w-full mt-4 py-3 text-base sm:text-lg font-bold text-purple-600 bg-white/80 border-2 border-purple-300 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
        >
          プレイの記録を見る
        </button>
      </div>
    </div>
  );
};

export default DifficultySelector;