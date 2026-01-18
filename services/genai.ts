import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PatientCase, MedicalImage } from "../types";

// Define the schema strictly for the model
const patientCaseSchema: Schema = {
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
  const model = aiInstance.models;

  const prompt = `A cute 3D kawaii chibi human character, style of Animal Crossing New Horizons. Name: ${details.name}, Job: ${details.occupation}. Expression: Mildly unwell. Art style: 3D render, soft lighting, clay-like texture, pastel colors, white background. High quality 3D icon.`;

  try {
    const response = await model.generateContent({
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
  const model = aiInstance.models;

  const prompt = `A cozy, kawaii-style medical illustration for a clinical chart. Finding: ${findingDescription}. Style: Soft hand-drawn aesthetic, pastel colors, clean white background, educational but very cute and friendly. Avoid realistic gore. Aesthetic: Cozy game UI element.`;

  try {
    const response = await model.generateContent({
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
  const model = aiInstance.models;

  // Difficulty Logic
  const isAdvancedEligible = playerXp >= 300;
  const requestedDifficulty = (isAdvancedEligible && Math.random() > 0.5) ? "advanced" : "beginner";

  const SYSTEM_INSTRUCTION = `
You are the Game Master for "Kawaii Clinic", a fictional cozy medical simulation game.
Generate a patient case JSON for the game.
1. The aesthetic is "Cozy/Kawaii".
2. The medical condition should be accurate but presented safely.
3. DIFFICULTY: ${requestedDifficulty.toUpperCase()}.
   - If "beginner": Provide exactly 1 stage.
   - If "advanced": Provide 2 or 3 stages.
4. "medicalImageDescription": If the diagnosis typically involves a visual finding (e.g. skin rash, X-ray, ECG, eye exam), provide a short description for an artist.
`;

  try {
    // 1. Generate the Case Text
    const textResponse = await model.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        role: 'user',
        parts: [{ text: `Generate a random ${requestedDifficulty} patient case.` }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: patientCaseSchema,
        temperature: 0.8,
        thinkingConfig: requestedDifficulty === 'advanced' ? { thinkingBudget: 1024 } : undefined,
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
      name: "Daisy",
      age: 24,
      occupation: "Professional Napper",
      avatarSeed: "daisy-fallback",
      symptoms: ["Sneezing", "Runny nose", "Mild fatigue"],
      vitals: { temp: "37.2°C", bp: "110/70", hr: "72 bpm" },
      stages: [
        {
          id: "s1",
          dialogue: "Doctor! *sniff* My nose won't stop running like a little faucet! It's super annoying when I'm trying to nap.",
          correctChoiceId: "c1",
          choices: [
            { id: "c1", label: "Prescribe rest and fluids", feedback: "Perfect! Daisy feels better already." },
            { id: "c2", label: "Emergency Surgery", feedback: "Oh no! That's way too extreme for a cold!" },
            { id: "c3", label: "Refer to cardiologist", feedback: "Her heart sounds fine, just a sniffle!" },
          ]
        }
      ],
      diagnosis: "Common Cold",
      medicalExplanation: "The common cold is a viral infection of your nose and throat. It's usually harmless.",
      trustedSources: [
        { title: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/common-cold/symptoms-causes/syc-20351605" }
      ],
      isFallback: true,
    };
  }
};