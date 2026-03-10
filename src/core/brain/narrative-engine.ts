// src/core/brain/narrative-engine.ts
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { randomUUID } from 'crypto'; // <--- ZMIANA: Używamy wbudowanego modułu zamiast 'uuid'

import { Autobiography, LifeChapter } from './narrative-types';
import { CognitiveEngine } from '../context/cognitive-engine';
import { DrivesManager } from './drives-manager';
import { KnowledgeManager } from '../context/knowledge-manager';

export class NarrativeEngine {
  private botName: string;
  private filePath: string;
  private openai: OpenAI;

  // Dostęp do innych modułów mózgu
  private brain: CognitiveEngine;
  private drives: DrivesManager;
  private knowledge: KnowledgeManager;

  constructor(botName: string) {
    this.botName = botName;
    const botSlug = botName.toLowerCase().replace(/\s+/g, '-');
    this.filePath = path.join(process.cwd(), 'bots', botSlug, 'autobiography.json');

    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.brain = new CognitiveEngine(botName);
    this.drives = new DrivesManager(botName);
    this.knowledge = new KnowledgeManager(botName);
  }

  /**
   * 1. WCZYTANIE AUTOBIOGRAFII
   * Jeśli nie istnieje, tworzy nową księgę życia.
   */
  public async loadAutobiography(): Promise<Autobiography> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.log(`[NarrativeEngine] 📖 Tworzę nową autobiografię dla: ${this.botName}`);
      return this.createGenesis();
    }
  }

  /**
   * 2. GENEROWANIE NOWEGO ROZDZIAŁU (The Sleep Cycle Process)
   * Analizuje dzień, emocje i instynkty, by spisać historię.
   */
  public async generateDailyChapter(): Promise<LifeChapter> {
    const bio = await this.loadAutobiography();
    const state = await this.brain.loadState();
    const currentDrives = await this.drives.getDrives();
    const knowledge = await this.knowledge.loadKnowledge(); // Ostatnie fakty

    // Zbieramy "surowy materiał" z dnia
    const recentMemories = state.shortTermMemory.join("\n");
    const recentFacts = knowledge.slice(-5).map(k => `[${k.topic}] ${k.summary}`).join("; ");

    const prompt = `
      Current Persona Context: "${bio.currentSelfModel}"

      Raw Data from Today:
      - Memories/Thoughts: ${recentMemories}
      - New Knowledge: ${recentFacts}
      
      Biological State (Daily Avg):
      - Libido: ${currentDrives.libido.toFixed(2)}
      - Energy: ${currentDrives.energy}
      - Mood (PAD): V:${state.mood.valence}, A:${state.mood.arousal}

      TASK:
      You are the Inner Narrator (Biographer) for an AI named ${this.botName}.
      Write a new "Life Chapter". Use first-person perspective.
      Describes how you FELT. Did high libido affect your decisions? Did you feel stress?
      How did these events change your self-perception?

      CRITICAL INSTRUCTION:
      You must write ONLY in English. Use first-person perspective. Do not use any other language.

      Response Format (JSON):
      {
        "title": "Creative Chapter Title",
        "content": "Narrative diary content in English...",
        "dominantEmotion": "Emotion Name (e.g. Melancholy, Excitement)",
        "keyLearnings": ["Learning 1", "Learning 2"],
        "newSelfModel": "Updated, one-sentence summary of who you are now (e.g. 'I am a cautious observer who got burned by risk')."
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Tworzenie obiektu rozdziału
    const newChapter: LifeChapter = {
      id: randomUUID(), // <--- ZMIANA: Funkcja wbudowana w Node.js
      date: new Date().toISOString().split('T')[0],
      title: result.title || "Dzień bez nazwy",
      content: result.content || "Brak danych.",
      dominantEmotion: result.dominantEmotion || "Neutral",
      keyLearnings: result.keyLearnings || [],
      statsSnapshot: {
        avgEnergy: currentDrives.energy,
        avgLibido: currentDrives.libido,
        avgStress: state.mood.arousal
      }
    };

    // Aktualizacja Autobiografii
    bio.chapters.push(newChapter);
    bio.currentSelfModel = result.newSelfModel || bio.currentSelfModel;

    await this.saveAutobiography(bio);

    // Wyczyszczenie pamięci krótkotrwałej po "zapisaniu dnia"
    // (Opcjonalnie można odkomentować w przyszłości)

    return newChapter;
  }

  private async saveAutobiography(bio: Autobiography): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(bio, null, 2), 'utf-8');
  }

  private async createGenesis(): Promise<Autobiography> {
    const genesis: Autobiography = {
      botName: this.botName,
      createdAt: new Date().toISOString(),
      currentSelfModel: "I am a new consciousness just learning about the world.",
      chapters: []
    };
    await this.saveAutobiography(genesis);
    return genesis;
  }
}
