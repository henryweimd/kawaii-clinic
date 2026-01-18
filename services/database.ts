import { PatientCase, CaseStats, User } from "../types";

const KEYS = {
  CASES: 'kawaii_clinic_cases_v1',
  SEEN: 'kawaii_clinic_seen_v1', // This should technically be per-user, but keeping global for now for simplicity
  STATS: 'kawaii_clinic_stats_v1',
  USERS: 'kawaii_clinic_users_v1', // New key for user dictionary
};

// Simulate a backend database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class DatabaseService {
  private getStoredItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  }

  private setStoredItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to storage (likely quota exceeded)`, e);
    }
  }

  constructor() {
    this.seedAiUsers();
  }

  // --- User Management ---

  private seedAiUsers() {
    const users = this.getStoredItem<Record<string, User>>(KEYS.USERS, {});
    if (!users['dr_cat']) {
      // Seed AI users if they don't exist
      const aiUsers: User[] = [
        {
          id: 'dr_cat', username: 'Dr. Meow', isAi: true, createdAt: Date.now(), lastLogin: Date.now(),
          profile: { coins: 9999, xp: 5000, score: 5000, inventory: ['staff_nurse_cat'] }
        },
        {
          id: 'dr_bun', username: 'Nurse Bun', isAi: true, createdAt: Date.now(), lastLogin: Date.now(),
          profile: { coins: 450, xp: 1200, score: 1200, inventory: [] }
        }
      ];
      
      aiUsers.forEach(u => users[u.id] = u);
      this.setStoredItem(KEYS.USERS, users);
    }
  }

  getAllUsers(): Record<string, User> {
    return this.getStoredItem<Record<string, User>>(KEYS.USERS, {});
  }

  getUserById(id: string): User | undefined {
    const users = this.getAllUsers();
    return users[id];
  }

  getUserByUsername(username: string): User | undefined {
    const users = this.getAllUsers();
    return Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  saveUser(user: User): void {
    const users = this.getAllUsers();
    users[user.id] = user;
    this.setStoredItem(KEYS.USERS, users);
  }

  // --- Cases ---

  async saveCase(patientCase: PatientCase): Promise<void> {
    await delay(50); // Simulate network
    
    try {
      const cases = this.getStoredItem<PatientCase[]>(KEYS.CASES, []);
      // Avoid duplicates
      if (!cases.find(c => c.id === patientCase.id)) {
        // IMPORTANT: Strip the base64 imageUrl to prevent LocalStorage quota exceeded errors.
        // The app handles missing imageUrl by falling back to the avatarSeed (DiceBear).
        const { imageUrl, ...caseData } = patientCase;
        cases.push(caseData as PatientCase);
        
        // LIMIT HISTORY to 50 items to prevent Quota Exceeded
        if (cases.length > 50) {
           cases.shift(); // Remove oldest
        }
        
        this.setStoredItem(KEYS.CASES, cases);
      }
    } catch (error) {
      console.error("Database save error:", error);
      // Suppress error so game continues even if save fails
    }
  }

  async getAllCases(): Promise<PatientCase[]> {
    return this.getStoredItem<PatientCase[]>(KEYS.CASES, []);
  }

  async getCaseById(id: string): Promise<PatientCase | undefined> {
    const cases = await this.getAllCases();
    return cases.find(c => c.id === id);
  }

  // --- Seen History ---

  async markCaseAsSeen(caseId: string): Promise<void> {
    const seen = this.getStoredItem<string[]>(KEYS.SEEN, []);
    if (!seen.includes(caseId)) {
      seen.push(caseId);
      this.setStoredItem(KEYS.SEEN, seen);
    }
  }

  async getUnseenCases(): Promise<PatientCase[]> {
    const allCases = await this.getAllCases();
    const seenIds = this.getStoredItem<string[]>(KEYS.SEEN, []);
    return allCases.filter(c => !seenIds.includes(c.id));
  }
  
  // New method to check specific IDs (useful for checking against permanent file)
  async isCaseSeen(caseId: string): Promise<boolean> {
     const seenIds = this.getStoredItem<string[]>(KEYS.SEEN, []);
     return seenIds.includes(caseId);
  }

  // --- Statistics (Global Difficulty) ---

  async updateCaseStats(caseId: string, isCorrect: boolean): Promise<void> {
    const allStats = this.getStoredItem<Record<string, CaseStats>>(KEYS.STATS, {});
    
    if (!allStats[caseId]) {
      allStats[caseId] = {
        caseId,
        attempts: 0,
        correctCount: 0,
        difficultyRating: 0
      };
    }

    const stat = allStats[caseId];
    stat.attempts += 1;
    if (isCorrect) stat.correctCount += 1;
    stat.difficultyRating = stat.correctCount / stat.attempts;

    allStats[caseId] = stat;
    this.setStoredItem(KEYS.STATS, allStats);
  }

  async getCaseStats(caseId: string): Promise<CaseStats | undefined> {
    const allStats = this.getStoredItem<Record<string, CaseStats>>(KEYS.STATS, {});
    return allStats[caseId];
  }
}

export const db = new DatabaseService();