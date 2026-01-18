import { generatePatientCase } from "./genai";
import { db } from "./database";
import { PatientCase } from "../types";
import { PERMANENT_CASES } from "../data/permanentCases";

export const caseManager = {
  /**
   * Orchestrates the logic:
   * 1. Check if there are unseen pre-saved cases (from DB).
   * 2. Check if there are unseen permanent cases (from file).
   * 3. Mix selection strategy.
   * 4. If nothing available, generate via Gemini.
   */
  async getNextCase(playerXp: number): Promise<PatientCase> {
    try {
      // 1. Get unseen dynamic cases from local DB
      const unseenDynamic = await db.getUnseenCases();
      
      // 2. Get unseen permanent cases from file
      const unseenPermanent: PatientCase[] = [];
      for (const pCase of PERMANENT_CASES) {
        if (!(await db.isCaseSeen(pCase.id))) {
           unseenPermanent.push(pCase);
        }
      }

      // Decision Logic
      const totalAvailable = unseenDynamic.length + unseenPermanent.length;
      
      // If we have plenty of content, 20% chance to generate fresh to keep it infinite
      // If we have no content, must generate.
      const shouldGenerateNew = totalAvailable === 0 || Math.random() > 0.8;

      let selectedCase: PatientCase;

      if (shouldGenerateNew) {
        console.log("Generating new case via Gemini...");
        selectedCase = await generatePatientCase(playerXp);
        
        // Save to master DB only if it's NOT a fallback case
        if (!selectedCase.isFallback) {
          await db.saveCase(selectedCase);
        }
      } else {
        console.log("Serving pre-saved/permanent case...");
        
        // Pick from pooled resources
        // If player is advanced (XP > 300), prioritize unseen permanent advanced cases if any exist
        let pool = unseenPermanent.length > 0 && (unseenDynamic.length === 0 || Math.random() > 0.4) 
           ? unseenPermanent 
           : unseenDynamic;

        // If pool was empty (edge case in logic), fallback to other
        if (pool.length === 0) pool = unseenPermanent.length > 0 ? unseenPermanent : unseenDynamic;

        if (pool.length > 0) {
           const randomIndex = Math.floor(Math.random() * pool.length);
           selectedCase = pool[randomIndex];
        } else {
           // Double fallback if somehow both empty (should be caught by shouldGenerateNew logic unless DB fails)
           selectedCase = await generatePatientCase(playerXp);
        }

        // Attach stats if available
        const stats = await db.getCaseStats(selectedCase.id);
        if (stats) {
          selectedCase.stats = stats;
        }
      }

      // Mark as seen for this user
      await db.markCaseAsSeen(selectedCase.id);
      
      return selectedCase;

    } catch (error) {
      console.error("Case Manager Error:", error);
      // Fallback: Return a permanent case even if seen, or generate fallback
      if (PERMANENT_CASES.length > 0) {
         return PERMANENT_CASES[Math.floor(Math.random() * PERMANENT_CASES.length)];
      }
      return await generatePatientCase(playerXp);
    }
  },

  async submitResult(caseId: string, isCorrect: boolean): Promise<void> {
    await db.updateCaseStats(caseId, isCorrect);
  }
};