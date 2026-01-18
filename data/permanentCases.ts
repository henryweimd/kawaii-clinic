import { PatientCase } from "../types";

export const PERMANENT_CASES: PatientCase[] = [
  {
    id: "perm_001",
    name: "Oliver",
    age: 8,
    occupation: "Treehouse Architect",
    avatarSeed: "Oliver",
    difficulty: 'beginner',
    stages: [
      {
        id: "s1",
        dialogue: "Dr. Cutie! I was building my fortress and now I'm super itchy! Did the squirrels attack me with invisible lasers?",
        correctChoiceId: "c1",
        choices: [
          { id: "c1", label: "Calamine lotion & rest", feedback: "Spot on! That will soothe the itch." },
          { id: "c2", label: "Antibiotics", feedback: "It's a virus, so antibiotics won't fight the laser squirrels!" },
          { id: "c3", label: "Ice bath", feedback: "Brrr! Too cold and not necessary." }
        ]
      }
    ],
    symptoms: ["Itchy red bumps", "Mild fever", "Tiredness"],
    vitals: { temp: "37.8°C", bp: "100/60", hr: "85 bpm" },
    diagnosis: "Chickenpox (Varicella)",
    medicalExplanation: "Chickenpox is a highly contagious infection caused by the varicella-zoster virus. It causes an itchy, blister-like rash. While uncomfortable, it's very common in kids!",
    trustedSources: [
      { title: "CDC - Chickenpox", url: "https://www.cdc.gov/chickenpox/index.html" },
      { title: "Mayo Clinic", url: "https://www.mayoclinic.org/diseases-conditions/chickenpox/symptoms-causes/syc-20351282" }
    ]
  },
  {
    id: "perm_002",
    name: "Luna",
    age: 22,
    occupation: "Stargazer",
    avatarSeed: "Luna",
    difficulty: 'beginner',
    stages: [
      {
        id: "s1",
        dialogue: "H-h-achoo! Sorry, Doctor. I went to the flower field to watch the meteor shower and now I can't stop sneezing!",
        correctChoiceId: "c1",
        choices: [
          { id: "c1", label: "Antihistamines", feedback: "Correct! That should block the histamine reaction." },
          { id: "c2", label: "Full body cast", feedback: "That seems a bit restrictive for a runny nose!" },
          { id: "c3", label: "Surgery", feedback: "We don't need to operate on a sneeze!" }
        ]
      }
    ],
    symptoms: ["Sneezing", "Runny nose", "Itchy eyes"],
    vitals: { temp: "37.0°C", bp: "115/75", hr: "78 bpm" },
    diagnosis: "Allergic Rhinitis (Hay Fever)",
    medicalExplanation: "Allergic rhinitis occurs when your immune system overreacts to particles in the air that you breathe—you are allergic to them. It attacks particles like pollen or dust.",
    trustedSources: [
      { title: "MedlinePlus - Allergic Rhinitis", url: "https://medlineplus.gov/ency/article/000813.htm" },
      { title: "AAAAI - Hay Fever", url: "https://www.aaaai.org/conditions-treatments/allergies/hay-fever" }
    ]
  },
  {
    id: "perm_003",
    name: "Barnaby",
    age: 45,
    occupation: "Professional Bear Hugger",
    avatarSeed: "Barnaby",
    difficulty: 'beginner',
    stages: [
      {
        id: "s1",
        dialogue: "Doc, it hurts to swallow my honey tea. Even growling hurts! Can you take a look?",
        correctChoiceId: "c1",
        choices: [
          { id: "c1", label: "Antibiotics (Penicillin)", feedback: "Exactly right. Since it's bacterial, this will help." },
          { id: "c2", label: "More honey", feedback: "Honey is soothing, but won't cure the bacteria." },
          { id: "c3", label: "Shouting therapy", feedback: "That will definitely make it worse!" }
        ]
      }
    ],
    symptoms: ["Sore throat", "Pain when swallowing", "Swollen glands"],
    vitals: { temp: "38.5°C", bp: "125/80", hr: "88 bpm" },
    diagnosis: "Strep Throat",
    medicalExplanation: "Strep throat is a bacterial infection that can make your throat feel sore and scratchy. Strep throat accounts for only a small portion of sore throats.",
    trustedSources: [
      { title: "CDC - Strep Throat", url: "https://www.cdc.gov/groupastrep/diseases-public/strep-throat.html" }
    ]
  },
  {
    id: "perm_004",
    name: "Pixel",
    age: 19,
    occupation: "Esports Athlete",
    avatarSeed: "Pixel",
    difficulty: 'beginner',
    stages: [
      {
        id: "s1",
        dialogue: "GGs, Doc. My APM is dropping because my hand feels all tingly and numb. I can't click heads like this!",
        correctChoiceId: "c1",
        choices: [
          { id: "c1", label: "Wrist splint & breaks", feedback: "Perfect. Resting the nerve is key." },
          { id: "c2", label: "Play more games", feedback: "No! You need to rest that wrist." },
          { id: "c3", label: "Heavy weightlifting", feedback: "That might put more strain on it right now." }
        ]
      }
    ],
    symptoms: ["Wrist pain", "Numbness in fingers", "Weak grip"],
    vitals: { temp: "36.8°C", bp: "110/70", hr: "70 bpm" },
    diagnosis: "Carpal Tunnel Syndrome",
    medicalExplanation: "Carpal tunnel syndrome is a condition that causes numbness, tingling, or weakness in your hand. It happens because of pressure on your median nerve, which runs the length of your arm.",
    trustedSources: [
      { title: "NINDS - Carpal Tunnel", url: "https://www.ninds.nih.gov/health-information/disorders/carpal-tunnel-syndrome" }
    ]
  },
  {
    id: "perm_005",
    name: "Chef Gusto",
    age: 35,
    occupation: "Pastry Wizard",
    avatarSeed: "Gusto",
    difficulty: 'beginner',
    stages: [
      {
        id: "s1",
        dialogue: "Mama mia! Every time I taste my spicy lava cakes, I feel a fire in my chest! Is it love, or something else?",
        correctChoiceId: "c1",
        choices: [
          { id: "c1", label: "Antihistamines", feedback: "Antihistamines are for allergies, not acid!" },
          { id: "c2", label: "Antacids & diet change", feedback: "Chef's kiss! Neutralizing the acid will help." },
          { id: "c3", label: "Headstand", feedback: "Gravity works against you there!" }
        ]
      }
    ],
    symptoms: ["Heartburn", "Acid taste in mouth", "Chest discomfort"],
    vitals: { temp: "37.1°C", bp: "130/85", hr: "80 bpm" },
    diagnosis: "GERD (Acid Reflux)",
    medicalExplanation: "Gastroesophageal reflux disease (GERD) occurs when stomach acid frequently flows back into the tube connecting your mouth and stomach (esophagus). This backwash (acid reflux) can irritate the lining of your esophagus.",
    trustedSources: [
      { title: "Mayo Clinic - GERD", url: "https://www.mayoclinic.org/diseases-conditions/gerd/symptoms-causes/syc-20361940" }
    ]
  },
  // Advanced Multi-step Case
  {
    id: "perm_adv_001",
    name: "Fiona",
    age: 28,
    occupation: "Forest Ranger",
    avatarSeed: "Fiona",
    difficulty: 'advanced',
    symptoms: ["Shortness of breath", "Wheezing", "Chest tightness"],
    vitals: { temp: "37.0°C", bp: "120/80", hr: "95 bpm" },
    stages: [
      {
        id: "s1",
        dialogue: "Doctor, I was running the trail and suddenly my chest felt so tight. I can't catch my breath!",
        correctChoiceId: "c_s1_2",
        choices: [
          { id: "c_s1_1", label: "Send home to rest", feedback: "She is having trouble breathing! You can't send her home." },
          { id: "c_s1_2", label: "Listen to lungs & check Oxygen", feedback: "Good call. You hear wheezing and her O2 is 92%." },
          { id: "c_s1_3", label: "Perform stomach surgery", feedback: "What? No! It's her lungs." }
        ]
      },
      {
        id: "s2",
        dialogue: "Okay... *wheeze*... you checked my oxygen. It's a bit low... what should we do to open my airways?",
        correctChoiceId: "c_s2_1",
        choices: [
          { id: "c_s2_1", label: "Administer Albuterol Nebulizer", feedback: "Excellent. The bronchodilator opens the airways immediately." },
          { id: "c_s2_2", label: "Give a glass of water", feedback: "Hydration is good, but it won't stop an asthma attack." },
          { id: "c_s2_3", label: "Check blood pressure again", feedback: "We need to treat the breathing, not check BP again." }
        ]
      }
    ],
    diagnosis: "Acute Asthma Exacerbation",
    medicalExplanation: "Asthma is a condition in which your airways narrow and swell and may produce extra mucus. This can make breathing difficult and trigger coughing, a whistling sound (wheezing) when you breathe out and shortness of breath.",
    trustedSources: [
      { title: "Mayo Clinic - Asthma", url: "https://www.mayoclinic.org/diseases-conditions/asthma/symptoms-causes/syc-20369653" }
    ]
  }
];