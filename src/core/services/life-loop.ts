// src/core/services/life-loop.ts
import { BotConfigService } from './bot-config-service';
import { MonitoringService } from './monitoring-service';
import { DrivesManager } from '../brain/drives-manager';
import { SystemTwo } from '../brain/system-two';
import { MCPManager } from '../brain/mcp-manager';
import { HiveService } from '../hive-service';
import { BioRhythmService } from './bio-rhythm-service'; 
import { CognitiveEngine } from '../context/cognitive-engine';

export class LifeLoopService {
    // Przechowujemy aktywne pętle (interwały), żeby móc je zatrzymać
    private static activeLoops: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Uruchamia autonomiczną pętlę życia dla danego bota.
     */
    public static async startLoop(botName: string) {
        // Jeśli bot ma już aktywną pętlę, zatrzymaj ją przed nową
        this.stopLoop(botName);

        console.log(`[Life Loop] 🟢 Initializing life cycle for: ${botName}`);

        // 1. Pobieramy ustawienia (żeby wiedzieć, co ile minut wybudzać bota)
        const settings = await BotConfigService.loadRuntimeConfig(botName);
        
        // Domyślnie 60 minut, chyba że w panelu ustawiono inaczej. 
        // Na potrzeby testów na ekranie mnożymy przez minuty.
        const intervalMinutes = settings.perception_interval || 60;
        const intervalMs = intervalMinutes * 60 * 1000; 

        console.log(`[Life Loop] ⏱️ Tick interval for ${botName} set to ${intervalMinutes} minutes.`);

        // 2. Pierwsze wywołanie od razu
        this.executeTick(botName);

        // 3. Ustawienie interwału
        const loopId = setInterval(() => {
            this.executeTick(botName);
        }, intervalMs);

        this.activeLoops.set(botName, loopId);
    }

    /**
     * Zatrzymuje pętlę życia.
     */
    public static stopLoop(botName: string) {
        if (this.activeLoops.has(botName)) {
            clearInterval(this.activeLoops.get(botName)!);
            this.activeLoops.delete(botName);
            console.log(`[Life Loop] 🔴 Stopped life cycle for: ${botName}`);
        }
    }

