// src/core/brain/narrative-types.ts

/**
 * STRUKTURA ROZDZIAŁU ŻYCIA
 * Pojedynczy wpis generowany podczas cyklu snu (Sleep Cycle).
 */
export interface LifeChapter {
  id: string;             // UUID
  date: string;           // Data zapisu (np. "2026-01-29")
  title: string;          // Tytuł rozdziału (np. "Dzień Wysokiego Napięcia")
  
  // NARRACJA (Storytelling)
  content: string;        // Opis dnia w pierwszej osobie (Pamiętnik)
  
  // ANALIZA PSYCHOLOGICZNA
  dominantEmotion: string; // np. "Melancholia", "Euforia", "Lęk"
  keyLearnings: string[];  // Czego bot się nauczył o świecie/sobie
  
  // METADANE
  statsSnapshot: {
    avgEnergy: number;
    avgLibido: number;
    avgStress: number;
  };
}

/**
 * AUTOBIOGRAFIA (Cała Książka)
 * Plik: bots/[name]/autobiography.json
 */
export interface Autobiography {
  botName: string;
  createdAt: string;
  
  // EGO SUMMARY: Skondensowany opis "Kim jestem TERAZ" (używany przez System 2)
  currentSelfModel: string; 
  
  chapters: LifeChapter[]; // Lista wszystkich rozdziałów chronologicznie
}
