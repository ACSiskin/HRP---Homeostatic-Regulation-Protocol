// src/core/brain/mcp-manager.ts
import { Database } from 'better-sqlite3';
import { getBotDatabase } from '../db';
import { randomUUID } from 'crypto';

// ZMIANA: Dodano 'PLUGIN' do listy obsługiwanych protokołów
export type ProtocolType = 'MCP' | 'REST_API' | 'LOCAL_SHELL' | 'PLUGIN';

export interface MCPServer {
    id: string;
    name: string;
    description: string; 
    customHeaders: string; // Sekrety i klucze API ukryte przed LLM
    urlOrCommand: string;  // W przypadku wtyczek to nazwa wtyczki, np. "system_coder"
    protocolType: ProtocolType;
    status: 'ONLINE' | 'OFFLINE' | 'ERROR';
    energyCost: number;
    autoApprove: boolean;
}

export class MCPManager {
    private botName: string;
    private db: Database;

    constructor(botName: string) {
        this.botName = botName;
        this.db = getBotDatabase(botName);
        this.initTable();
    }

    /**
     * Inicjalizacja izolowanej tabeli narzędzi z Auto-Migracją.
     */
    private initTable() {
        // Tworzenie tabeli, jeśli nie istnieje
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mcp_servers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                customHeaders TEXT DEFAULT '',
                urlOrCommand TEXT NOT NULL,
                status TEXT DEFAULT 'OFFLINE',
                energyCost INTEGER DEFAULT 15,
                autoApprove INTEGER DEFAULT 0,
                protocolType TEXT DEFAULT 'MCP'
            );
        `);

        // BEZPIECZNA MIGRACJA: Dodanie nowych kolumn do starych baz
        try {
            const cols = this.db.prepare("PRAGMA table_info(mcp_servers)").all() as any[];
            if (!cols.some(c => c.name === 'protocolType')) {
                console.log(`[MCPManager] 🛠️ Migrating DB for ${this.botName}: Adding 'protocolType'`);
                this.db.exec("ALTER TABLE mcp_servers ADD COLUMN protocolType TEXT DEFAULT 'MCP'");
            }
            if (!cols.some(c => c.name === 'description')) {
                console.log(`[MCPManager] 🛠️ Migrating DB for ${this.botName}: Adding 'description'`);
                this.db.exec("ALTER TABLE mcp_servers ADD COLUMN description TEXT DEFAULT ''");
            }
            if (!cols.some(c => c.name === 'customHeaders')) {
                console.log(`[MCPManager] 🛠️ Migrating DB for ${this.botName}: Adding 'customHeaders' (Hidden Secrets)`);
                this.db.exec("ALTER TABLE mcp_servers ADD COLUMN customHeaders TEXT DEFAULT ''");
            }
        } catch (e) {
            console.error(`[MCPManager] Migration Error for ${this.botName}:`, e);
        }
    }

    /**
     * Zwraca listę wszystkich serwerów/narzędzi.
     */
    public getServers(): MCPServer[] {
        const rows = this.db.prepare('SELECT * FROM mcp_servers').all() as any[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description || '',
            customHeaders: row.customHeaders || '',
            urlOrCommand: row.urlOrCommand,
            protocolType: (row.protocolType as ProtocolType) || 'MCP',
            status: row.status,
            energyCost: row.energyCost,
            autoApprove: row.autoApprove === 1
        }));
    }

    /**
     * Rejestruje nowe narzędzie z uwzględnieniem opisu/schemy i ukrytych nagłówków.
     */
    public addServer(
        name: string, 
        description: string,
        customHeaders: string,
        urlOrCommand: string, 
        energyCost: number = 15, 
        autoApprove: boolean = false,
        protocolType: ProtocolType = 'MCP'
    ): MCPServer {
        const id = randomUUID();
        const stmt = this.db.prepare(`
            INSERT INTO mcp_servers (id, name, description, customHeaders, urlOrCommand, status, energyCost, autoApprove, protocolType)
            VALUES (@id, @name, @description, @customHeaders, @urlOrCommand, 'OFFLINE', @energyCost, @autoApprove, @protocolType)
        `);
        
        stmt.run({
            id,
            name,
            description,
            customHeaders,
            urlOrCommand,
            energyCost,
            autoApprove: autoApprove ? 1 : 0,
            protocolType
        });

        return { id, name, description, customHeaders, urlOrCommand, protocolType, status: 'OFFLINE', energyCost, autoApprove };
    }

    /**
     * Aktualizuje parametry narzędzia.
     */
    public updateServerConfig(id: string, updates: Partial<MCPServer>): void {
        const current = this.getServer(id);
        if (!current) throw new Error(`Tool with id ${id} not found.`);

        const stmt = this.db.prepare(`
            UPDATE mcp_servers 
            SET name = @name, 
                description = @description,
                customHeaders = @customHeaders,
                urlOrCommand = @urlOrCommand, 
                status = @status, 
                energyCost = @energyCost, 
                autoApprove = @autoApprove,
                protocolType = @protocolType
            WHERE id = @id
        `);

        stmt.run({
            id,
            name: updates.name ?? current.name,
            description: updates.description ?? current.description,
            customHeaders: updates.customHeaders ?? current.customHeaders,
            urlOrCommand: updates.urlOrCommand ?? current.urlOrCommand,
            status: updates.status ?? current.status,
            energyCost: updates.energyCost ?? current.energyCost,
            autoApprove: (updates.autoApprove ?? current.autoApprove) ? 1 : 0,
            protocolType: updates.protocolType ?? current.protocolType
        });
    }

    /**
     * Usuwa narzędzie.
     */
    public removeServer(id: string): void {
        this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
    }

    /**
     * Pobiera pojedyncze narzędzie.
     */
    public getServer(id: string): MCPServer | null {
        const row = this.db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as any;
        if (!row) return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description || '',
            customHeaders: row.customHeaders || '',
            urlOrCommand: row.urlOrCommand,
            protocolType: (row.protocolType as ProtocolType) || 'MCP',
            status: row.status,
            energyCost: row.energyCost,
            autoApprove: row.autoApprove === 1
        };
    }

    public setServerStatus(id: string, status: 'ONLINE' | 'OFFLINE' | 'ERROR'): void {
        this.db.prepare('UPDATE mcp_servers SET status = ? WHERE id = ?').run(status, id);
    }
}
