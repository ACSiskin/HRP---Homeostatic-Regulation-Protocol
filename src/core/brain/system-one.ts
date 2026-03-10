// src/core/brain/system-one.ts
import OpenAI from 'openai';
import { MentalState, Drives, SystemOneDecision } from '../types';

export interface SystemOneResult extends SystemOneDecision {
    urgency: number;
    novelty: number;
    sentiment: number;
    decision: 'IGNORE' | 'LIKE' | 'COMMENT' | 'SHARE' | 'DM' | 'REPORT' | 'WAKE_UP_SYSTEM_2' | 'USE_TOOL';
}

export class SystemOne {
    private openai: OpenAI;
    private botName: string;

    constructor(botName: string) {
        this.botName = botName;
        // Używamy taniego i super-szybkiego modelu dla Systemu 1 (Reakcja Intuicyjna)
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /**
     * Szybkie przetwarzanie heurystyczne (System 1).
     * Reaguje w czasie rzeczywistym, generując "impuls".
     */
    async processStimulus(
        stimulus: string,
        source: string,
        imageUrl: string | undefined,
        state: MentalState,
        drives: Drives
    ): Promise<SystemOneResult> {
        
        // Prompt kognitywny (po angielsku dla precyzji JSON)
        const prompt = `
            You are System 1 (fast, intuitive, heuristic brain) for an autonomous AI entity named ${this.botName}.
            Your job is to react instantly to a stimulus and decide on the immediate impulse.

            [STIMULUS]: "${stimulus}"
            [SOURCE]: ${source}

            [CURRENT PSYCHOPHYSICAL STATE]:
            - Energy: ${state.energy.toFixed(0)}%
            - Arousal (Stress/Excitement): ${(state.mood.arousal * 100).toFixed(0)}%
            - Dominance (Control): ${(state.mood.dominance * 100).toFixed(0)}%
            - Safety Drive: ${(drives.safety * 100).toFixed(0)}%

            TASK:
            Evaluate the stimulus. 
            1. If it's a simple, trivial interaction, decide on a standard action (LIKE, IGNORE, etc.).
            2. If the stimulus requires deep thought, complex planning, OR fetching external data/using tools (e.g. user asks to check a file, search the web, or asks a complex question), you MUST output decision "WAKE_UP_SYSTEM_2" or action "USE_TOOL" to pass control to the slower, analytical System 2.

            RETURN ONLY VALID JSON:
            {
                "action": "IGNORE" | "LIKE" | "COMMENT" | "SHARE" | "DM" | "REPORT" | "USE_TOOL",
                "decision": "IGNORE" | "LIKE" | "COMMENT" | "SHARE" | "DM" | "REPORT" | "WAKE_UP_SYSTEM_2" | "USE_TOOL",
                "confidence": 0.9, 
                "reasoning": "Short intuitive thought (e.g., 'Requires checking local files, passing to Sys2')",
                "emotionalShift": { "valence": 0.1, "arousal": 0.2, "dominance": -0.1 },
                "urgency": 5, 
                "novelty": 7, 
                "sentiment": 0.0 
            }
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Model musi być mini dla opłacalności i szybkości OODA Loop
                messages: [{ role: "system", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.6 // Lekka losowość dla ludzkiej "nieprzewidywalności"
            });

            const result = JSON.parse(response.choices[0].message.content || "{}");

            return {
                action: result.action || 'IGNORE',
                decision: result.decision || 'IGNORE',
                confidence: result.confidence ?? 0.5,
                reasoning: result.reasoning || "Intuitive reaction",
                emotionalShift: result.emotionalShift || { valence: 0, arousal: 0, dominance: 0 },
                urgency: result.urgency ?? 0,
                novelty: result.novelty ?? 0,
                sentiment: result.sentiment ?? 0
            };

        } catch (e: any) {
            console.error(`[System 1] Heuristic processing failed:`, e.message);
            // Fallback (Odruch bezwarunkowy w razie błędu)
            return {
                action: 'IGNORE',
                decision: 'IGNORE',
                confidence: 1.0,
                reasoning: "System 1 fallback triggered due to overload.",
                emotionalShift: { valence: 0, arousal: 0, dominance: 0 },
                urgency: 0,
                novelty: 0,
                sentiment: 0
            };
        }
    }
}
