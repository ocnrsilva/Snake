
import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

enum GameState {
  START,
  PLAYING,
  GAMEOVER
}

interface LeaderboardEntry {
  name: string;
  score: number;
  isPlayer: boolean;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('Player' + Math.floor(Math.random() * 1000));

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setIsPaused(false);
    setLeaderboard([]);
  };

  const togglePause = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setIsPaused(prev => !prev);
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  const onGameOver = useCallback(() => {
    setGameState(GameState.GAMEOVER);
  }, []);

  return (
    <div className="relative w-full h-full text-white font-sans">
      {/* TELA INICIAL */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 p-6 overflow-y-auto">
          <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            NEON SLITHER
          </h1>
          
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <label className="block text-sm font-medium text-slate-400 mb-2">Seu Nome</label>
            <input 
              type="text" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            
            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transform active:scale-95 transition-all mb-8"
            >
              JOGAR AGORA
            </button>

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Controles</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-white font-bold">🖱️</div>
                  <span>Mouse para mover</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-white font-bold">⌨️</div>
                  <span>WASD ou Setas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-white font-bold">⚡</div>
                  <span>Espaço / Clique para Boost</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-white font-bold">⏸️</div>
                  <span>ESC para Pausar</span>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Itens Especiais</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-emerald-500/20">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400 font-bold text-lg">🟢</div>
                  <div className="text-[10px] leading-tight">
                    <span className="block font-bold text-emerald-400">ITEM +</span>
                    Dobra o seu tamanho atual instantaneamente.
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-amber-500/20">
                  <div className="w-8 h-8 bg-amber-500/20 rounded flex items-center justify-center text-amber-400 font-bold text-lg">⚡</div>
                  <div className="text-[10px] leading-tight">
                    <span className="block font-bold text-amber-400">RAIO</span>
                    Super velocidade por 30 segundos.
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-blue-500/20">
                  <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold text-lg">😇</div>
                  <div className="text-[10px] leading-tight">
                    <span className="block font-bold text-blue-400">ANJINHO</span>
                    Invencibilidade total por 15 segundos.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOGO ATIVO */}
      {gameState === GameState.PLAYING && (
        <>
          {/* OVERLAY SCORE & LEADERBOARD */}
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Sua Pontuação</span>
              <div className="text-3xl font-black tabular-nums tracking-tighter text-blue-400">{score}</div>
            </div>
          </div>

          <div className="absolute top-6 right-6 z-10 w-48 pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                Top Ranking
              </div>
              <div className="p-2 flex flex-col gap-1">
                {leaderboard.map((entry, i) => (
                  <div 
                    key={i} 
                    className={`flex justify-between items-center px-2 py-1 rounded text-[11px] ${entry.isPlayer ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-slate-400'}`}
                  >
                    <span className="truncate max-w-[80px]">{i+1}. {entry.name}</span>
                    <span className="tabular-nums font-mono opacity-80">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <GameCanvas 
            onScoreUpdate={setScore} 
            onLeaderboardUpdate={setLeaderboard}
            onGameOver={onGameOver}
            playerName={playerName}
            isPaused={isPaused}
          />

          {/* MENU DE PAUSA */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-800 p-10 rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-500/10 text-center w-full max-sm:mx-4 max-w-sm">
                <h2 className="text-4xl font-black text-white mb-8 tracking-tighter">JOGO PAUSADO</h2>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all transform active:scale-95"
                  >
                    CONTINUAR
                  </button>
                  <button 
                    onClick={() => setGameState(GameState.START)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all transform active:scale-95"
                  >
                    SAIR PARA O MENU
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* FIM DE JOGO */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 animate-in fade-in duration-500">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-red-500/30">
              <span className="text-4xl font-bold">💀</span>
            </div>
            <h2 className="text-5xl font-black text-red-500 mb-2 tracking-tighter uppercase">Fim de Jogo</h2>
            <p className="text-slate-400 text-xl mb-8 font-medium">Sua pontuação final: <span className="text-white font-bold">{score}</span></p>
            <button 
              onClick={() => setGameState(GameState.START)}
              className="bg-white text-black font-black py-4 px-12 rounded-full hover:bg-slate-200 transition-all shadow-xl transform hover:scale-105 active:scale-95"
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
