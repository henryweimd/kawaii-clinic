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
      // Start game logic
      loadNewCase(currentUser.profile.xp);
    } else {
      setGameState(prev => ({ ...prev, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Persist User Profile Changes
  useEffect(() => {
    if (gameState.user && !gameState.user.isGuest) {
      const updatedUser = {
        ...gameState.user,
        profile: {
          coins: gameState.coins,
          xp: gameState.xp,
          score: gameState.score,
          inventory: gameState.inventory
        }
      };
      db.saveUser(updatedUser);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-kawaii-surface p-6 text-center">
        <div className="text-6xl mb-4">😿</div>
        <h2 className="text-2xl font-bold text-kawaii-dark mb-2">Connection Hiccup!</h2>
        <p className="text-sm text-kawaii-dark/60 mb-6">{error}</p>
        <Button onClick={() => loadNewCase(gameState.xp)}>Try Again</Button>
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
    <div className="min-h-screen bg-kawaii-surface font-sans text-kawaii-dark pb-10">
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md">
            <AuthScreen 
              onLogin={handleLogin} 
              isModal={true} 
              onClose={() => setShowLoginModal(false)} 
            />
          </div>
        </div>
      )}

      {/* Header - Compact for Mobile */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b-4 border-kawaii-pink px-3 py-2 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Top Row: Brand & Profile */}
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg md:text-xl font-bold text-pink-500 flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="hidden xs:inline">🏥</span> 
              <span className="truncate">{gameState.user?.username}'s Clinic</span>
            </h1>
            
            <div className="flex items-center gap-2 text-xs font-bold">
               <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full text-yellow-800 border border-yellow-200">
                 <CoinIcon /> {gameState.coins}
               </div>
               <button 
                  onClick={() => setGameState(prev => ({...prev, view: prev.view === 'shop' ? 'clinic' : 'shop'}))}
                  className="flex items-center gap-1 bg-kawaii-blue px-2 py-1 rounded-full text-blue-900 border border-blue-300 hover:bg-blue-300 transition-colors"
               >
                 <ShopIcon /> <span className="hidden sm:inline">{gameState.view === 'shop' ? 'Back' : 'Shop'}</span>
               </button>
            </div>
          </div>

          {/* Bottom Row: Rank & Auth (Desktop and Large Mobile) */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5 mt-0.5">
            <div className="flex items-center gap-2 group cursor-help flex-grow max-w-[70%]">
              <div className="flex items-center gap-1.5 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full overflow-hidden">
                <span className="text-sm">{currentRank.icon}</span>
                <span className="text-[10px] font-bold text-purple-900 truncate uppercase">{currentRank.title}</span>
              </div>
              <div className="hidden sm:block flex-grow h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                <div className="h-full bg-purple-400" style={{ width: `${Math.min(100, xpProgress)}%` }}></div>
              </div>
            </div>

            <div className="flex gap-2">
               {gameState.user?.isGuest ? (
                 <button 
                    onClick={() => setShowLoginModal(true)}
                    className="text-[10px] font-bold bg-green-100 px-2 py-1 rounded-full text-green-900 border border-green-200 hover:bg-green-200 transition-colors animate-pulse"
                 >
                   💾 Login
                 </button>
               ) : (
                 <button 
                    onClick={handleLogout}
                    className="text-[10px] font-bold bg-red-100 px-2 py-1 rounded-full text-red-900 border border-red-200 hover:bg-red-200 transition-colors"
                 >
                   Sign Out
                 </button>
               )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 mt-4 flex flex-col gap-4">
        
        {/* SHOP VIEW */}
        {gameState.view === 'shop' && (
           <div className="animate-fade-in pb-10">
             <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-kawaii-pink mb-6">
                <h2 className="text-xl font-bold text-center mb-1">🛍️ Clinic Supplies</h2>
                <p className="text-center text-xs text-gray-500 mb-6">Upgrade your clinic with cute & useful items!</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHOP_ITEMS.map(item => {
                    const isOwned = gameState.inventory.includes(item.id);
                    const canAfford = gameState.coins >= item.cost;
                    
                    return (
                      <div key={item.id} className={`border-2 rounded-2xl p-4 flex flex-col justify-between ${isOwned ? 'bg-gray-50 border-gray-200' : 'bg-white border-kawaii-blue'}`}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded shrink-0 ml-1">{item.type}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mb-4">{item.description}</p>
                        </div>
                        
                        <div className="mt-auto">
                          {isOwned ? (
                             <button disabled className="w-full py-1.5 bg-gray-200 text-gray-400 text-sm rounded-xl font-bold cursor-default">
                               Owned
                             </button>
                          ) : (
                            <Button 
                              onClick={() => buyItem(item.id)} 
                              variant={canAfford ? 'primary' : 'secondary'}
                              className="w-full text-xs py-1.5"
                              disabled={!canAfford}
                            >
                              Buy for {item.cost} 🪙
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
          <div className="flex flex-col gap-4">
            
            {/* Feedback & Learn More Overlay - Responsive Positioning */}
            {(gameState.gameStatus === 'stage_success' || gameState.gameStatus === 'case_success' || gameState.gameStatus === 'failure' || gameState.showExplanation) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                
                {!gameState.showExplanation ? (
                  <div className={`
                    transform transition-all duration-500 scale-100
                    ${gameState.isCorrect ? 'bg-kawaii-green border-green-400' : 'bg-red-100 border-red-300'}
                    border-4 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative
                  `}>
                    
                    {gameState.justLeveledUp && (
                       <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-5 py-1.5 rounded-full font-bold shadow-lg whitespace-nowrap animate-bounce z-10 border-2 border-white text-xs">
                         🌟 PROMOTED: {gameState.justLeveledUp.title}! 🌟
                       </div>
                    )}

                    <div className="text-5xl md:text-6xl mb-3">
                      {gameState.isCorrect ? '🎉' : '🩹'}
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-1">
                      {gameState.isCorrect ? 'Great Job!' : 'Oopsie!'}
                    </h2>
                    <p className="text-base opacity-90 mb-4 leading-tight">{gameState.feedbackMessage}</p>
                    
                    <div className="flex flex-col gap-2">
                       {gameState.gameStatus === 'stage_success' ? (
                          <Button onClick={handleNextStage} className="w-full animate-bounce text-sm py-2.5">
                             Continue Case ➡️
                          </Button>
                       ) : (
                          <>
                            {gameState.gameStatus === 'case_success' && (
                               <div className="mb-2 inline-block bg-white/50 px-3 py-1 rounded-xl font-bold text-xs">
                                 Case Complete! +100 XP
                               </div>
                            )}
                            <Button onClick={handleLearnMore} variant="secondary" className="text-xs py-2 flex items-center justify-center gap-2">
                              <BookIcon /> {gameState.gameStatus === 'failure' ? 'See Correct Diagnosis' : 'Learn More'}
                            </Button>
                            
                            <div className="h-1 bg-black/10 rounded-full overflow-hidden mt-2 w-full">
                              <div 
                                 className="h-full bg-black/20"
                                 style={{ 
                                   width: '0%', 
                                   animation: 'progress 5s linear forwards' 
                                 }}
                              ></div>
                            </div>
                          </>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-4 border-kawaii-blue p-5 md:p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
                    <div className="flex items-center gap-3 mb-4 border-b-2 border-gray-100 pb-3 shrink-0">
                      <div className="text-3xl md:text-4xl">🎓</div>
                      <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">Medical File: {gameState.currentCase?.diagnosis}</h2>
                        <p className="text-[10px] md:text-sm text-gray-500">Educational Resources</p>
                      </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                      <div className="prose prose-sm prose-pink mb-5 text-left">
                        <h3 className="font-bold text-gray-700 mb-1.5 text-sm md:text-base">Scientific Background</h3>
                        <p className="text-gray-600 leading-relaxed text-xs md:text-sm">
                          {gameState.currentCase?.medicalExplanation}
                        </p>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-3 mb-5 text-left">
                         <h3 className="font-bold text-blue-800 mb-2 text-[10px] md:text-xs uppercase tracking-wide flex items-center gap-2">
                           <ExternalLinkIcon /> Trusted Sources
                         </h3>
                         <ul className="space-y-1.5">
                           {gameState.currentCase?.trustedSources.map((source, idx) => (
                             <li key={idx}>
                               <a 
                                 href={source.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-xs font-medium"
                               >
                                 <span>🔗</span> {source.title}
                               </a>
                             </li>
                           ))}
                         </ul>
                      </div>
                    </div>

                    <div className="pt-3 shrink-0">
                      <Button onClick={handleManualNext} className="w-full text-sm py-2.5">
                        Next Patient ➡️
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Patient Header Card - Stacks on Mobile */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-kawaii-pink relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-3 -mr-3 w-20 h-20 bg-kawaii-yellow rounded-full opacity-40 blur-xl"></div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start relative z-10">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-kawaii-blue overflow-hidden bg-blue-50 shadow-inner">
                      <img 
                        src={currentCase.imageUrl || `https://api.dicebear.com/9.x/adventurer/svg?seed=${currentCase.avatarSeed}`} 
                        alt={currentCase.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center mt-2">
                      <h2 className="text-lg font-bold leading-tight">{currentCase.name}</h2>
                      <div className="flex flex-col gap-0.5 items-center">
                         <p className="text-[10px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 inline-block font-bold">
                           Age: {currentCase.age}
                         </p>
                         {currentCase.difficulty === 'advanced' && (
                           <p className="text-[9px] font-black text-white bg-purple-500 rounded-full px-1.5 py-0.5 inline-block mt-0.5 tracking-tighter">
                             ADVANCED
                           </p>
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow w-full">
                    {currentCase.difficulty === 'advanced' && (
                      <div className="flex items-center gap-1 mb-2">
                        {currentCase.stages.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all ${idx === gameState.currentStageIndex ? 'w-6 bg-blue-500' : idx < gameState.currentStageIndex ? 'w-1.5 bg-green-400' : 'w-1.5 bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="bg-kawaii-blue/20 rounded-2xl rounded-tl-none p-4 relative border-2 border-kawaii-blue min-h-[80px] flex items-center">
                      <p className="text-base leading-snug italic w-full text-kawaii-dark font-medium">
                        "{currentStage.dialogue}"
                      </p>
                    </div>
                    
                    {/* Compact Vitals for Mobile */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-pink-50 py-1.5 px-1 rounded-xl border border-pink-100">
                        <div className="text-[8px] text-pink-400 uppercase font-bold">Temp</div>
                        <div className="text-[10px] md:text-xs font-mono font-bold text-pink-700">{currentCase.vitals.temp}</div>
                      </div>
                      <div className="bg-blue-50 py-1.5 px-1 rounded-xl border border-blue-100">
                        <div className="text-[8px] text-blue-400 uppercase font-bold">HR</div>
                        <div className="text-[10px] md:text-xs font-mono font-bold text-blue-700">{currentCase.vitals.hr}</div>
                      </div>
                      <div className="bg-purple-50 py-1.5 px-1 rounded-xl border border-purple-100">
                        <div className="text-[8px] text-purple-400 uppercase font-bold">BP</div>
                        <div className="text-[10px] md:text-xs font-mono font-bold text-purple-700">{currentCase.vitals.bp}</div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Medical Chart & Findings */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>📋</span> Medical Chart
              </h3>
              
              <div className="space-y-4">
                <ul className="space-y-1.5">
                  {currentCase.symptoms.map((symptom, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-kawaii-pink shrink-0"></span>
                      <span className="leading-tight font-medium">{symptom}</span>
                    </li>
                  ))}
                </ul>

                {currentCase.medicalImages && currentCase.medicalImages.length > 0 && (
                  <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
                    <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-3">Clinical Visuals</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {currentCase.medicalImages.map((img, idx) => (
                        <div key={idx} className="group relative">
                          <div className="bg-white p-2 rounded-lg border-2 border-gray-100 shadow-sm rotate-[-1deg] hover:rotate-0 transition-transform duration-300 mx-auto max-w-[280px]">
                            <div className="aspect-square bg-gray-50 rounded-md overflow-hidden border-2 border-gray-100">
                              <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[9px] text-center mt-2 font-bold text-gray-400 italic leading-tight">
                              {img.caption}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Area */}
            <div className="flex flex-col gap-3 pb-8">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {gameState.currentStageIndex > 0 ? "Next Diagnostic Step" : "Choose Treatment/Diagnosis"}
                </h3>
                {hasStethoscope && !removedChoiceId && gameState.gameStatus === 'playing' && (
                  <button 
                    onClick={useHint}
                    className="text-[9px] font-bold bg-kawaii-yellow text-yellow-800 px-2 py-0.5 rounded-full hover:bg-yellow-300 transition-colors animate-pulse border border-yellow-200"
                  >
                    Stethoscope Hint 🩺
                  </button>
                )}
              </div>
              
              <div className="flex flex-col gap-2.5">
                {currentStage.choices.map((choice) => {
                  const isRemoved = choice.id === removedChoiceId;
                  return (
                    <Button 
                      key={choice.id}
                      onClick={() => handleChoice(choice.id)}
                      disabled={gameState.gameStatus !== 'playing' || isRemoved}
                      className={`
                        text-sm md:text-base py-3 px-4 text-left leading-tight
                        ${gameState.gameStatus !== 'playing' ? 'opacity-50' : ''}
                        ${isRemoved ? 'opacity-30 grayscale' : ''}
                      `}
                    >
                      {isRemoved ? <span className="line-through opacity-50">{choice.label}</span> : choice.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;