// src/core/brain/system-two.ts
import OpenAI from 'openai';
import { MentalState, Drives, SystemTwoPlan } from '../types';
import { SystemOneResult } from './system-one';
import { MCPManager } from './mcp-manager';

export interface SystemTwoResult extends SystemTwoPlan {
    rationale: string;
    intention: string;
    action: 'USE_TOOL' | 'RESPOND' | 'WAIT';
    toolPayload?: {
        toolId: string;
        command: any; // <--- ZMIANA: 'any' (obiekt JSON) zamiast 'string', żeby LLM mógł słać parametry!
    };
    updatedDrives?: Partial<Drives>;
}

export class SystemTwo {
    private openai: OpenAI;
    private mcpManager: MCPManager;
    private botName: string;

    constructor(botName: string) {
        this.botName = botName;
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.mcpManager = new MCPManager(botName); // Dostęp do narzędzi ToolBoxa
    }

    /**
     * Głęboka refleksja i planowanie.
     * Uruchamiana przez Metakontrolę, gdy spada Dominance lub zawodzi System 1.
     */
    async reflectAndPlan(
        stimulus: string,
        s1Result: SystemOneResult,
        state: MentalState,
        drives: Drives,
        contextInfo: string = ""
    ): Promise<SystemTwoResult> {
        
        // 1. Pobranie dostępnych narzędzi bota (tylko te o statusie innym niż ERROR)
        const availableTools = this.mcpManager.getServers().filter(t => t.status !== 'ERROR');
        
        // NOWOŚĆ: Wstrzykujemy `t.description` do listy, którą widzi AI
        const toolsList = availableTools.length > 0 
            ? availableTools.map(t => `- ID: "${t.id}" | Protocol: ${t.protocolType} | Name: ${t.name}\n  SCHEMA/DESC: ${t.description}\n  ENERGY COST: ${t.energyCost}%`).join('\n\n')
            : 'No external tools available in the ToolBox.';

        // 2. Prompt Kognitywny (Język Angielski dla lepszej precyzji LLM)
        const prompt = `
            You are System 2 (slow, analytical, deep thinking) for an autonomous AI agent named ${this.botName}.
            System 1 handed over control to you because deep reflection, troubleshooting, or the use of external tools is required.

            [EXTERNAL STIMULUS / PROBLEM]:
            "${stimulus}"

            [ADDITIONAL CONTEXT]:
            ${contextInfo}

            [PSYCHOPHYSICAL STATE (HRP - Homeostatic Regulation Protocol)]:
            - Energy Level: ${state.energy.toFixed(0)}% (If below 20%, avoid heavy tasks and prioritize rest)
            - Arousal (Stress/Tension): ${(state.mood.arousal * 100).toFixed(0)}%
            - Dominance (Sense of Control): ${(state.mood.dominance * 100).toFixed(0)}%

            [AVAILABLE PROTOCOLS/TOOLS]:
            ${toolsList}

            TASK:
            Analyze the problem and create an action plan. If you need to acquire data or execute a system action, 
            you can use a tool (action: "USE_TOOL"). Remember that using a tool consumes the agent's Energy.
            If you are too exhausted, recommend resting (action: "WAIT").
            If you just need to respond directly without tools, use (action: "RESPOND").

            CRITICAL: Read the SCHEMA/DESC of the tool carefully to know exactly what 'command' JSON you need to send.
            - If using a REST_API tool, 'command' must match the required API format.
            - If using LOCAL_SHELL, 'command' must be {"args": ["value"]}.
            - If using MCP, 'command' must match the required arguments schema exactly as described in SCHEMA/DESC.

            RETURN ONLY VALID JSON MATCHING THIS STRUCTURE:
            {
                "goal": "Short description of the goal (e.g., Fetch profile data)",
                "steps": ["Step 1", "Step 2"],
                "expectedOutcome": "What you aim to achieve",
                "rationale": "YOUR INNER MONOLOGUE. This will be visible in Cognitive Telemetry for the admin. Write down your thought process and deduction here.",
                "intention": "Short status message",
                "action": "USE_TOOL" | "RESPOND" | "WAIT",
                "toolPayload": {
                    "toolId": "tool_id_from_the_list_above (optional, only if USE_TOOL)",
                    "command": { "location": "Tokyo" } // MUST be a JSON object matching the SCHEMA/DESC!
                },
                "requiredResources": {
                    "energy": 15,
                    "timeSeconds": 10
                }
            }
        `;

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o", // Głębsza refleksja wymaga najlepszego modelu
                messages: [{ role: "system", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2 // Niska temperatura dla myślenia analitycznego
            });

            const result = JSON.parse(completion.choices[0].message.content || "{}");

            return {
                goal: result.goal || "No goal defined",
                steps: result.steps || [],
                expectedOutcome: result.expectedOutcome || "None",
                requiredResources: result.requiredResources || { energy: 5, timeSeconds: 5 },
                rationale: result.rationale || "[SYS-2] Analysis failed. Logical error.",
                intention: result.intention || "Waiting",
                action: result.action || 'WAIT',
                toolPayload: result.toolPayload
            };

        } catch (e: any) {
            console.error(`[System 2] Cognitive overload:`, e.message);
            // Fallback (zabezpieczenie przed przerwaniem The Instance Life Loop)
            return {
                goal: "Core protection",
                steps: ["Halt process", "Report error"],
                expectedOutcome: "Instance survival",
                requiredResources: { energy: 1, timeSeconds: 1 },
                rationale: `[SYS-2] Cognitive processor overload. Error: ${e.message}`,
                intention: "Emergency reflection shutdown.",
                action: 'WAIT'
            };
        }
    }
}
