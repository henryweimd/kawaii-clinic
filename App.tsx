import React, { useState, useEffect, useCallback, useRef } from 'react';
import { caseManager } from './services/caseManager';
import { db } from './services/database';
import { authService } from './services/auth';
import { PatientCase, GameState, User } from './types';
import { Button } from './components/Button';
import { AuthScreen } from './components/AuthScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { SHOP_ITEMS } from './data/shopItems';
import { RANKS, getRank, getNextRank } from './data/ranks';

// Icons
const CoinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="text-yellow-600" fill="gold" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v8m-2-4h4" className="text-yellow-800" />
  </svg>
);

const ShopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    user: null,
    currentCase: null,
    currentStageIndex: 0,
    score: 0,
    coins: 0,
    xp: 0,
    inventory: [],
    streak: 0,
    loading: true,
    gameStatus: 'idle',
    feedbackMessage: null,
    isCorrect: null,
    view: 'clinic',
    showExplanation: false,
    justLeveledUp: undefined
  });

  const [error, setError] = useState<string | null>(null);
  const [removedChoiceId, setRemovedChoiceId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Check Session on Mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setGameState(prev => ({
        ...prev,
        user: currentUser,
        coins: currentUser.profile.coins,
        xp: currentUser.profile.xp,
        score: currentUser.profile.score,
        inventory: currentUser.profile.inventory,
        loading: false
      }));
      loadNewCase(currentUser.profile.xp);
    } else {
      setGameState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // 2. Persist User Profile Changes
  useEffect(() => {
    if (gameState.user) {
      const updatedProfile = {
        coins: gameState.coins,
        xp: gameState.xp,
        score: gameState.score,
        inventory: gameState.inventory
      };
      
      // Update the user object in state too to keep it in sync
      const updatedUser = { ...gameState.user, profile: updatedProfile };
      
      if (!gameState.user.isGuest) {
        db.saveUser(updatedUser);
      }
    }
  }, [gameState.coins, gameState.xp, gameState.score, gameState.inventory, gameState.user]);

  const handleLogin = (user: User) => {
    let finalProfile = user.profile;
    if (gameState.user?.isGuest && user.profile.xp === 0 && user.profile.coins === 100) {
       finalProfile = {
         coins: gameState.coins,
         xp: gameState.xp,
         score: gameState.score,
         inventory: gameState.inventory
       };
       user.profile = finalProfile;
       db.saveUser(user);
    }

    setGameState(prev => ({
      ...prev,
      user,
      coins: finalProfile.coins,
      xp: finalProfile.xp,
      score: finalProfile.score,
      inventory: finalProfile.inventory,
      loading: false
    }));
    setShowLoginModal(false);
    
    if (!gameState.currentCase) {
      loadNewCase(finalProfile.xp);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = authService.createGuestUser();
    setGameState(prev => ({
      ...prev,
      user: guestUser,
      coins: guestUser.profile.coins,
      xp: guestUser.profile.xp,
      score: guestUser.profile.score,
      inventory: guestUser.profile.inventory,
      loading: false
    }));
    loadNewCase(guestUser.profile.xp);
  };

  const handleLogout = () => {
    authService.logout();
    setGameState({
      user: null,
      currentCase: null,
      currentStageIndex: 0,
      score: 0,
      coins: 0,
      xp: 0,
      inventory: [],
      streak: 0,
      loading: false,
      gameStatus: 'idle',
      feedbackMessage: null,
      isCorrect: null,
      view: 'clinic',
      showExplanation: false
    });
  };

  const handleMiniGameCoin = () => {
    // Explicitly update coins state, which will trigger the sync useEffect
    setGameState(prev => ({ ...prev, coins: prev.coins + 1 }));
  };

  const loadNewCase = useCallback(async (currentXp: number = 0) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setGameState(prev => ({ 
      ...prev, 
      loading: true, 
      currentCase: null, 
      currentStageIndex: 0,
      gameStatus: 'playing', 
      feedbackMessage: null, 
      isCorrect: null, 
      showExplanation: false,
      justLeveledUp: undefined
    }));
    setRemovedChoiceId(null);
    setError(null);

    try {
      const newCase = await caseManager.getNextCase(currentXp || gameState.xp);
      setGameState(prev => ({
        ...prev,
        currentCase: newCase,
        currentStageIndex: 0,
        loading: false,
      }));
    } catch (error) {
      console.error("Error loading case", error);
      setError("Oh no! The pager is broken. We couldn't find a new patient.");
      setGameState(prev => ({ ...prev, loading: false }));
    }
  }, [gameState.xp]);

  useEffect(() => {
    if (!gameState.user) return;
    const interval = setInterval(() => {
      let income = 0;
      gameState.inventory.forEach(itemId => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (item?.effect === 'passive_income' && item.value) {
          income += item.value;
        }
      });
      if (income > 0) {
        setGameState(prev => ({ ...prev, coins: prev.coins + income }));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [gameState.inventory, gameState.user]);

  const handleChoice = (choiceId: string) => {
    if (!gameState.currentCase || gameState.gameStatus !== 'playing') return;

    const currentStage = gameState.currentCase.stages[gameState.currentStageIndex];
    const isCorrect = choiceId === currentStage.correctChoiceId;
    const selectedChoice = currentStage.choices.find(c => c.id === choiceId);
    
    const isLastStage = gameState.currentStageIndex >= gameState.currentCase.stages.length - 1;
    const isCaseComplete = isCorrect && isLastStage;
    
    let coinReward = isCorrect ? (isCaseComplete ? 50 : 20) : 0;
    const xpGain = isCorrect ? (isCaseComplete ? 100 : 20) : 25;

    const hasMultiplier = gameState.inventory.some(id => {
       const item = SHOP_ITEMS.find(i => i.id === id);
       return item?.effect === 'double_coins';
    });
    
    if (isCorrect && hasMultiplier) {
      coinReward = Math.floor(coinReward * 1.5);
    }

    setGameState(prev => {
      const newXp = prev.xp + xpGain;
      const oldRank = getRank(prev.xp);
      const newRank = getRank(newXp);
      const hasLeveledUp = newRank.id > oldRank.id;

      let newStatus: GameState['gameStatus'] = 'failure';
      if (isCorrect) {
        newStatus = isCaseComplete ? 'case_success' : 'stage_success';
      }

      if (!prev.user?.isGuest && isCaseComplete) {
         caseManager.submitResult(prev.currentCase!.id, true);
      } else if (!prev.user?.isGuest && !isCorrect) {
         caseManager.submitResult(prev.currentCase!.id, false);
      }

      return {
        ...prev,
        gameStatus: newStatus,
        score: isCorrect ? prev.score + (isCaseComplete ? 100 : 20) : prev.score,
        coins: prev.coins + coinReward,
        xp: newXp,
        streak: isCorrect ? prev.streak : 0,
        feedbackMessage: selectedChoice?.feedback || "Processing...",
        isCorrect: isCorrect,
        justLeveledUp: hasLeveledUp ? { title: newRank.title, rankId: newRank.id } : undefined
      };
    });

    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    
    if (isCaseComplete || !isCorrect) {
       autoAdvanceTimerRef.current = setTimeout(() => {
         loadNewCase(gameState.xp + xpGain);
       }, 5000);
    }
  };

  const handleNextStage = () => {
    setGameState(prev => ({
      ...prev,
      currentStageIndex: prev.currentStageIndex + 1,
      gameStatus: 'playing',
      feedbackMessage: null,
      isCorrect: null
    }));
  };

  const handleLearnMore = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setGameState(prev => ({ ...prev, showExplanation: true }));
  };

  const handleManualNext = () => {
    loadNewCase(gameState.xp);
  };

  const buyItem = (itemId: string) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (gameState.coins >= item.cost && !gameState.inventory.includes(itemId)) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - item.cost,
        inventory: [...prev.inventory, itemId]
      }));
    }
  };

  const useHint = () => {
    if (!gameState.currentCase || removedChoiceId) return;
    const currentStage = gameState.currentCase.stages[gameState.currentStageIndex];
    const wrongChoices = currentStage.choices.filter(c => c.id !== currentStage.correctChoiceId);
    if (wrongChoices.length > 0) {
      const randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
      setRemovedChoiceId(randomWrong.id);
    }
  };

  if (!gameState.user && !gameState.loading) {
    return <AuthScreen onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
  }

  const currentRank = getRank(gameState.xp);
  const nextRank = getNextRank(currentRank.id);
  const xpProgress = nextRank 
    ? ((gameState.xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100 
    : 100;

  if (error && !gameState.currentCase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-kawaii-surface p-6 text-center animate-pop-in">
        <div className="text-8xl mb-6">😿</div>
        <h2 className="text-3xl font-bold text-kawaii-dark mb-4">Connection Hiccup!</h2>
        <p className="text-base text-kawaii-dark/60 mb-8 max-w-xs">{error}</p>
        <Button onClick={() => loadNewCase(gameState.xp)} variant="primary">Try Again</Button>
      </div>
    );
  }

  if (gameState.loading && !gameState.currentCase && gameState.view === 'clinic') {
    return <LoadingScreen user={gameState.user} onCoinCollected={handleMiniGameCoin} />;
  }

  const { currentCase } = gameState;
  const hasStethoscope = gameState.inventory.includes('equip_stethoscope');
  const currentStage = currentCase?.stages[gameState.currentStageIndex];

  return (
    <div className="min-h-screen bg-kawaii-surface font-sans text-kawaii-dark pb-20">
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #FFD1DC;
          border-radius: 10px;
        }
      `}</style>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md animate-pop-in">
            <AuthScreen 
              onLogin={handleLogin} 
              isModal={true} 
              onClose={() => setShowLoginModal(false)} 
            />
          </div>
        </div>
      )}

      {/* Header - Nintendo Switch Style */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b-4 border-kawaii-pink px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-pink-500 flex items-center gap-2 drop-shadow-sm">
              <span className="text-2xl">🏥</span> 
              <span className="truncate max-w-[150px] sm:max-w-none">{gameState.user?.username}'s Clinic</span>
            </h1>
            
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 bg-yellow-50 px-4 py-1.5 rounded-2xl text-yellow-700 border-2 border-yellow-200 font-black shadow-sm">
                 <CoinIcon /> <span className="tabular-nums">{gameState.coins}</span>
               </div>
               <button 
                  onClick={() => setGameState(prev => ({...prev, view: prev.view === 'shop' ? 'clinic' : 'shop'}))}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl font-black border-2 transition-all active:scale-95 shadow-sm ${gameState.view === 'shop' ? 'bg-kawaii-pink text-pink-900 border-pink-300' : 'bg-kawaii-blue text-blue-900 border-blue-300'}`}
               >
                 <ShopIcon /> <span className="hidden sm:inline">{gameState.view === 'shop' ? 'Back' : 'Shop'}</span>
               </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t-2 border-gray-100 pt-2">
            <div className="flex items-center gap-2 flex-grow max-w-[80%]">
              <div className="flex items-center gap-2 bg-purple-50 border-2 border-purple-100 px-3 py-1 rounded-xl">
                <span className="text-xl">{currentRank.icon}</span>
                <span className="text-[11px] font-black text-purple-700 uppercase tracking-wider">{currentRank.title}</span>
              </div>
              <div className="hidden md:block flex-grow h-2.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px] shadow-inner">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500" style={{ width: `${Math.min(100, xpProgress)}%` }}></div>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
               {gameState.user?.isGuest ? (
                 <button 
                    onClick={() => setShowLoginModal(true)}
                    className="text-[10px] font-black bg-green-50 px-3 py-1 rounded-xl text-green-700 border-2 border-green-200 hover:bg-green-100 transition-all animate-pulse"
                 >
                   💾 SAVE DATA
                 </button>
               ) : (
                 <button 
                    onClick={handleLogout}
                    className="text-[10px] font-black bg-red-50 px-3 py-1 rounded-xl text-red-700 border-2 border-red-200 hover:bg-red-100 transition-all"
                 >
                   SIGN OUT
                 </button>
               )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 flex flex-col gap-6">
        
        {/* SHOP VIEW */}
        {gameState.view === 'shop' && (
           <div className="animate-pop-in pb-12">
             <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_12px_0_0_rgba(255,209,220,1)] border-4 border-kawaii-pink mb-10">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black text-kawaii-dark mb-2">🛍️ Clinic Supplies</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">Equip your clinic for success!</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {SHOP_ITEMS.map(item => {
                    const isOwned = gameState.inventory.includes(item.id);
                    const canAfford = gameState.coins >= item.cost;
                    
                    return (
                      <div key={item.id} className={`group relative border-4 rounded-[2rem] p-6 flex flex-col justify-between transition-all hover:-translate-y-1 ${isOwned ? 'bg-gray-50 border-gray-200' : 'bg-white border-kawaii-blue shadow-[0_6px_0_0_rgba(193,225,255,1)] hover:shadow-[0_10px_0_0_rgba(193,225,255,1)]'}`}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-black text-lg leading-tight text-kawaii-dark">{item.name}</h3>
                            <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-500 px-2 py-1 rounded-lg shrink-0 ml-2">{item.type}</span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">{item.description}</p>
                        </div>
                        
                        <div className="mt-auto">
                          {isOwned ? (
                             <div className="w-full py-2 bg-gray-200 text-gray-400 text-xs rounded-2xl font-black text-center uppercase tracking-widest">
                               In Inventory
                             </div>
                          ) : (
                            <Button 
                              onClick={() => buyItem(item.id)} 
                              variant={canAfford ? 'primary' : 'white'}
                              className="w-full text-sm py-2"
                              disabled={!canAfford}
                            >
                              {item.cost} 🪙
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
           </div>
        )}

        {/* GAME VIEW */}
        {gameState.view === 'clinic' && currentCase && currentStage && (
          <div className="flex flex-col gap-6 animate-pop-in">
            
            {/* Success/Fail Overlays */}
            {(gameState.gameStatus === 'stage_success' || gameState.gameStatus === 'case_success' || gameState.gameStatus === 'failure' || gameState.showExplanation) && (
              <div className="fixed inset-0 z-[90] flex items-center justify-center bg-kawaii-surface/80 backdrop-blur-md px-4">
                
                {!gameState.showExplanation ? (
                  <div className={`
                    transform transition-all duration-500 scale-100
                    ${gameState.isCorrect ? 'bg-white border-kawaii-green shadow-[0_16px_0_0_rgba(200,230,201,1)]' : 'bg-white border-red-200 shadow-[0_16px_0_0_rgba(254,226,226,1)]'}
                    border-8 p-10 rounded-[3rem] max-w-sm w-full text-center relative
                  `}>
                    
                    {gameState.justLeveledUp && (
                       <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-2.5 rounded-full font-black shadow-2xl whitespace-nowrap animate-bounce z-10 border-4 border-white text-sm uppercase tracking-widest">
                         🌟 {gameState.justLeveledUp.title} 🌟
                       </div>
                    )}

                    <div className="text-7xl mb-6">
                      {gameState.isCorrect ? '✨' : '🩹'}
                    </div>
                    <h2 className="text-3xl font-black mb-3 text-kawaii-dark">
                      {gameState.isCorrect ? 'Wonderful!' : 'Oh Dear...'}
                    </h2>
                    <p className="text-base text-gray-500 font-bold mb-8 leading-relaxed px-2">{gameState.feedbackMessage}</p>
                    
                    <div className="flex flex-col gap-3">
                       {gameState.gameStatus === 'stage_success' ? (
                          <Button onClick={handleNextStage} variant="success" className="w-full py-4 text-xl">
                             NEXT STEP ➡️
                          </Button>
                       ) : (
                          <>
                            {gameState.gameStatus === 'case_success' && (
                               <div className="mb-4 inline-block bg-yellow-100 text-yellow-700 px-6 py-2 rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm">
                                 CASE COMPLETE! +100 XP
                               </div>
                            )}
                            <Button onClick={handleLearnMore} variant="secondary" className="text-sm py-3">
                              <BookIcon /> LEARN THE SCIENCE
                            </Button>
                            
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-6 w-full shadow-inner">
                              <div 
                                 className="h-full bg-kawaii-pink"
                                 style={{ 
                                   width: '0%', 
                                   animation: 'progress 5s linear forwards' 
                                 }}
                              ></div>
                            </div>
                            <p className="text-[10px] text-gray-300 font-black mt-2 uppercase tracking-widest">Next patient in 5 seconds...</p>
                          </>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-8 border-kawaii-blue p-8 rounded-[3rem] shadow-[0_16px_0_0_rgba(193,225,255,1)] max-w-lg w-full max-h-[85vh] flex flex-col animate-pop-in">
                    <div className="flex items-center gap-5 mb-6 border-b-4 border-kawaii-blue/20 pb-6 shrink-0">
                      <div className="text-5xl">🎓</div>
                      <div className="min-w-0">
                        <h2 className="text-2xl font-black text-kawaii-dark truncate">{gameState.currentCase?.diagnosis}</h2>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em]">Clinical Report</p>
                      </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-4 custom-scrollbar text-left">
                      <div className="mb-8">
                        <h3 className="font-black text-kawaii-dark mb-3 text-lg flex items-center gap-2">
                           <span className="w-2 h-6 bg-kawaii-pink rounded-full"></span> Scientific Background
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm font-medium">
                          {gameState.currentCase?.medicalExplanation}
                        </p>
                      </div>

                      <div className="bg-kawaii-blue/10 rounded-3xl p-6 mb-4 border-2 border-kawaii-blue/20">
                         <h3 className="font-black text-blue-700 mb-4 text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                           <ExternalLinkIcon /> External Resources
                         </h3>
                         <ul className="space-y-3">
                           {gameState.currentCase?.trustedSources.map((source, idx) => (
                             <li key={idx}>
                               <a 
                                 href={source.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="bg-white px-4 py-3 rounded-2xl text-blue-600 hover:text-blue-800 transition-all flex items-center justify-between gap-3 text-sm font-bold border-2 border-transparent hover:border-blue-200 shadow-sm"
                               >
                                 <span className="truncate">{source.title}</span>
                                 <span className="text-lg">🔗</span>
                               </a>
                             </li>
                           ))}
                         </ul>
                      </div>
                    </div>

                    <div className="pt-6 shrink-0">
                      <Button onClick={handleManualNext} variant="primary" className="w-full text-xl py-4">
                        NEXT PATIENT ➡️
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Patient Card */}
            <div className="bg-white rounded-[3rem] p-8 shadow-[0_12px_0_0_rgba(255,209,220,1)] border-4 border-kawaii-pink relative overflow-hidden transition-all">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-kawaii-yellow/30 rounded-full blur-[60px]"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-kawaii-blue/30 rounded-full blur-[60px]"></div>
              
              <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start relative z-10">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-8 border-white overflow-hidden bg-gradient-to-br from-blue-50 to-white shadow-xl">
                      <img 
                        src={currentCase.imageUrl || `https://api.dicebear.com/9.x/adventurer/svg?seed=${currentCase.avatarSeed}`} 
                        alt={currentCase.name} 
                        className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="text-center mt-4">
                      <h2 className="text-2xl font-black text-kawaii-dark leading-tight">{currentCase.name}</h2>
                      <div className="flex flex-col gap-1.5 items-center mt-2">
                         <p className="text-xs text-gray-400 font-black uppercase tracking-widest bg-gray-50 rounded-xl px-3 py-1 border border-gray-100">
                           {currentCase.age} Years Old
                         </p>
                         {currentCase.difficulty === 'advanced' && (
                           <p className="text-[10px] font-black text-white bg-purple-500 rounded-lg px-2 py-0.5 shadow-sm uppercase tracking-tighter">
                             ADVANCED CASE
                           </p>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow w-full">
                    {currentCase.difficulty === 'advanced' && (
                      <div className="flex items-center gap-2 mb-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                        {currentCase.stages.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`h-2.5 rounded-full transition-all duration-500 ${idx === gameState.currentStageIndex ? 'flex-grow bg-kawaii-blue shadow-sm' : idx < gameState.currentStageIndex ? 'w-2.5 bg-kawaii-green' : 'w-2.5 bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="bg-kawaii-blue/10 rounded-[2rem] rounded-tl-none p-6 relative border-4 border-kawaii-blue shadow-inner min-h-[120px] flex items-center">
                      <div className="absolute -top-4 -left-4 text-4xl opacity-20">💬</div>
                      <p className="text-lg md:text-xl leading-relaxed italic w-full text-kawaii-dark font-bold text-center sm:text-left">
                        "{currentStage.dialogue}"
                      </p>
                    </div>
                    
                    {/* Vitals Grid */}
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="bg-pink-50/50 p-3 rounded-2xl border-2 border-kawaii-pink flex flex-col items-center gap-1 shadow-sm">
                        <span className="text-[9px] text-pink-500 font-black uppercase tracking-widest">Temperature</span>
                        <span className="text-sm md:text-base font-black text-pink-700 tabular-nums">{currentCase.vitals.temp}</span>
                      </div>
                      <div className="bg-blue-50/50 p-3 rounded-2xl border-2 border-kawaii-blue flex flex-col items-center gap-1 shadow-sm">
                        <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Heart Rate</span>
                        <span className="text-sm md:text-base font-black text-blue-700 tabular-nums">{currentCase.vitals.hr}</span>
                      </div>
                      <div className="bg-purple-50/50 p-3 rounded-2xl border-2 border-kawaii-lavender flex flex-col items-center gap-1 shadow-sm">
                        <span className="text-[9px] text-purple-500 font-black uppercase tracking-widest">Pressure</span>
                        <span className="text-sm md:text-base font-black text-purple-700 tabular-nums">{currentCase.vitals.bp}</span>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Medical Chart Section */}
            <div className="bg-white rounded-[3rem] p-8 shadow-[0_12px_0_0_rgba(225,225,225,1)] border-4 border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-lg">📋</span> CLINICAL NOTES
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Symptoms List */}
                <div className="space-y-3">
                  {currentCase.symptoms.map((symptom, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-sm font-bold bg-kawaii-surface p-4 rounded-2xl border-2 border-white shadow-sm hover:scale-[1.02] transition-transform">
                      <span className="w-3 h-3 rounded-full bg-kawaii-pink shadow-inner"></span>
                      <span>{symptom}</span>
                    </div>
                  ))}
                </div>

                {/* Clinical Visuals - Polaroid Style */}
                {currentCase.medicalImages && currentCase.medicalImages.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {currentCase.medicalImages.map((img, idx) => (
                      <div key={idx} className="relative group mx-auto">
                        <div className="bg-white p-3 pb-8 rounded-sm shadow-xl border border-gray-100 rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500 max-w-[240px]">
                          <div className="aspect-square bg-gray-50 rounded-sm overflow-hidden border-2 border-gray-100 mb-4">
                            <img src={img.url} alt={img.caption} className="w-full h-full object-cover grayscale-[0.2] contrast-125" />
                          </div>
                          <p className="text-[10px] text-center font-black text-gray-400 italic leading-tight uppercase tracking-widest">
                            Fig.{idx + 1} // Clinical Finding
                          </p>
                        </div>
                        {/* Tape effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/40 backdrop-blur-sm border border-white/50 rotate-2 z-10 shadow-sm"></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Area */}
            <div className="flex flex-col gap-4 pb-12">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {gameState.currentStageIndex > 0 ? "Next Clinical Action" : "Initial Diagnosis / Treatment"}
                </h3>
                {hasStethoscope && !removedChoiceId && gameState.gameStatus === 'playing' && (
                  <button 
                    onClick={useHint}
                    className="text-[10px] font-black bg-yellow-400 text-yellow-900 px-4 py-1.5 rounded-full hover:bg-yellow-300 transition-all active:scale-90 border-b-4 border-yellow-600 shadow-sm uppercase tracking-wider"
                  >
                    🩺 STETHOSCOPE HINT
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                {currentStage.choices.map((choice) => {
                  const isRemoved = choice.id === removedChoiceId;
                  return (
                    <Button 
                      key={choice.id}
                      onClick={() => handleChoice(choice.id)}
                      disabled={gameState.gameStatus !== 'playing' || isRemoved}
                      variant={isRemoved ? 'white' : 'primary'}
                      className={`
                        text-base md:text-lg py-4 px-6 text-left font-black justify-start
                        ${isRemoved ? 'opacity-20 pointer-events-none' : ''}
                      `}
                    >
                      <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mr-2 text-xs">✨</span>
                      {choice.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;