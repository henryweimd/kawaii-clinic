export interface Rank {
  id: number;
  title: string;
  minXp: number;
  icon: string;
}

export const RANKS: Rank[] = [
  { id: 1, title: "Pre-Med Wannabe", minXp: 0, icon: "🥚" },
  { id: 2, title: "Med Student (Lost)", minXp: 100, icon: "📚" }, // 1 Case
  { id: 3, title: "Intern (Sleepy)", minXp: 300, icon: "☕" }, // 3 Cases
  { id: 4, title: "Junior Resident", minXp: 600, icon: "🏃" }, // 6 Cases
  { id: 5, title: "Senior Resident", minXp: 1000, icon: "📋" }, // 10 Cases
  { id: 6, title: "Chief Resident", minXp: 1500, icon: "😼" }, // 15 Cases
  { id: 7, title: "Fellow", minXp: 2200, icon: "🧐" }, // 22 Cases
  { id: 8, title: "Attending", minXp: 3000, icon: "⛳" }, // 30 Cases
  { id: 9, title: "Dept. Chair", minXp: 4000, icon: "👑" }, // 40 Cases
  { id: 10, title: "Surgeon General of Cute", minXp: 5500, icon: "💖" }, // 55 Cases
];

export const getRank = (xp: number): Rank => {
  // Find the highest rank where xp >= minXp
  const rank = RANKS.slice().reverse().find(r => xp >= r.minXp);
  return rank || RANKS[0];
};

export const getNextRank = (currentRankId: number): Rank | undefined => {
  return RANKS.find(r => r.id === currentRankId + 1);
};