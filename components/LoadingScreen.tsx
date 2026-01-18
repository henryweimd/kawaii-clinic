import React, { useEffect, useState, useRef } from 'react';
import { User } from '../types';
import { db } from '../services/database';
import { getRank } from '../data/ranks';

interface LoadingScreenProps {
  user: User | null;
  onCoinCollected: () => void;
}

interface FallingItem {
  id: number;
  x: number; // percentage
  speed: number; // seconds to fall
  type: 'coin' | 'pill';
  collected: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ user, onCoinCollected }) => {
  const [items, setItems] = useState<FallingItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const requestRef = useRef<number>();
  const lastSpawnTime = useRef<number>(0);
  
  useEffect(() => {
    const allUsers = Object.values(db.getAllUsers());
    const sorted = allUsers.sort((a, b) => b.profile.xp - a.profile.xp).slice(0, 5);
    setLeaderboard(sorted);
  }, []);

  useEffect(() => {
    const animate = (time: number) => {
      if (time - lastSpawnTime.current > 500) { 
        const newItem: FallingItem = {
          id: time,
          x: Math.random() * 84 + 8, // Avoid being too close to the very edge
          speed: Math.random() * 2 + 2, // Slightly slower for easier catching
          type: Math.random() > 0.8 ? 'pill' : 'coin',
          collected: false
        };
        setItems(prev => [...prev, newItem]);
        lastSpawnTime.current = time;
      }

      setItems(prev => {
        if (prev.length > 20) return prev.slice(prev.length - 20);
        return prev;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleCollect = (id: number, type: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, collected: true } : item));
    onCoinCollected();
  };

  const username = user?.username || 'Guest';
  const avatarSeed = user?.username || 'guest';
  const rank = getRank(user?.profile.xp || 0);

  return (
    <div className="fixed inset-0 bg-kawaii-surface overflow-hidden font-sans touch-none select-none z-50">
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-15vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(115vh) rotate(360deg); opacity: 1; }
        }
        .falling-item {
          position: absolute;
          top: 0;
          cursor: pointer;
          animation-name: fall;
          animation-timing-function: linear;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px; /* Larger hit area */
          height: 80px;
        }
      `}</style>

      {/* Background/Game Layer */}
      <div className="absolute inset-0 z-10">
        {items.map(item => !item.collected && (
          <div
            key={item.id}
            className="falling-item pointer-events-auto active:scale-95 transition-transform"
            style={{
              left: `${item.x}%`,
              marginLeft: '-40px', // Center the wide hit area
              animationDuration: `${item.speed}s`,
              zIndex: 20
            }}
            onMouseDown={(e) => { e.preventDefault(); handleCollect(item.id, item.type); }}
            onTouchStart={(e) => { e.preventDefault(); handleCollect(item.id, item.type); }}
          >
            <span style={{ fontSize: item.type === 'coin' ? '2.5rem' : '2.2rem' }}>
              {item.type === 'coin' ? '🪙' : '💊'}
            </span>
          </div>
        ))}
      </div>

      <div className="relative z-30 w-full h-full flex flex-col pointer-events-none px-4">
        
        <div className="w-full flex justify-center pt-10 md:pt-14">
           <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-xl border-4 border-kawaii-blue text-center pointer-events-auto max-w-sm w-full">
              <div className="flex items-center justify-center gap-3 mb-2">
                 <div className="animate-spin h-5 w-5 border-4 border-blue-400 border-t-transparent rounded-full"></div>
                 <h2 className="text-lg md:text-xl font-bold text-kawaii-dark leading-tight">Gemini 3 is calling a new patient...</h2>
              </div>
              <div className="mt-1 inline-block bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full animate-pulse">
                 Tap falling items for extra coins!
              </div>
           </div>
        </div>

        <div className="absolute top-4 right-4 pointer-events-auto">
           <div className="bg-yellow-300 border-2 sm:border-4 border-yellow-400 text-yellow-900 rounded-full px-4 py-1.5 font-black text-lg sm:text-xl shadow-lg flex items-center gap-2 transform rotate-2">
             <span>🪙</span>
             <span>{user?.profile.coins || 0}</span>
           </div>
        </div>

        <div className="mt-auto p-6 hidden md:flex justify-between items-end opacity-90">
             <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border-2 border-gray-100 w-56 pointer-events-auto">
                <div className="flex items-center gap-3">
                   <img 
                      src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${avatarSeed}`} 
                      className="w-10 h-10 rounded-full bg-gray-50 border-2 border-gray-200" 
                      alt="avatar"
                   />
                   <div className="min-w-0">
                      <div className="font-bold text-kawaii-dark truncate text-sm">{username}</div>
                      <div className="text-[9px] text-gray-400 font-black bg-purple-100 px-2 py-0.5 rounded-full inline-block mt-1 uppercase">
                        {rank.title}
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border-2 border-kawaii-pink w-56 pointer-events-auto">
                <h3 className="text-[10px] font-black text-kawaii-pink uppercase mb-2 flex items-center gap-1 tracking-widest">
                  🏆 Clinic Rankings
                </h3>
                <div className="space-y-1.5">
                  {leaderboard.slice(0,3).map((u, i) => (
                    <div key={u.id} className="flex justify-between items-center text-[11px]">
                       <span className={`font-bold truncate max-w-[100px] ${i===0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                         {i+1}. {u.username}
                       </span>
                       <span className="font-mono font-bold text-blue-500">{u.profile.xp} XP</span>
                    </div>
                  ))}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};