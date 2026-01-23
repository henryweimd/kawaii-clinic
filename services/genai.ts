import { GoogleGenAI, Type } from "@google/genai";
import { PatientCase, MedicalImage } from "../types";

// Define the schema strictly for the model
const patientCaseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Cute first name of the patient" },
    age: { type: Type.INTEGER, description: "Age of the patient" },
    occupation: { type: Type.STRING, description: "Whimsical job title (e.g. Cloud Watcher, Berry Picker)" },
    difficulty: { type: Type.STRING, enum: ["beginner", "advanced"], description: "Difficulty level of the case" },
    symptoms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 2-4 medical symptoms observed",
    },
    vitals: {
      type: Type.OBJECT,
      properties: {
        temp: { type: Type.STRING, description: "Body temperature" },
        bp: { type: Type.STRING, description: "Blood pressure" },
        hr: { type: Type.STRING, description: "Heart rate" },
      },
    },
    stages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          dialogue: { type: Type.STRING, description: "Patient's statement or narrator's update for this stage." },
          choices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING, description: "Action/Diagnosis description" },
                feedback: { type: Type.STRING, description: "Result message if this choice is selected" },
              },
              required: ["id", "label", "feedback"],
            },
            description: "3 choices. One correct, two incorrect."
          },
          correctChoiceId: { type: Type.STRING, description: "The ID of the correct choice for this stage" },
        },
        required: ["id", "dialogue", "choices", "correctChoiceId"]
      },
      description: "If beginner, 1 stage. If advanced, 2-3 stages forming a logical diagnostic sequence."
    },
    diagnosis: { type: Type.STRING, description: "The actual medical diagnosis" },
    medicalImageDescription: { 
      type: Type.STRING, 
      description: "A description for a visual medical finding (e.g., 'X-ray showing a faint shadow', 'Close-up of a circular red rash', 'An ECG with wavy lines'). Leave empty if not applicable." 
    },
    medicalExplanation: { 
      type: Type.STRING, 
      description: "A paragraph explaining the real medical science, pathophysiology, and why the diagnosis is correct, written in an educational but accessible tone." 
    },
    trustedSources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Name of a trusted medical website (e.g., Mayo Clinic, CDC, NHS)" },
          url: { type: Type.STRING, description: "A valid URL to a page about this condition." }
        },
        required: ["title", "url"]
      },
      description: "2-3 links to trusted medical resources for learning more."
    },
  },
  required: ["name", "age", "occupation", "difficulty", "symptoms", "vitals", "stages", "diagnosis", "medicalExplanation", "trustedSources"],
};

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const generateAvatar = async (details: { name: string, occupation: string, age: number, symptoms: string[] }): Promise<string | undefined> => {
  const aiInstance = getAI();

  // Refined prompt for high-quality, professional game art style
  const prompt = `Masterpiece, high-quality 3D chibi human character, professionally produced video game asset. Style of high-end 3D cozy games. Name: ${details.name}, Occupation: ${details.occupation}. Expression: Mildly unwell but cute. Art style: Octane render, 4k, soft cinematic lighting, clay-like smooth texture, high detail, pastel colors, solid white background. Nintendo Switch aesthetics.`;

  try {
    // Fix: Using aiInstance.models.generateContent directly as per SDK guidelines.
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Failed to generate avatar image", e);
  }
  return undefined;
};

const generateMedicalFindingImage = async (findingDescription: string): Promise<string | undefined> => {
  const aiInstance = getAI();

  // Refined prompt for professional game icons/findings
  const prompt = `Professional video game UI illustration for a medical chart finding. Concept: ${findingDescription}. Style: Clean vector-style or polished 3D render, soft hand-painted textures, pastel medical palette, clean white background. Educational but aesthetic, high production quality, masterpiece level. No gore.`;

  try {
    // Fix: Using aiInstance.models.generateContent directly as per SDK guidelines.
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Failed to generate medical finding image", e);
  }
  return undefined;
};

