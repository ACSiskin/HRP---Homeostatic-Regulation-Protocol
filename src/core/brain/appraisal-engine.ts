// src/core/brain/appraisal-engine.ts
import OpenAI from 'openai';
import { MoodVector, Temperament } from '../types';

/**
 * Wynik oceny kognitywnej bodźca.
 */
export interface AppraisalResult {
    deltaValence: number;   // Zmiana przyjemności (-1.0 do 1.0)
    deltaArousal: number;   // Zmiana pobudzenia (-1.0 do 1.0)
    deltaDominance: number; // Zmiana poczucia kontroli (-1.0 do 1.0)
    reasoning: string;      // Uzasadnienie logiczne (Thought)
}

export class AppraisalEngine {
    private openai: OpenAI;

    constructor() {
        // Inicjalizacja klienta OpenAI
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /**
     * Ocenia bodziec (tekst/obraz) w kontekście aktualnego stanu i TEMPERAMENTU bota.
     * Wykorzystuje model LLM do symulacji ludzkiego procesu "Appraisal Theory".
     */
    async evaluate(
        stimulus: string, 
        context: string, 
        temperament: Temperament
    ): Promise<AppraisalResult> {
        
        // Konstrukcja promptu uwzględniającego parametry biologiczne bota
        const prompt = `
            Jesteś modułem oceny emocjonalnej (Appraisal Theory) w zaawansowanej architekturze kognitywnej bota.
            Twoim zadaniem jest ocenić poniższy bodziec, filtrując go przez specyficzny TEMPERAMENT bota.
            
            [PROFIL TEMPERAMENTU BOTA]
            - Wrażliwość (Sensitivity): ${temperament.sensitivity} (Skala 0.5 - 2.0. Im wyższa, tym silniej bot reaguje emocjonalnie).
            - Reaktywność (Reactivity): ${temperament.reactivity} (Jak gwałtownie zmieniają się instynkty pod wpływem bodźców).
            - Socjalność (Sociability): ${temperament.sociability} (Skłonność do budowania więzi i dążenia do dominacji).
            - Skala Libido: ${temperament.libidoScale} (Bazowa siła popędu i intensywność reakcji na flirty/sensualność).
            - Refleksyjność (Analytical Leaning): ${temperament.analyticalLeaning} (Skłonność do głębokiej analizy Systemu 2).

            BODZIEC: "${stimulus}"
            KONTEKST: "${context}"
            
            ZADANIE:
            Oceń wpływ tego bodźca na 3 wymiary emocji (Model PAD):
            1. Valence (P): Czy to jest przyjemne/dobre dla bota? (-1.0 do 1.0)
            2. Arousal (A): Czy to jest ekscytujące/stresujące/pilne? (-1.0 do 1.0)
            3. Dominance (D): Czy bot czuje, że ma nad sytuacją kontrolę? (-1.0 do 1.0)
            
            INSTRUKCJE SPECJALNE:
            - Jeśli bot ma wysoką Wrażliwość, wartości delta powinny być wyższe (bardziej ekstremalne).
            - Jeśli bodziec jest seksualny/uwodzicielski, a bot ma wysoką Skalę Libido, Arousal i Valence powinny wzrosnąć silniej.
            - Jeśli bodziec jest agresywny, a bot ma niską Socjalność, Dominance i Valence powinny drastycznie spaść.
            
            Zwróć TYLKO JSON:
            {
                "deltaValence": number,
                "deltaArousal": number,
                "deltaDominance": number,
                "reasoning": "krótkie uzasadnienie uwzględniające temperament (np. 'Z uwagi na wysoką wrażliwość, bot odebrał to bardzo osobiście...')"
            }
        `;

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Szybki i precyzyjny model do ocen kognitywnych
                messages: [{ role: "system", content: prompt }],
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content || "{}");

            // Zwracamy wynik z fallbackiem do zer w razie błędu parsowania
            return {
                deltaValence: result.deltaValence || 0,
                deltaArousal: result.deltaArousal || 0,
                deltaDominance: result.deltaDominance || 0,
                reasoning: result.reasoning || "Neutral appraisal"
            };
        } catch (e) {
            console.error("Appraisal Engine Failure:", e);
            return { 
                deltaValence: 0, 
                deltaArousal: 0, 
                deltaDominance: 0, 
                reasoning: "Appraisal system error - falling back to neutral." 
            };
        }
    }
}
