import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User } from '../types';
import { db } from '../services/database';
import { getRank } from '../data/ranks';

interface LoadingScreenProps {
  user: User | null;
  onCoinCollected: () => void;
}

interface FallingItem {
  id: number;
  x: number;
  speed: number;
  type: 'coin' | 'pill';
  collected: boolean;
  angle: number;
  rotationSpeed: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ user, onCoinCollected }) => {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [localCoins, setLocalCoins] = useState(user?.profile.coins || 0);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  // Fix: Added initial value null to useRef to match expected signature and prevent "Expected 1 arguments, but got 0" error.
  const requestRef = useRef<number | null>(null);
  const lastSpawnTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allUsers = Object.values(db.getAllUsers());
    const sorted = allUsers.sort((a, b) => b.profile.xp - a.profile.xp).slice(0, 5);
    setLeaderboard(sorted);
  }, []);

  const spawnItem = useCallback((time: number) => {
    const newItem: FallingItem = {
      id: time + Math.random(),
      x: Math.random() * 80 + 10,
      speed: Math.random() * 0.4 + 0.3, // Speed as percentage of screen per frame roughly
      type: Math.random() > 0.85 ? 'pill' : 'coin',
      collected: false,
      angle: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4
    };
    return newItem;
  }, []);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // Spawn new items
      if (time - lastSpawnTime.current > 700) {
        setItems(prev => [...prev, spawnItem(time)]);
        lastSpawnTime.current = time;
      }

      setItems(prev => {
        return prev
          .map(item => ({
            ...item,
            // Simple falling logic using a vertical progress property would be safer but we'll use a top style in render
            // We just need to filter out items that have left the screen
          }))
          .filter(item => {
            // This is a bit tricky with just state, let's just use a timer or position check
            // For now, we'll rely on the CSS animation or a simpler state-based drift
            return true; 
          });
      });

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [spawnItem]);

  const handleCollect = (e: React.MouseEvent | React.TouchEvent, id: number, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item && !item.collected) {
        if (type === 'coin') {
          setLocalCoins(c => c + 1);
          onCoinCollected();
        }
        return prev.map(i => i.id === id ? { ...i, collected: true } : i);
      }
      return prev;
    });
  };

  const username = user?.username || 'Guest';
  const avatarSeed = user?.username || 'guest';
  const rank = getRank(user?.profile.xp || 0);

  return (
    <div className="fixed inset-0 bg-kawaii-surface overflow-hidden font-sans touch-none select-none z-50 flex flex-col items-center">
      <style>{`
        @keyframes fall-linear {
          0% { transform: translateY(-100px); opacity: 0; }
          5% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 1; }
        }
        @keyframes pop-out {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .falling-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .item-wrapper {
          position: absolute;
          pointer-events: auto;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fall-linear linear forwards;
          cursor: pointer;
        }
        .item-visual {
          font-size: 2.5rem;
          transition: transform 0.1s;
          filter: drop-shadow(0 4px 4px rgba(0,0,0,0.1));
        }
        .item-visual:active {
          transform: scale(1.2);
        }
        .collected-pop {
          animation: pop-out 0.3s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      {/* Falling Items Layer */}
      <div className="falling-container" ref={containerRef}>
        {items.map(item => (
          <div
            key={item.id}
            className={`item-wrapper ${item.collected ? 'collected-pop' : ''}`}
            style={{
              left: `${item.x}%`,
              animationDuration: `${3 / item.speed}s`, // Varied speeds
              visibility: item.id < lastSpawnTime.current - 10000 ? 'hidden' : 'visible' // Cleanup old ones visually
            }}
            onMouseDown={(e) => handleCollect(e, item.id, item.type)}
            onTouchStart={(e) => handleCollect(e, item.id, item.type)}
          >
            <div 
              className="item-visual"
              style={{ transform: `rotate(${item.angle}deg)` }}
            >
              {item.type === 'coin' ? '🪙' : '💊'}
            </div>
          </div>
        ))}
      </div>

      {/* UI Overlay */}
      <div className="relative z-30 w-full h-full flex flex-col pointer-events-none p-6">
        
        {/* Top Centered Status */}
        <div className="flex flex-col items-center gap-4 mt-8">
           <div className="bg-white rounded-[2rem] px-8 py-5 shadow-[0_12px_0_0_rgba(193,225,255,1)] border-4 border-kawaii-blue text-center pointer-events-auto max-w-sm w-full animate-pop-in">
              <div className="flex items-center justify-center gap-4 mb-3">
                 <div className="w-8 h-8 rounded-full border-4 border-kawaii-pink border-t-kawaii-dark animate-spin"></div>
                 <h2 className="text-xl font-bold text-kawaii-dark">Paging Next Patient...</h2>
              </div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest leading-relaxed">
                Collecting coins adds to your balance!
              </p>
           </div>

           <div className="bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full border-2 border-yellow-200 animate-bounce">
              Mini-game active!
           </div>
        </div>

        {/* Floating Coin Counter */}
        <div className="absolute top-6 right-6 pointer-events-auto">
           <div className="bg-white border-4 border-yellow-400 text-yellow-700 rounded-3xl px-5 py-2 font-black text-2xl shadow-[0_6px_0_0_rgba(250,204,21,1)] flex items-center gap-3 transform rotate-3">
             <span className="text-3xl">🪙</span>
             <span className="tabular-nums">{localCoins}</span>
           </div>
        </div>

        {/* Bottom Bar Info */}
        <div className="mt-auto flex flex-col sm:flex-row justify-between items-end gap-4 pb-4">
             {/* Player Profile Summary */}
             <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-xl border-4 border-kawaii-blue w-full sm:w-64 pointer-events-auto flex items-center gap-4 animate-pop-in">
                <div className="relative">
                  <img 
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`} 
                    className="w-14 h-14 rounded-2xl bg-kawaii-blue/20 border-2 border-kawaii-blue" 
                    alt="avatar"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                    <span className="text-sm">{rank.icon}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-kawaii-dark truncate">{username}</div>
                  <div className="text-[10px] text-purple-600 font-black bg-purple-50 px-2 py-0.5 rounded-lg inline-block mt-1 uppercase tracking-wider">
                    {rank.title}
                  </div>
                </div>
             </div>

             {/* Leaderboard Summary */}
             <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-xl border-4 border-kawaii-pink w-full sm:w-64 pointer-events-auto animate-pop-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-[10px] font-black text-kawaii-pink uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                  <span className="text-sm">🏆</span> Leaderboard
                </h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 3).map((u, i) => (
                    <div key={u.id} className="flex justify-between items-center text-xs">
                       <span className={`font-bold truncate max-w-[120px] ${u.username === username ? 'text-kawaii-pinkDark underline' : 'text-gray-500'}`}>
                         {i + 1}. {u.username}
                       </span>
                       <span className="font-mono font-bold text-blue-400 tabular-nums">{u.profile.xp} XP</span>
                    </div>
                  ))}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
