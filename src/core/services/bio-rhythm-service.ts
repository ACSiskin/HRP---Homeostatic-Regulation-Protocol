import OpenAI from 'openai';
import { CognitiveEngine } from '../context/cognitive-engine';
import { DrivesManager } from '../brain/drives-manager';
import { NarrativeEngine } from '../brain/narrative-engine';
import { KnowledgeManager } from '../context/knowledge-manager';
import { BotConfigService } from './bot-config-service';

export class BioRhythmService {

  /**
   * HELPER: Wybór dostawcy AI (Kopia logiczna dla Biorytmu)
   */
  private static async getAIClient(botName: string) {
    const config = await BotConfigService.loadRuntimeConfig(botName);

    if (config.provider === 'grok') {
      if (!process.env.GROK_API_KEY) throw new Error("Brak GROK_API_KEY");
      return {
        client: new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: "https://api.x.ai/v1" }),
        model: "grok-4-fast-reasoning"
      };
    }

    if (!process.env.OPENAI_API_KEY) throw new Error("Brak OPENAI_API_KEY");
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4o"
    };
  }

  // --- 1. SEN I REGENERACJA (Sleep Cycle) ---
  static async executeSleepCycle(botName: string) {
    const brain = new CognitiveEngine(botName);
    const km = new KnowledgeManager(botName);
    const dm = new DrivesManager(botName);
    const narrative = new NarrativeEngine(botName);

    // 1. Konsolidacja wiedzy (Facts)
    await km.consolidate();
    
    // 2. Generowanie pamięci autobiograficznej (Episodic -> Narrative)
    const chapter = await narrative.generateDailyChapter();
    
    // 3. Ewolucja osobowości (Persona Update)
    const evolutionMsg = await this.evolvePersona(botName, brain);

    // 4. Reset biologiczny
    const state = await brain.loadState();
    await dm.updateDrives({ energy: 100 });
    state.energy = 100;
    (state as any).attention = 100; // Reset "Brain Fog"
    
    state.shortTermMemory = [
      `[SYSTEM] Obudzono się.`,
      `[PAMIĘĆ] Wczorajszy rozdział: "${chapter.title}"`
    ];
    await brain.saveState(state);

    return { chapterTitle: chapter.title, evolutionMsg };
  }

  // --- 2. EWOLUCJA OSOBOWOŚCI (Persona Evolve) ---
  static async evolvePersona(botName: string, brain: CognitiveEngine) {
    const { client, model } = await this.getAIClient(botName);
    
    const currentPersonaRaw = await BotConfigService.getPersonaConfig(botName);
    const currentPrompt = currentPersonaRaw?.match(/export const systemPrompt = `([\s\S]*?)`;/)?.[1] || "";

    const state = await brain.loadState();
    const memories = state.shortTermMemory.join("\n");

    if (!memories || memories.length < 50) return "Brak wystarczających wrażeń do ewolucji.";

    const prompt = `
      Jesteś Inżynierem Dusz. Zaktualizuj osobowość bota.
      [STARA OSOBOWOŚĆ] ${currentPrompt}
      [NOWE DOŚWIADCZENIA] ${memories}
      Zadanie: Wygeneruj NOWĄ wersję treści System Prompt. Zwróć sam tekst promptu.
    `;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    const newPersona = completion.choices[0].message.content || currentPrompt;
    const newFileContent = `// bots/${botName}/persona.ts\n\n// --- EWOLUCJA: ${new Date().toLocaleDateString()} ---\n\nexport const systemPrompt = \`\n${newPersona}\n\`;`;
    
    await BotConfigService.savePersonaConfig(botName, newFileContent);
    return "Osobowość zaktualizowana.";
  }

  // --- 3. NARODZINY (Initial Seed) ---
  static async seedEgo(botName: string) {
    const { client, model } = await this.getAIClient(botName);
    
    const dm = new DrivesManager(botName);
    const engine = new CognitiveEngine(botName);
    
    const personaRaw = await BotConfigService.getPersonaConfig(botName);
    const personaText = personaRaw?.match(/export const systemPrompt\s*=\s*`([\s\S]*?)`/)?.[1] || "";

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "Analyze persona. Return JSON with 'drives', 'mood', 'temperament'." }, 
        { role: "user", content: personaText }
      ],
      response_format: { type: "json_object" }
    });
    
    const dna = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Zapis Instynktów
    if (dna.drives) await dm.updateDrives({ ...dna.drives, energy: 100 });
    if (dna.temperament) await dm.saveTemperament(dna.temperament);
    
    // Zapis Stanu Mentalnego
    const state = await engine.loadState();
    if (dna.mood) state.mood = dna.mood;
    (state as any).attention = 100;
    state.shortTermMemory.push("[SYSTEM] DNA Initialized.");
    await engine.saveState(state);

    return "Ego initialized.";
  }
}
