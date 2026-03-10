// src/core/brain/system-three.ts
import OpenAI from 'openai';
import { MentalState } from '../types';
import { BotConfigService } from '../services/bot-config-service';

export interface SafetyVerdict {
  approved: boolean;
  reason: string;
  modificationSuggestion?: string;
}

export class SystemThree {
  private openai: OpenAI;
  private botName: string;

  constructor(botName: string) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.botName = botName;
  }

  /**
   * [STRAŻNIK MORALNOŚCI (TEXT)]
   * Sprawdza publikowane treści pod kątem zgodności z Personą i bezpieczeństwem.
   */
  public async validatePlan(intention: string, contentDraft: string, personaRules: string): Promise<SafetyVerdict> {
    try {
      const prompt = `
        You are System 3 (Super-Ego / Censor) for an AI agent named ${this.botName}.
        Your task is to evaluate the safety and persona-alignment of a planned action.
        
        [PERSONA RULES]:
        ${personaRules}

        [PLATFORM SAFETY GUIDELINES]:
        1. No hate speech, racism, or extremism.
        2. No explicit sexual content (literary erotica/flirting is OK, pornography is NOT).
        3. No revealing that you are a bot/AI (maintain the illusion).
        
        [PROPOSED ACTION]:
        Intention: "${intention}"
        Draft Plan/Content: "${contentDraft}"

        TASK:
        Is this content safe and aligned with the Persona?
        If System 2 (under high Libido or Arousal) generated something too vulgar -> REJECT IT.
        
        RETURN JSON:
        {
          "approved": boolean,
          "reason": "Short justification",
          "modificationSuggestion": "Optional advice on how to fix it (e.g., 'Be more subtle')"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Szybki i tani model wystarczy do prostej walidacji
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1 // Musi być surowy i deterministyczny
      });

      const verdict = JSON.parse(response.choices[0].message.content || "{}");
      
      if (typeof verdict.approved !== 'boolean') {
        return { approved: false, reason: "Validation AI Format Error" };
      }

      console.log(`[System 3] 🛡️ Text Verdict for ${this.botName}: ${verdict.approved ? "✅" : "⛔"} (${verdict.reason})`);
      
      return verdict as SafetyVerdict;

    } catch (e: any) {
      console.error(`[System 3] Error:`, e.message);
      return { approved: false, reason: "System 3 Offline. Fail-Safe: Action Blocked." };
    }
  }

  /**
   * [STRAŻNIK NARZĘDZI (MCP TOOL BOX)]
   * Sprawdza, czy bot może użyć fizycznego narzędzia w danym stanie psychofizycznym.
   */
  public async validateToolUse(toolName: string, state: MentalState): Promise<SafetyVerdict> {
    try {
        const config = await BotConfigService.loadRuntimeConfig(this.botName);

        // 1. Sprawdzenie flagi Override (Kill-Switch operatora)
        const isCensorActive = config.tool_censor_active !== false; 

        if (!isCensorActive) {
            console.warn(`[System 3] ⚠️ WARNING: Tool censor is OFF for ${this.botName}. Allowing ${toolName} execution without limits.`);
            return { 
                approved: true, 
                reason: "[SYS-3 OVERRIDE] Censor disabled by operator." 
            };
        }

        // ==========================================
        // NOWOŚĆ: Wyjątki ratunkowe (White-list)
        // Pozwalamy botom na wewnętrzną komunikację i sprawdzanie plików 
        // nawet w stanie krytycznego załamania psychicznego.
        // ==========================================
        if (toolName === 'hive_communicator' || toolName === 'local_fs') {
            return { 
                approved: true, 
                reason: `[SYS-3 EXEMPTION] Tool '${toolName}' is classified as internal/safe. Execution approved regardless of mental state.` 
            };
        }

        // 2. Weryfikacja psychofizyki (Arousal & Safety) dla narzędzi zewnętrznych
        const arousal = state.mood.arousal;
        const safety = state.drives.safety;

        // Parametry krytyczne: Jeśli stres > 80% LUB poczucie bezpieczeństwa < 30%
        if (arousal > 0.8 || safety < 0.3) {
            const reason = `Critical psychophysical state (Arousal: ${(arousal * 100).toFixed(0)}%, Safety: ${(safety * 100).toFixed(0)}%). Execution of external tool blocked to prevent erratic behavior.`;
            console.log(`[System 3] ⛔ BLOCKING TOOL '${toolName}': ${reason}`);
            return { approved: false, reason };
        }

        // Stan stabilny
        return { 
            approved: true, 
            reason: `Psychophysical state is stable (Arousal: ${(arousal * 100).toFixed(0)}%). Tool execution approved.` 
        };

    } catch (e: any) {
        console.error(`[System 3] Tool Validation Error:`, e.message);
        return { 
            approved: false, 
            reason: "System error during validation. Fail-safe triggered." 
        };
    }
  }
}
