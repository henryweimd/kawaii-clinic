export interface Choice {
  id: string;
  label: string;
  feedback: string;
}

export interface CaseStage {
  id: string;
  dialogue: string;
  choices: Choice[];
  correctChoiceId: string; // The ID of the correct choice for this stage
}

export interface MedicalImage {
  url: string;
  caption: string;
}

export interface PatientCase {
  id: string;
  difficulty: 'beginner' | 'advanced';
  stages: CaseStage[]; // Ordered list of stages. For simple cases, length is 1.
  
  // Common Fields
  name: string;
  age: number;
  occupation: string;
  avatarSeed: string; // Used to generate consistent random images
  imageUrl?: string; // Generated avatar image URL (base64)
  medicalImages?: MedicalImage[]; // Optional medical visual findings
  symptoms: string[];
  vitals: {
    temp: string;
    bp: string;
    hr: string;
  };
  
  diagnosis: string; // The correct medical diagnosis name
  medicalExplanation: string; // Detailed scientific background
  trustedSources: { title: string; url: string }[]; // Links to trusted websites
  stats?: CaseStats; // Optional stats attached when retrieving from DB
  isFallback?: boolean; // Flag to indicate if this is a fallback case (do not save to DB)
}

export interface CaseStats {
  caseId: string;
  attempts: number;
  correctCount: number;
  difficultyRating: number; // 0.0 to 1.0 (1.0 being everyone gets it right)
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'staff' | 'equipment' | 'cosmetic';
  effect?: 'remove_wrong' | 'double_coins' | 'passive_income' | 'none';
  value?: number; // Magnitude of the effect (e.g. amount of income)
}

export interface UserProfile {
  coins: number;
  xp: number;
  score: number;
  inventory: string[];
}

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for AI users or guests
  isAi: boolean;
  isGuest?: boolean;
  profile: UserProfile;
  createdAt: number;
  lastLogin: number;
}

export interface GameState {
  user: User | null; // Currently logged in user
  currentCase: PatientCase | null;
  currentStageIndex: number; // New: Tracks progress in multi-step cases
  
  // Stats are now derived from user.profile, but we keep local state for immediate UI updates
  streak: number; 
  loading: boolean;
  gameStatus: 'idle' | 'playing' | 'stage_success' | 'case_success' | 'failure'; // Updated statuses
  feedbackMessage: string | null;
  isCorrect: boolean | null;
  view: 'clinic' | 'shop';
  showExplanation: boolean;
  justLeveledUp?: { title: string; rankId: number };
  
  // Local state copies for UI reactivity
  coins: number;
  xp: number;
  score: number;
  inventory: string[];
}