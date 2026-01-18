import { db } from "./database";
import { User } from "../types";

const SESSION_KEY = 'kawaii_clinic_session_v1';

export const authService = {
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = db.getUserByUsername(username);

    if (!user) {
      return { success: false, error: "Doctor not found! Check your ID badge (username)." };
    }

    if (user.password !== password) {
      return { success: false, error: "Incorrect password! Try again." };
    }

    // Update last login
    user.lastLogin = Date.now();
    db.saveUser(user);
    
    // Set session
    localStorage.setItem(SESSION_KEY, user.id);

    return { success: true, user };
  },

  signup: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username.length < 3) {
      return { success: false, error: "Username too short!" };
    }

    if (db.getUserByUsername(username)) {
      return { success: false, error: "That doctor already works here!" };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      password,
      isAi: false,
      isGuest: false,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      profile: {
        coins: 100,
        xp: 0,
        score: 0,
        inventory: []
      }
    };

    db.saveUser(newUser);
    localStorage.setItem(SESSION_KEY, newUser.id);

    return { success: true, user: newUser };
  },

  createGuestUser: (): User => {
    return {
      id: `guest_${crypto.randomUUID()}`,
      username: 'Guest Doctor',
      isAi: false,
      isGuest: true,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      profile: {
        coins: 100,
        xp: 0,
        score: 0,
        inventory: []
      }
    };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    return db.getUserById(userId) || null;
  }
};