export const generatePatientCase = async (playerXp: number = 0): Promise<PatientCase> => {
  const aiInstance = getAI();

  // Difficulty Logic
  const isAdvancedEligible = playerXp >= 300;
  const requestedDifficulty = (isAdvancedEligible && Math.random() > 0.5) ? "advanced" : "beginner";

  const SYSTEM_INSTRUCTION = `
You are the Lead Narrative Doctor for "Kawaii Clinic", a high-end cozy medical simulation game.
Generate a patient case JSON for the game.
1. The aesthetic is "Cozy/Kawaii/Nintendo-style".
2. The medical conditions must be realistic and scientifically grounded, but presented in a user-friendly way.
3. DIFFICULTY: ${requestedDifficulty.toUpperCase()}.
   - If "beginner": Provide exactly 1 stage.
   - If "advanced": Provide 2 or 3 stages forming a logical sequence.
4. "medicalImageDescription": If the diagnosis involves a visual finding (e.g. skin rash, X-ray, ECG), provide a detailed visual description for a professional artist.
`;

  try {
    // 1. Generate the Case Text
    // Fix: Using aiInstance.models.generateContent directly.
    // Fix: Using gemini-3-pro-preview for complex diagnostic reasoning and logic tasks.
    const textResponse = await aiInstance.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        role: 'user',
        parts: [{ text: `Generate a random high-quality ${requestedDifficulty} patient case with professional medical logic.` }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: patientCaseSchema,
        temperature: 0.9,
        thinkingConfig: requestedDifficulty === 'advanced' ? { thinkingBudget: 2048 } : undefined,
      },
    });

    const text = textResponse.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    const data = JSON.parse(text);

    // 2. Generate the Avatar Image
    const avatarUrl = await generateAvatar({
      name: data.name,
      age: data.age,
      occupation: data.occupation,
      symptoms: data.symptoms
    });

    // 3. Generate the Medical Finding Image (if applicable)
    let medicalImages: MedicalImage[] | undefined = undefined;
    if (data.medicalImageDescription && data.medicalImageDescription.trim().length > 0) {
      const findingUrl = await generateMedicalFindingImage(data.medicalImageDescription);
      if (findingUrl) {
        medicalImages = [{
          url: findingUrl,
          caption: data.medicalImageDescription
        }];
      }
    }

    return {
      ...data,
      id: crypto.randomUUID(),
      avatarSeed: `${data.name}-${Math.floor(Math.random() * 1000)}`,
      imageUrl: avatarUrl,
      medicalImages: medicalImages,
    };

  } catch (error) {
    console.error("Failed to generate case:", error);
    // Fallback data
    return {
      id: crypto.randomUUID(),
      difficulty: 'beginner',
      name: "Dr. Fallback",
      age: 30,
      occupation: "Safety Coordinator",
      avatarSeed: "fallback-hero",
      symptoms: ["System Hiccup", "Glitchy vision"],
      vitals: { temp: "36.6°C", bp: "120/80", hr: "60 bpm" },
      stages: [
        {
          id: "s1",
          dialogue: "Oh no! It looks like my data got tangled. Can you prescribe a quick system restart?",
          correctChoiceId: "c1",
          choices: [
            { id: "c1", label: "Apply Digital Patches", feedback: "Connection restored! Thank you, Doctor." },
            { id: "c2", label: "Defragment Drive", feedback: "A bit old school, but okay!" },
            { id: "c3", label: "Buy New Pager", feedback: "Pagers are expensive, let's try the patch first!" },
          ]
        }
      ],
      diagnosis: "Temporary Connection Glitch",
      medicalExplanation: "Sometimes even the best clinics have technical difficulties! This fallback case ensures you can keep playing while we fix the connection.",
      trustedSources: [
        { title: "Kawaii Clinic Support", url: "https://example.com" }
      ],
      isFallback: true,
    };
  }
};
