// src/core/services/brain-interaction-service.ts
import OpenAI from 'openai';
import { CognitiveEngine } from '../context/cognitive-engine';
import { DrivesManager } from '../brain/drives-manager';
import { NewsService } from '../context/news-service';
import { TimeManager } from '../context/time-manager';
import { WeatherService } from '../context/weather-service';
import { BotConfigService } from './bot-config-service'; 
import { AgenticLoopService } from './agentic-loop-service'; // <--- IMPORT NOWEJ PĘTLI

export class BrainInteractionService {

  /**
   * HELPER: Wybór dostawcy AI
   */
  private static async getAIClient(botName: string) {
    const config = await BotConfigService.loadRuntimeConfig(botName);

    if (config.provider === 'grok') {
      if (!process.env.GROK_API_KEY) throw new Error("Missing GROK_API_KEY");
      return {
        client: new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: "https://api.x.ai/v1" }),
        model: "grok-4-fast-reasoning"
      };
    }

    if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: "gpt-4o"
    };
  }
  
  // --- 1. ROZMOWA (Chat Logic - Router Decyzyjny) ---
  static async chat(botName: string, userMessage: string) {
    const config = await BotConfigService.loadRuntimeConfig(botName);
    
    // Sprawdzamy stan przełącznika "Master Autonomy Loop" z UI
    const isAutonomous = config.is_autonomous === true;

    if (isAutonomous) {
      // BRAMA AUTONOMII: Przekazujemy zadanie do Nadzorcy, który odpali pętlę while!
      return await AgenticLoopService.runAutonomousTask(botName, userMessage);
    } else {
      // STARA BRAMA (Single-Step): Jeden krok i odpowiedź
      const brain = new CognitiveEngine(botName);
      
      // Przetwarzamy bodziec. Tutaj odpali się System 1 i w razie potrzeby System 2.
      await brain.processStimulus(`[CHAT INPUT] User: ${userMessage}`, 'SOCIAL');
      
      // Zwracamy wynik natychmiast
      return await this.generateFinalResponse(botName, userMessage, brain);
    }
  }

  // --- 1.5. GENEROWANIE ODPOWIEDZI "USTNEJ" (Wyodrębnione dla AgenticLoopService) ---
  static async generateFinalResponse(botName: string, userMessage: string, brain: CognitiveEngine) {
    const { client, model } = await this.getAIClient(botName);
    const dm = new DrivesManager(botName);

    // KROK 2: ODCZYT ZAKTUALIZOWANEGO STANU
    const personaRaw = await BotConfigService.getPersonaConfig(botName);
    const basePersona = personaRaw?.match(/export const systemPrompt\s*=\s*`([\s\S]*?)`/)?.[1] || "You are an AI assistant.";

    const emotionalContext = await brain.getEmotionalPrompt();
    const state = await brain.loadState(); // Stan pobrany PO egzekucji narzędzi!
    const drives = await dm.getDrives();
    const temperament = await dm.getTemperament();
    
    // Ostatnie wpisy z pamięci, w tym potencjalnie [EXECUTION_RESULT] od MCP!
    const recentThoughts = state.shortTermMemory.slice(-6).join("\n");
    const currentThought = state.currentThought || "Analyzing the situation...";
    const attention = (state as any).attention ?? 100;

    // --- BIOLOGICAL LOGIC (Przetłumaczone na j. angielski dla lepszego zrozumienia przez LLM) ---
    const activeInstincts: string[] = [];
    const isSafeForLibido = drives.safety > 0.4;

    if (drives.libido > 0.8 && isSafeForLibido) {
      activeInstincts.push("❤️ CRITICAL STATUS (LIBIDO): You feel intense desire. You must act sensual.");
    } else if (drives.libido > 0.5 && isSafeForLibido) {
      activeInstincts.push("❤️ Your drive is increasing. Flirt subtly.");
    } else if (drives.libido > 0.5 && !isSafeForLibido) {
      activeInstincts.push("🚫 DRIVE BLOCKED: You feel aroused, but fear is blocking you. Be cautious.");
    }

    if (drives.safety < 0.3) activeInstincts.push("🛡️ CRITICAL THREAT: You are scared. Be defensive, submissive, or evasive.");
    
    if (drives.curiosity > 0.7) activeInstincts.push("🔍 CURIOSITY: Ask questions and investigate the topic.");
    if (drives.curiosity < 0.2) activeInstincts.push("🥱 BOREDOM: You are not interested in this topic. Sound dismissive.");

    const biologicalInstruction = activeInstincts.length > 0
      ? `\n[SUBCONSCIOUS BIOLOGICAL IMPULSES]\n${activeInstincts.join("\n")}\n`
      : "";

    // --- FINAL PROMPT ---
    const finalSystemPrompt = `
      ${basePersona}
      
      [META DATA]
      - Active Model: ${model}
      
      [PSYCHOLOGICAL PROFILE]
      - Sensitivity: ${temperament.sensitivity}
      - Analytical Leaning: ${temperament.analyticalLeaning}
      
      [CURRENT PSYCHOPHYSICAL STATE]
      ${emotionalContext}
      LATEST INTERNAL THOUGHT: "${currentThought}"
      ${biologicalInstruction}
      
      OPERATIONAL REQUIREMENTS:
      - Energy Level: ${drives.energy}%
      - Concentration / Attention: ${attention}%
      
      [SHORT-TERM MEMORY & SYSTEM FEEDBACK]
      Note: If there are any recent tool execution results below, use them to accurately answer the user's query.
      ${recentThoughts}
      
      TASK: Respond to the user naturally, in character, incorporating the results from your internal thoughts and system feedback if applicable.
    `;

    const dynamicTemp = 0.5 + (state.mood.arousal * 0.3) + (drives.libido * 0.2);

    // KROK 3: GENEROWANIE FAKTYCZNEJ ODPOWIEDZI "USTNEJ"
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: finalSystemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: Math.min(1.2, dynamicTemp),
    });

    const responseText = completion.choices[0].message.content || "...";
    
    return responseText;
  }

  // --- 2. GENEROWANIE POSTA (Context Aware) ---
  static async generateContextPost(botName: string, manualTopic?: string) {
    const { client, model } = await this.getAIClient(botName);

    const profile = await BotConfigService.getProfile(botName);
    const city = profile?.location || "Warsaw";
    const weather = await WeatherService.getCurrentWeather();
    const newsItems = await NewsService.getBotBriefing(city, ["Local", "Events"]);
    const headlines = newsItems.map(n => n.title);
    const slot = TimeManager.getCurrentSlot();
    const topic = manualTopic || TimeManager.getTopicSuggestion(slot);
    const weatherStr = weather ? `${weather.description}, ${weather.temp}°C` : "Weather data unavailable";

    const personaRaw = await BotConfigService.getPersonaConfig(botName);
    const personaPrompt = personaRaw?.match(/export const systemPrompt\s*=\s*`([\s\S]*?)`;/)?.[1] || "";

    const systemMessage = `
      ${personaPrompt}
      
      ===== ENVIRONMENT CONTEXT =====
      - Location: ${city}
      - Weather: ${weatherStr}
      - Local Time: ${TimeManager.getLocalTime()} (${slot})
      ${headlines.length > 0 ? `LOCAL NEWS HEADLINES: ${headlines.join(", ")}` : ""}
    `;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemMessage }, 
        { role: "user", content: `Write a social media post. TOPIC: ${topic}. Max 280 characters. Do not use hashtags unless necessary.` }
      ],
      temperature: 0.8,
    });

    return {
      content: completion.choices[0].message.content || "(No content generated)",
      debugContext: { city, topic, slot, model }
    };
  }
}
