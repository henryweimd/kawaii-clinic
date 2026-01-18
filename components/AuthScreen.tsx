import React, { useState } from 'react';
import { Button } from './Button';
import { authService } from '../services/auth';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onGuestLogin?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onGuestLogin, onClose, isModal = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = isLogin 
        ? await authService.login(username, password)
        : await authService.signup(username, password);

      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || "Something went wrong!");
      }
    } catch (e) {
      setError("Connection error to clinic database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isModal ? '' : 'min-h-screen'} flex items-center justify-center bg-kawaii-surface p-4 relative overflow-hidden h-full`}>
      {!isModal && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute top-10 left-10 text-4xl sm:text-6xl animate-bounce">💊</div>
          <div className="absolute bottom-20 right-10 text-4xl sm:text-6xl animate-pulse">🩺</div>
          <div className="absolute top-1/2 left-[10%] text-3xl sm:text-4xl">🦠</div>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border-4 border-kawaii-pink max-w-sm sm:max-w-md w-full relative z-10 transition-all">
        {isModal && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-5 text-3xl text-gray-300 hover:text-gray-500 leading-none"
          >
            &times;
          </button>
        )}

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏥</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-kawaii-dark">Kawaii Clinic</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            {isLogin ? "Welcome back, Doctor!" : "Join our medical staff!"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 ml-1">ID Badge Name</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-kawaii-blue focus:border-blue-400 focus:outline-none bg-blue-50/50 text-base"
              placeholder="Dr. Cutie"
              required
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 ml-1">Access Pin Code</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-kawaii-blue focus:border-blue-400 focus:outline-none bg-blue-50/50 text-base"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-2xl text-[11px] font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-2 py-3 text-base shadow-lg" 
            disabled={loading}
          >
            {loading ? 'Entering Clinic...' : (isLogin ? 'Start Shift ➡️' : 'Create Badge ✨')}
          </Button>
        </form>

        {!isModal && onGuestLogin && (
          <div className="mt-5">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] font-black uppercase tracking-widest">Or</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
            <button 
              onClick={onGuestLogin}
              className="w-full py-2.5 rounded-2xl font-bold text-sm border-2 border-dashed border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Play as Guest
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-xs text-kawaii-pink hover:text-pink-600 font-black transition-colors underline decoration-dotted decoration-2 underline-offset-4"
          >
            {isLogin ? "New here? Open an account" : "Already have a badge? Login"}
          </button>
        </div>
      </div>

      {!isModal && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-0 pointer-events-none px-4">
          <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/50 flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">
             <span className="text-sm">✨</span>
             <span>Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">Google Gemini 3</span></span>
          </div>
        </div>
      )}
    </div>
  );
};