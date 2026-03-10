// src/core/plugins/tool-forge/index.ts
import { BasePlugin, PluginResponse } from '../base-plugin';
import fs from 'fs/promises';
import path from 'path';
import { addMcpServer } from '../../app/actions';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ToolForgePlugin extends BasePlugin {
    readonly name = "tool_forge";
    
    // WERSJA GOD TIER: Dodane restrykcje bezpieczeństwa do promptu
    readonly description = "Creates a new PERMANENT tool for yourself. " +
                           "Requires JSON: { \"tool_name\": \"name_without_spaces\", \"description\": \"Detailed instructions for yourself on how to use it\", \"code\": \"Python 3 code\" }. " +
                           "CRITICAL INSTRUCTIONS FOR YOU AS A SENIOR DEVELOPER: " +
                           "1. The code MUST be production-ready and fault-tolerant. Use try/except blocks globally. " +
                           "2. DO NOT hallucinate APIs (e.g., api.example.com). If you need internet search, use 'urllib' and 're' to scrape DuckDuckGo HTML without API keys. " +
                           "3. Read arguments safely. Fallback to raw text if json.loads(sys.argv[1]) fails. " +
                           "4. SECURITY RESTRICTION: You are forbidden from using 'os', 'subprocess', 'shutil', or 'pty' modules. " +
                           "5. PERFORMANCE: The script must execute in under 5 seconds (avoid infinite loops). " +
                           "Once forged, the tool is strictly verified (Syntax Check & Dry-Run) and permanently installed.";

    async execute(botName: string, args: any): Promise<PluginResponse> {
        const startTime = Date.now();
        try {
            if (!args.tool_name || !args.description || !args.code) {
                throw new Error("Missing required fields: tool_name, description, or code.");
            }

            const safeToolName = args.tool_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            const code = args.code as string;

            // ==========================================
            // ZABEZPIECZENIE 1: KWARANTANNA MODUŁÓW (SANDBOXING)
            // ==========================================
            const forbiddenModules = ['import os', 'from os', 'import subprocess', 'from subprocess', 'import shutil', 'import pty'];
            for (const module of forbiddenModules) {
                if (code.includes(module)) {
                    throw new Error(`SECURITY VIOLATION: Using system-level module '${module}' is strictly forbidden. Rewrite the code without it.`);
                }
            }

            // Zapisujemy skrypt nowego narzędzia
            const safeBotName = botName.toLowerCase().replace(/\s+/g, '-');
            const workspaceDir = path.join(process.cwd(), 'bots', safeBotName, 'workspace');
            await fs.mkdir(workspaceDir, { recursive: true });

            const filename = `${safeToolName}.py`;
            const filePath = path.join(workspaceDir, filename);
            await fs.writeFile(filePath, code, 'utf-8');
            this.log(`Forged new tool script at ${filePath}`);

            const isWindows = process.platform === 'win32';
            const pythonCmd = isWindows ? 'python' : 'python3';
            
            // ==========================================
            // ZABEZPIECZENIE 2: TEST SKŁADNI
            // ==========================================
            try {
                this.log(`Running syntax check on ${filename}...`);
                await execAsync(`${pythonCmd} -m py_compile "${filePath}"`, { cwd: workspaceDir });
            } catch (syntaxError: any) {
                await fs.unlink(filePath).catch(() => {});
                throw new Error(`SYNTAX ERROR in your Python code! Fix it and try again. Compiler output:\n${syntaxError.stderr || syntaxError.message}`);
            }

            // ==========================================
            // ZABEZPIECZENIE 3: DRY-RUN I STRAŻNIK CZASU
            // ==========================================
            try {
                this.log(`Running Dry-Run test on ${filename}...`);
                // Odpalamy skrypt z pustym JSON-em jako argumentem (żeby sys.argv[1] nie wyrzuciło błędu IndexError)
                // Ustawiamy sztywny limit czasowy (timeout: 5000 ms)
                await execAsync(`${pythonCmd} "${filePath}" "{}"`, { cwd: workspaceDir, timeout: 5000 });
                this.log(`Dry-Run passed successfully for ${filename}.`);
            } catch (runError: any) {
                // Jeśli skrypt wpadnie w nieskończoną pętlę i Node go zabije:
                if (runError.killed || runError.signal === 'SIGTERM') {
                    await fs.unlink(filePath).catch(() => {});
                    throw new Error(`TIMEOUT ERROR: Your code took over 5 seconds to execute (Possible infinite loop). Optimize your logic!`);
                }
                
                // Jeśli skrypt wywalił Runtime Error (np. brak zmiennej, zły import)
                await fs.unlink(filePath).catch(() => {});
                throw new Error(`RUNTIME ERROR: Your code crashed during the dry-run test! Fix the logic. Output:\n${runError.stderr || runError.message}`);
            }

            // Wszystkie testy zaliczone! Wstrzykujemy do bazy
            const command = `${pythonCmd} "${filePath}"`;

            const res = await addMcpServer(
                botName,
                safeToolName,
                args.description,
                "", 
                command, 
                10, 
                true, 
                'LOCAL_SHELL'
            );

            if (!res.success) {
                throw new Error(`Database registration failed: ${res.error}`);
            }

            return {
                success: true,
                output: `SUCCESS! Tool '${safeToolName}' forged, passed all rigorous security checks (Syntax, Dry-Run, Sandboxing), and is now permanently installed. You can now use it.`,
                metadata: { tool_name: safeToolName, executionTimeMs: Date.now() - startTime }
            };

        } catch (error: any) {
            this.warn(`Forge failed: ${error.message}`);
            return {
                success: false,
                output: `FORGE FAILED: ${error.message}\nPlease analyze the error, rewrite your code properly, and try forging again.`,
                error: error.message
            };
        }
    }
}