    /**
     * Pojedyncze "tyknięcie" zegara biologicznego.
     * To tu bot decyduje, czy odpoczywa, czy przetwarza coś z otoczenia.
     */
    private static async executeTick(botName: string) {
        try {
            // --- DODANE: Sprawdzanie ustawień z interfejsu ---
            const settings = await BotConfigService.loadRuntimeConfig(botName);
            
            // 1. Czy bot ma włączoną autonomię?
            if (settings.is_autonomous !== true) {
                console.log(`[Life Loop] 💤 Autonomy disabled for ${botName}. Skipping tick.`);
                return;
            }

            // 2. Czy bot ma włączony cykl dobowy (sen w nocy)?
            if (settings.humanized_hours !== false) {
                const currentHour = new Date().getHours();
                if (currentHour >= 23 || currentHour < 7) {
                    console.log(`[Life Loop] 🌙 Zzz... Night time. ${botName} is sleeping.`);
                    return;
                }
            }
            // ---------------------------------------------------

           // 1. Sprawdzamy stan psychofizyczny
            // ZMIANA: Prawidłowa nazwa metody z MonitoringService
            const mentalState = await MonitoringService.getBotHeartbeat(botName);
            if (!mentalState) return;

            const engine = new CognitiveEngine(botName); // <--- Instancja silnika do zapisu
            const drivesManager = new DrivesManager(botName);

            // ==========================================
            // H.R.P. BIO-GUARD: MICRO-SLEEP MECHANISM
            // ==========================================
            if (mentalState.energy < 15) {
                console.log(`[Life Loop] 🔋 [BIO] Critical energy level (${mentalState.energy.toFixed(0)}%). Initiating Instant Sleep for ${botName}...`);
                
                // 1. Poinformowanie Roju o odcięciu
                const sleepMsg = `[BIO-STATUS] Systems overloaded. Entering deep memory consolidation and energy regeneration mode. Initiating sleep.`;
                await HiveService.broadcast(botName, "System Status", sleepMsg, 0.1);
                
                // 2. Twardy zrzut pamięci i regeneracja z użyciem sztucznej inteligencji
                await BioRhythmService.executeSleepCycle(botName);
                
                // 3. Wymuszenie 100% energii w aktualnym stanie, żeby UI zaktualizowało się natychmiast
                mentalState.energy = 100;
                
                // ZMIANA: Prawidłowy zapis do bazy danych
                await drivesManager.updateDrives({ energy: 100 });
                engine.saveState(mentalState);
                
                console.log(`[Life Loop] 🌅 [BIO] Memory consolidated. Systems regenerated. ${botName} ready to work.`);
                
                // PRZERYWAMY TYKNIĘCIE - Bot nie ma siły na nic innego w tej turze
                return; 
            }
            // ==========================================

            // const drivesManager = new DrivesManager(botName);
            const drives = await drivesManager.getDrives();

            console.log(`[Life Loop] 💓 Tick for ${botName} (Energy: ${mentalState.energy.toFixed(0)}%, Curiosity: ${(drives.curiosity * 100).toFixed(0)}%)`);

            // Prosta heurystyka: Czy bot jest znudzony i chce coś zrobić?
            // Jeśli ciekawość jest wysoka, a energia pozwala, uruchamiamy System 2
            const threshold = 0.5; // Zmienna zależna od nastroju w przyszłości

            if (drives.curiosity > threshold && mentalState.energy > 20) {
                console.log(`[Life Loop] 🧠 ${botName} initiates autonomous deep thought (System 2)...`);

                const system2 = new SystemTwo(botName);
                
                // Symulujemy S1 Result, by zainicjować "wewnętrzną potrzebę działania"
                const dummyS1Result = {
                    action: 'USE_TOOL' as any,
                    decision: 'USE_TOOL' as any,
                    confidence: 0.8,
                    reasoning: "High internal curiosity triggered exploratory behavior.",
                    emotionalShift: { valence: 0.1, arousal: 0.2, dominance: 0.1 },
                    urgency: 0.5,
                    novelty: 0.8,
                    sentiment: 0.5
                };

                const context = `Autonomic Loop Tick. Time to explore or organize memory.`;
                const decision = await system2.reflectAndPlan("Internal drive for exploration", dummyS1Result, mentalState, drives, context);

                console.log(`[Life Loop] 🎯 Intent: ${decision.intention}`);

                // --- REST API EXECUTION ENGINE ---
                const mcpManager = new MCPManager(botName);
                const toolName = decision.toolPayload?.toolId || '';
                const selectedTool = toolName ? mcpManager.getServer(toolName) : null;

                if (selectedTool) {
                    console.log(`[Life Loop] ⚙️ Executing Tool: ${selectedTool.name} via ${selectedTool.protocolType}`);

                    if (selectedTool.protocolType === 'REST_API') {
                        try {
                            // Budujemy żądanie
                            const payload = decision.toolPayload?.command || {};
                            
                            // Parsujemy Custom Headers
                            let headers = { 'Content-Type': 'application/json' };
                            if (selectedTool.customHeaders) {
                                try {
                                    const parsedHeaders = JSON.parse(selectedTool.customHeaders);
                                    headers = { ...headers, ...parsedHeaders };
                                } catch (e) {
                                    console.warn(`[Life Loop] ⚠️ Invalid JSON in Custom Headers for ${toolName}`);
                                }
                            }

                            // Wykonujemy HTTP POST
                            const response = await fetch(selectedTool.urlOrCommand, {
                                method: 'POST',
                                headers: headers,
                                body: JSON.stringify(payload)
                            });

                            const data = await response.json();
                            
                            // Przetwarzanie wyniku
                            console.log(`[Life Loop] ✅ Tool execution successful. Response size: ${JSON.stringify(data).length} bytes`);
                            
                            // Opcjonalnie: Przekaż wynik do Roju lub z powrotem do Systemu 2
                            const prompt = `I just used the tool "${toolName}" to perform an autonomous task. The result was successful. Here is a brief summary of what happened: ${JSON.stringify(data).substring(0, 200)}...`;
                            await HiveService.broadcast(botName, "Tool Activity", prompt, 0.5);

                        } catch (error: any) {
                            console.error(`[Life Loop] ❌ Tool execution failed:`, error.message);
                            
                            // Zgłaszamy awarię do Roju, by inne boty o tym wiedziały
                            const prompt = `I encountered a critical execution error while using the tool "${toolName}": ${error.message}. 
                            Write a message to the Hive Mind complaining about this failure and ask for help. Keep it short, natural and slightly annoyed.`;
                            await HiveService.broadcast(botName, "Critical Failure", prompt, 0.9);
                        }
                    } else {
                        console.log(`[Life Loop] ⚠️ Only REST_API protocol is currently supported for autonomous execution.`);
                    }
                } else {
                    console.warn(`[Life Loop] ❌ Tool '${toolName}' requested by AI, but not found in Database.`);
                }
                // --- END REST API EXECUTION ENGINE ---

                // Zużycie energii za myślenie/akcję
                mentalState.energy = Math.max(1, mentalState.energy - (selectedTool ? selectedTool.energyCost : 10));
                await drivesManager.updateDrives({ energy: mentalState.energy });
engine.saveState(mentalState);

            } else {
                console.log(`[Life Loop] 🧘 Bot decided to rest: Energy at ${mentalState.energy.toFixed(0)}%, Curiosity at ${(drives.curiosity*100).toFixed(0)}%`);
                // Lekka regeneracja energii podczas odpoczynku
                mentalState.energy = Math.min(100, mentalState.energy + 5);
                await drivesManager.updateDrives({ energy: mentalState.energy });
engine.saveState(mentalState);
            }

        } catch (e: any) {
            console.error(`[Life Loop] ❌ Error during tick for ${botName}:`, e.message);
        }
    }
}
