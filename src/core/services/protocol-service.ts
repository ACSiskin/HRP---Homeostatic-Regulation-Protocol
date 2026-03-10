// src/core/services/protocol-service.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { MCPManager, MCPServer } from '../brain/mcp-manager';

// ZMIANA 1: Importujemy nasz nowy centralny serwis wtyczek
import { PluginService } from './plugin-service';

const execAsync = promisify(exec);

export class ProtocolService {
    private mcpManager: MCPManager;

    constructor(private botName: string) {
        this.mcpManager = new MCPManager(botName);
    }

    /**
     * Główny punkt wejścia dla Systemu 2. 
     * Wykonuje narzędzie na podstawie jego konfiguracji w bazie protokołów.
     */
    public async executeTool(toolId: string, params: any = {}): Promise<string> {
        const tool = this.mcpManager.getServer(toolId);
        
        if (!tool) {
            return `[ERROR] Tool execution failed. Tool ID '${toolId}' not found or disconnected.`;
        }

        console.log(`[ProtocolService] ⚙️ Executing tool: ${tool.name} via ${tool.protocolType}`);

        try {
            switch (tool.protocolType) {
                // ZMIANA 2: Dodano przekierowanie do systemu izolowanych wtyczek (Workspace)
                case 'PLUGIN':
                    // W urlOrCommand przechowujemy nazwę wtyczki (np. "system_coder")
                    return await PluginService.runPlugin(this.botName, tool.urlOrCommand, params);
                
                case 'REST_API':
                    return await this.executeRestApi(tool, params);
                
                case 'LOCAL_SHELL':
                    return await this.executeLocalShell(tool, params);
                
                case 'MCP':
                default:
                    return await this.executeMcp(tool, params);
            }
        } catch (error: any) {
            console.error(`[ProtocolService] ❌ Error executing ${tool.name}:`, error.message);
            return `[ERROR] Tool execution failed: ${error.message}`;
        }
    }

    /**
     * ADAPTER 1: REST API (Standardowe wywołania HTTP)
     */
    private async executeRestApi(tool: MCPServer, params: any): Promise<string> {
        const method = params?.method || 'POST';
        const headers = { 'Content-Type': 'application/json', ...(params?.headers || {}) };
        const body = method !== 'GET' ? JSON.stringify(params?.body || params) : undefined;

        const response = await fetch(tool.urlOrCommand, { method, headers, body });
        const data = await response.text();
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${data}`);
        return `[REST_API RESPONSE] ${data}`;
    }

    /**
     * ADAPTER 2: LOCAL SHELL (Uruchamianie skryptów systemowych Bash/Python z zabezpieczeniami)
     */
    private async executeLocalShell(tool: MCPServer, params: any): Promise<string> {
        let args = '';

        if (params?.args) {
             if (typeof params.args === 'string') {
                 args = params.args;
             } else if (Array.isArray(params.args)) {
                 args = params.args.join(' ');
             } else {
                 args = Object.values(params.args).join(' ');
             }

             if (tool.urlOrCommand.includes('python3 -c') || tool.urlOrCommand.includes('python -c')) {
                 const escapedCode = args.replace(/"/g, '\\"');
                 args = `"${escapedCode}"`;
             }
        }

        const fullCommand = `${tool.urlOrCommand} ${args}`.trim();
        
        try {
            const { stdout, stderr } = await execAsync(fullCommand);
            if (stderr) console.warn(`[LOCAL_SHELL WARN]`, stderr);
            return `[SHELL RESPONSE]\n${stdout.trim()}`;
        } catch (error: any) {
            console.error(`[LOCAL_SHELL ERROR]`, error.message);
            return `[SHELL ERROR] Execution failed:\n${error.message}`;
        }
    }

    /**
     * ADAPTER 3: MCP (Anthropic Model Context Protocol)
     * Uproszczona implementacja JSON-RPC over HTTP.
     */
    private async executeMcp(tool: MCPServer, params: any): Promise<string> {
        const payload = {
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
                name: tool.name,
                arguments: params
            },
            id: Date.now()
        };

        const response = await fetch(tool.urlOrCommand, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return `[MCP RESPONSE] ${JSON.stringify(data.result)}`;
    }
}
