// src/core/brain/episodic-manager.ts
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { EpisodicMemory, MoodVector } from '../types';

export class EpisodicManager {
  private botName: string;
  private filePath: string;
  private openai: OpenAI;

  constructor(botName: string) {
    this.botName = botName;
    const slug = botName.toLowerCase().replace(/\s+/g, '-');
    this.filePath = path.join(process.cwd(), 'bots', slug, 'episodic_memory.json');
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // --- 1. ODCZYT PAMIĘCI ---
  async loadMemories(): Promise<EpisodicMemory[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // --- 2. TWORZENIE ENGRAMU (Zapis) ---
  // Uruchamiane tylko przy silnych emocjach (Intensity > 0.6)
  async encodeEpisode(
    trigger: string, 
    context: string, 
    mood: MoodVector, 
    outcome: string
  ) {
    // Obliczamy intensywność emocji (odległość od zera)
    const intensity = (Math.abs(mood.valence) + mood.arousal) / 2;

    if (intensity < 0.4) {
        console.log(`[Hippocampus] Zdarzenie zbyt błahe, by zapamiętać (Intensywność: ${intensity.toFixed(2)})`);
        return; 
    }

    console.log(`[Hippocampus] ⚡ Tworzę trwałę wspomnienie (Intensywność: ${intensity.toFixed(2)})...`);

    // Używamy LLM do stworzenia narracji (kompresja zdarzenia)
    const prompt = `
      Jesteś Hipokampem (modułem pamięci). Zapisz to zdarzenie jako wspomnienie z pierwszej osoby.
      
      Zdarzenie: "${trigger}"
      Kontekst: "${context}"
      Wynik: "${outcome}"
      Emocje: V:${mood.valence}, A:${mood.arousal}
      
      Napisz 1 zdanie narracji (np. "Kiedy ktoś mnie obraził, poczułam smutek, ale go zignorowałam").
    `;

    try {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            max_tokens: 100
        });

        const narrative = completion.choices[0].message.content || "Zdarzenie zapisane.";

        const memory: EpisodicMemory = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            trigger,
            context,
            emotionSnapshot: mood,
            intensity,
            narrative,
            outcome
        };

        const memories = await this.loadMemories();
        memories.push(memory);
        
        // Limit pamięci (np. 500 najsilniejszych wspomnień)
        if (memories.length > 500) {
            memories.sort((a, b) => b.intensity - a.intensity); // Sortuj po ważności
            memories.pop(); // Usuń najsłabsze
        }

        await fs.writeFile(this.filePath, JSON.stringify(memories, null, 2), 'utf-8');

    } catch (e) {
        console.error("Memory encoding failed:", e);
    }
  }

  // --- 3. PRZYPOMINANIE (Recall) ---
  // Szuka wspomnień podobnych do obecnej sytuacji
  async recallRelevant(currentStimulus: string): Promise<string> {
      const memories = await this.loadMemories();
      if (memories.length === 0) return "";

      // W idealnym świecie użylibyśmy Vector DB (Pinecone).
      // W wersji plikowej: pobieramy ostatnie i najważniejsze, i prosimy LLM o filtrację.
      
      const candidates = memories
        .sort((a, b) => b.intensity - a.intensity) // Najważniejsze
        .slice(0, 20); // Bierzemy top 20

      const candidatesText = candidates.map(m => `- [${m.timestamp}] ${m.narrative} (Outcome: ${m.outcome})`).join("\n");

      const prompt = `
        Jesteś mechanizmem kojarzenia faktów.
        Obecna sytuacja: "${currentStimulus}"
        
        Twoja Pamięć Epizodyczna:
        ${candidatesText}
        
        ZADANIE:
        Czy któreś z tych wspomnień jest uderzająco podobne lub daje ważną lekcję na teraz?
        Jeśli tak, zacytuj je krótko. Jeśli nie, napisz "BRAK".
      `;

      try {
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            max_tokens: 150
        });

        const result = completion.choices[0].message.content || "BRAK";
        if (result.includes("BRAK")) return "";
        
        return `[FLASHBACK / DEJA VU]: ${result}`;

      } catch (e) {
          return "";
      }
  }
}
