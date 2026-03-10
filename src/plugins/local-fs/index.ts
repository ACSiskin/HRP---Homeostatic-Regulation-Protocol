// src/plugins/local-fs/index.ts
import { BasePlugin, PluginResponse } from '../base-plugin';
import fs from 'fs/promises';
import path from 'path';

export class LocalFSPlugin extends BasePlugin {
    readonly name = "local_fs";
    
    // Jasna instrukcja dla Systemu 2, jak korzystać z wtyczki
    readonly description = "Reads files or lists directory contents within your secure workspace. " +
                           "Requires a JSON payload with 'action' ('read' or 'list') and 'targetPath' (e.g., '.', 'data.csv', 'output/logs.txt'). " +
                           "Use this to inspect files you generated or to read data before processing it.";

    async execute(botName: string, args: any): Promise<PluginResponse> {
        const startTime = Date.now();

        try {
            if (!args || typeof args !== 'object') {
                throw new Error("Invalid arguments format. Expected a JSON object.");
            }

            const action = args.action;
            const targetPath = args.targetPath || '.';

            if (action !== 'read' && action !== 'list') {
                throw new Error("Invalid 'action'. Must be 'read' or 'list'.");
            }

            // 1. Budowa ścieżki do bezpiecznego obszaru roboczego
            const safeBotName = botName.toLowerCase().replace(/\s+/g, '-');
            const workspaceDir = path.resolve(process.cwd(), 'bots', safeBotName, 'workspace');
            
            // Upewniamy się, że workspace istnieje
            await fs.mkdir(workspaceDir, { recursive: true });

            // 2. Bezpieczne łączenie ścieżek (Sandboxing)
            const absoluteTargetPath = path.resolve(workspaceDir, targetPath);

            // Zabezpieczenie przed Directory Traversal (np. targetPath: "../../../../etc/passwd")
            if (!absoluteTargetPath.startsWith(workspaceDir)) {
                this.error(`Security breach attempt! Blocked access to: ${targetPath}`);
                throw new Error("ACCESS DENIED: You are restricted to your workspace directory.");
            }

            let output = "";

            // 3. Wykonywanie akcji
            if (action === 'list') {
                this.log(`Listing directory: ${targetPath}`);
                const stats = await fs.stat(absoluteTargetPath);
                
                if (!stats.isDirectory()) {
                    throw new Error(`Target '${targetPath}' is not a directory.`);
                }
                
                const files = await fs.readdir(absoluteTargetPath, { withFileTypes: true });
                const fileList = files.map(dirent => {
                    return `${dirent.isDirectory() ? '[DIR]' : '[FILE]'} ${dirent.name}`;
                });
                
                output = fileList.length > 0 ? fileList.join('\n') : "(Directory is empty)";
                
            } else if (action === 'read') {
                this.log(`Reading file: ${targetPath}`);
                const stats = await fs.stat(absoluteTargetPath);
                
                if (!stats.isFile()) {
                    throw new Error(`Target '${targetPath}' is not a file.`);
                }
                
                // Zabezpieczenie przed czytaniem gigantycznych plików (powyżej 5MB)
                if (stats.size > 5 * 1024 * 1024) {
                    throw new Error(`File is too large to read into memory (${(stats.size / 1024 / 1024).toFixed(2)} MB). Maximum is 5 MB.`);
                }

                output = await fs.readFile(absoluteTargetPath, 'utf-8');
            }

            const executionTime = Date.now() - startTime;

            return {
                success: true,
                output: output,
                metadata: {
                    executionTimeMs: executionTime,
                    action: action,
                    targetPath: targetPath
                }
            };

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            this.warn(`FS operation failed: ${error.message}`);

            return {
                success: false,
                output: "File system operation failed.",
                error: error.message || String(error),
                metadata: {
                    executionTimeMs: executionTime
                }
            };
        }
    }
}
