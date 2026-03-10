// src/plugins/system-coder/index.ts
import { BasePlugin, PluginResponse } from '../base-plugin';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemCoderPlugin extends BasePlugin {
    readonly name = "system_coder";
    
    // Precyzyjny opis dla LLM (System 2), jak i kiedy używać tego narzędzia
    readonly description = "Writes and executes Python 3 scripts in a sandboxed local workspace. " +
                           "Requires a JSON payload with 'filename' (e.g., 'script.py') and 'code' (the raw Python code). " +
                           "Use this for math, data analysis, file system operations, or web scraping. " +
                           "Always output the final result using the print() function.";

    async execute(botName: string, args: any): Promise<PluginResponse> {
        const startTime = Date.now();

        try {
            // 1. Walidacja argumentów wejściowych od LLM
            if (!args || typeof args !== 'object') {
                throw new Error("Invalid arguments format. Expected a JSON object.");
            }

            const filename = args.filename || 'temp_script.py';
            const code = args.code;

            if (!code) {
                throw new Error("Missing 'code' parameter in the payload.");
            }

            // 2. Wykrywanie systemu operacyjnego (Windows vs Linux/Mac)
            const isWindows = process.platform === 'win32';
            const pythonCmd = isWindows ? 'python' : 'python3';

            // 3. Budowa ścieżki do bezpiecznego obszaru roboczego (Workspace)
            const safeBotName = botName.toLowerCase().replace(/\s+/g, '-');
            const workspaceDir = path.join(process.cwd(), 'bots', safeBotName, 'workspace');
            
            // Upewniamy się, że folder workspace istnieje (jeśli nie, tworzymy go)
            await fs.mkdir(workspaceDir, { recursive: true });

            // 4. Zapis kodu do pliku .py
            const filePath = path.join(workspaceDir, filename);
            await fs.writeFile(filePath, code, 'utf-8');

            this.log(`Saved script to workspace: ${filename}`);

            // 5. Egzekucja skryptu
            const command = `${pythonCmd} "${filePath}"`;
            this.log(`Executing: ${command} in CWD: ${workspaceDir}`);

            // ZMIANA TUTAJ: Wymuszamy uruchomienie skryptu wewnątrz folderu workspace!
            const { stdout, stderr } = await execAsync(command, { cwd: workspaceDir });

            const executionTime = Date.now() - startTime;
            this.log(`Execution completed in ${executionTime}ms.`);

            // 6. Zwrócenie ustandaryzowanego wyniku
            return {
                success: true,
                output: stdout.trim() + (stderr ? `\n[Warnings]:\n${stderr.trim()}` : ''),
                metadata: {
                    executionTimeMs: executionTime,
                    osDetected: process.platform,
                    filename: filename
                }
            };

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            this.error(`Execution failed: ${error.message}`);

            return {
                success: false,
                output: "Execution failed.",
                error: error.message || String(error),
                metadata: {
                    executionTimeMs: executionTime
                }
            };
        }
    }
}
