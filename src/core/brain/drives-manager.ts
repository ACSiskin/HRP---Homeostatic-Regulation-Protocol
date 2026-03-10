// src/core/brain/drives-manager.ts
import { Database } from 'better-sqlite3';
import { getBotDatabase } from '../db';
import { Drives, Temperament } from '../types';

export class DrivesManager {
    private botName: string;
    private db: Database;

    constructor(botName: string) {
        this.botName = botName;
        this.db = getBotDatabase(botName);
        this.initTable();
    }

    private initTable() {
        // Tabela instynktów
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS drives (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                curiosity REAL DEFAULT 0.5,
                safety REAL DEFAULT 0.7,
                affiliation REAL DEFAULT 0.5,
                dominance REAL DEFAULT 0.5,
                libido REAL DEFAULT 0.1,
                energy REAL DEFAULT 100
            );
        `);

        // NOWA TABELA: Temperament (Stałe cechy bota)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS temperament (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                sensitivity REAL DEFAULT 1.0,
                reactivity REAL DEFAULT 1.0,
                sociability REAL DEFAULT 1.0,
                libidoScale REAL DEFAULT 1.0,
                analyticalLeaning REAL DEFAULT 1.0
            );
        `);
    }

    async getDrives(): Promise<Drives> {
        const row = this.db.prepare('SELECT * FROM drives WHERE id = 1').get() as any;
        if (!row) {
            const defaults = { curiosity: 0.5, safety: 0.8, affiliation: 0.5, dominance: 0.5, libido: 0.1, energy: 100 };
            this.updateDrives(defaults);
            return defaults;
        }
        return {
            curiosity: row.curiosity,
            safety: row.safety,
            affiliation: row.affiliation,
            dominance: row.dominance,
            libido: row.libido,
            energy: row.energy
        };
    }

    async updateDrives(delta: Partial<Drives>): Promise<Drives> {
        const current = await this.getDrives();
        const updated: Drives = {
            curiosity: Math.max(0, Math.min(1, delta.curiosity ?? current.curiosity)),
            safety: Math.max(0, Math.min(1, delta.safety ?? current.safety)),
            affiliation: Math.max(0, Math.min(1, delta.affiliation ?? current.affiliation)),
            dominance: Math.max(0, Math.min(1, delta.dominance ?? current.dominance)),
            libido: Math.max(0, Math.min(1, delta.libido ?? current.libido)),
            energy: Math.max(0, Math.min(100, delta.energy ?? current.energy))
        };
        this.db.prepare(`
            INSERT OR REPLACE INTO drives (id, curiosity, safety, affiliation, dominance, libido, energy)
            VALUES (1, @curiosity, @safety, @affiliation, @dominance, @libido, @energy)
        `).run(updated);
        return updated;
    }

    // --- TEMPERAMENT HELPERS ---
    async getTemperament(): Promise<Temperament> {
        const row = this.db.prepare('SELECT * FROM temperament WHERE id = 1').get() as any;
        return row ? {
            sensitivity: row.sensitivity,
            reactivity: row.reactivity,
            sociability: row.sociability,
            libidoScale: row.libidoScale,
            analyticalLeaning: row.analyticalLeaning
        } : { sensitivity: 1, reactivity: 1, sociability: 1, libidoScale: 1, analyticalLeaning: 1 };
    }

    async saveTemperament(t: Temperament) {
        this.db.prepare(`
            INSERT OR REPLACE INTO temperament (id, sensitivity, reactivity, sociability, libidoScale, analyticalLeaning)
            VALUES (1, @sensitivity, @reactivity, @sociability, @libidoScale, @analyticalLeaning)
        `).run(t);
    }
}
