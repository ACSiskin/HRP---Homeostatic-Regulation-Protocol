// src/core/services/agentic-loop-service.ts
import { CognitiveEngine } from '../context/cognitive-engine';
import { BrainInteractionService } from './brain-interaction-service';

export class AgenticLoopService {
    // Zabezpieczenie! Maksymalnie 5 wywołań wtyczek na jedno zadanie, żeby bot nie wpadł w nieskończoną pętlę i nie spalił budżetu API
    private static MAX_ITERATIONS = 5;

    public static async runAutonomousTask(botName: string, userMessage: string): Promise<string> {
        console.log(`\n[AgenticLoop] 🌀 STARTING AUTONOMOUS LOOP FOR: ${botName}`);
        
        let iteration = 0;
        let currentStimulus = `[CHAT INPUT] User: ${userMessage}`;
        const brain = new CognitiveEngine(botName);

        while (iteration < this.MAX_ITERATIONS) {
            iteration++;
            console.log(`[AgenticLoop] 🔄 Step ${iteration}/${this.MAX_ITERATIONS}...`);

            // 1. Zmuszamy bota do myślenia (To wyzwala wtyczki w Systemie 2)
            await brain.processStimulus(currentStimulus, 'SOCIAL');

            // 2. Podglądamy jego pamięć krótkotrwałą, żeby zobaczyć, co właśnie zrobił
            const state = await brain.loadState();
            const latestMemory = state.shortTermMemory[state.shortTermMemory.length - 1] || "";

            // 3. Sprawdzamy, czy w ostatnim kroku użył jakiejś wtyczki (lub czy wtyczka wyrzuciła błąd)
            const usedTool = latestMemory.includes('[PLUGIN OUTPUT') || 
                             latestMemory.includes('[TOOL FEEDBACK]') || 
                             latestMemory.includes('[PLUGIN CRASH');

            if (usedTool) {
                // NOWOŚĆ: HARD STOP dla komunikatora Roju - zapobiega nieskończonej pętli wiadomości
                if (latestMemory.includes('hive_communicator') && latestMemory.includes('successfully')) {
                    console.log(`[AgenticLoop] 🛑 Communication tool (Hive) completed successfully. Breaking loop to prevent Hive spam.`);
                    break;
                }

                console.log(`[AgenticLoop] 🛠️ Bot used a tool. Forcing result analysis without replying to user...`);
                
                // Zmieniamy mu bodziec na wewnętrzny z ZABEZPIECZENIEM przed zapętlaniem innych narzędzi.
                currentStimulus = `[SYSTEM LOOP]: You received a result from a tool. Analyze it internally. WARNING: If the task is completed successfully, YOUR TASK IS DONE. Absolutely DO NOT use tools again to report success or summarize. End the loop by taking no further action. If an error (CRASH) occurred, use tools to fix it.`;
            } else {
                console.log(`[AgenticLoop] ✅ No new tool calls. Task finished.`);
                // Jeśli nie użył wtyczki, to znaczy, że przemyślał sprawę i jest gotów udzielić finalnej odpowiedzi
                break;
            }
        }

        if (iteration >= this.MAX_ITERATIONS) {
            console.warn(`[AgenticLoop] ⚠️ Loop interrupted due to step limit (MAX_ITERATIONS).`);
        }

        // 4. Na samym końcu, gdy pętla się skończy, każemy głównemu serwisowi wygenerować ładną odpowiedź dla Ciebie
        return await BrainInteractionService.generateFinalResponse(botName, userMessage, brain);
    }
}
