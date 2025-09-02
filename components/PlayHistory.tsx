
import React, { useState, useMemo } from 'react';
import { Difficulty, GameResult } from '../types';

const HISTORY_KEY = 'sudoku_history';

const getGameHistory = (): GameResult[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Failed to parse game history:", error);
    return [];
  }
};

const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds)) return "---";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const difficultyMap: Record<Difficulty, string> = {
  [Difficulty.Easy]: 'ひよこさん🐥',
  [Difficulty.Medium]: 'うさぎさん🐰',
  [Difficulty.Hard]: 'らいおんさん🦁',
};

const StatCard: React.FC<{label: string, value: string | number}> = ({ label, value }) => (
    <div className="bg-white/50 backdrop-blur-sm p-3 rounded-lg text-center">
        <div className="text-sm text-purple-700 font-semibold">{label}</div>
        <div className="text-2xl text-purple-900 font-bold">{value}</div>
    </div>
);

const HistoryChart: React.FC<{data: number[]}> = ({ data }) => {
    const width = 300;
    const height = 150;
    const padding = 20;
    
    if (data.length < 2) {
        return <div className="h-[150px] flex items-center justify-center text-purple-500">グラフを表示するには、もっとクリアしてね！</div>;
    }

    const maxTime = Math.max(...data);
    const minTime = Math.min(...data);
    const timeRange = maxTime - minTime;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - padding - ((d - minTime) / (timeRange || 1)) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full flex justify-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm">
                <text x={padding - 15} y={padding + 5} fontSize="10" fill="#a855f7">{formatTime(maxTime)}</text>
                <text x={padding - 15} y={height - padding + 5} fontSize="10" fill="#a855f7">{formatTime(minTime)}</text>
                <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={points} />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - padding - ((d - minTime) / (timeRange || 1)) * (height - 2 * padding);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#ec4899" />;
                })}
            </svg>
        </div>
    );
};


const PlayHistory: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const history = useMemo(() => getGameHistory(), []);

  const stats = useMemo(() => {
    const filteredHistory = history.filter(game => game.difficulty === activeDifficulty);
    const wins = filteredHistory.filter(game => game.solved);
    const totalPlayed = filteredHistory.length;
    const winRate = totalPlayed > 0 ? Math.round((wins.length / totalPlayed) * 100) : 0;
    const winTimes = wins.map(game => game.time);
    const avgTime = winTimes.length > 0 ? winTimes.reduce((a, b) => a + b, 0) / winTimes.length : 0;
    const bestTime = winTimes.length > 0 ? Math.min(...winTimes) : 0;

    return {
        totalPlayed,
        winRate: `${winRate}%`,
        avgTime: formatTime(avgTime),
        bestTime: formatTime(bestTime),
        chartData: wins.slice(-10).map(g => g.time) // last 10 wins
    };
  }, [history, activeDifficulty]);

  const difficultyLevels = Object.values(Difficulty);

  return (
    <div className="p-4 sm:p-6 bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl shadow-purple-400/30 flex flex-col items-center gap-4 w-full">
      <div className="flex justify-between items-center w-full">
        <button onClick={onBack} className="p-2 text-purple-600 hover:text-pink-500 font-bold transition-colors">&lt; 戻る</button>
        <h2 className="text-2xl sm:text-3xl font-bold text-purple-600">プレイの記録</h2>
        <div className="w-16"></div>
      </div>
      
      <div className="w-full bg-purple-200/50 p-1 rounded-full flex justify-center gap-1">
        {difficultyLevels.map(level => (
            <button
                key={level}
                onClick={() => setActiveDifficulty(level)}
                className={`flex-1 py-2 px-3 text-sm sm:text-base font-bold rounded-full transition-colors duration-300 ${activeDifficulty === level ? 'bg-white shadow-md text-purple-700' : 'text-purple-500'}`}
            >
                {difficultyMap[level]}
            </button>
        ))}
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <StatCard label="プレイ回数" value={stats.totalPlayed} />
        <StatCard label="クリア率" value={stats.winRate} />
        <StatCard label="平均タイム" value={stats.avgTime} />
        <StatCard label="ベストタイム" value={stats.bestTime} />
      </div>
      
      <div className="w-full mt-2">
        <h3 className="text-lg font-bold text-purple-700 mb-2 text-center">クリアタイムの傾向（最近10回）</h3>
        <HistoryChart data={stats.chartData} />
      </div>
    </div>
  );
};

export default PlayHistory;