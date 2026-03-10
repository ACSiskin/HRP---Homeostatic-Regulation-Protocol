import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * DATABASE FACTORY
 * Zwraca instancję bazy danych dla konkretnego bota.
 * Automatycznie tworzy katalog jeśli nie istnieje.
 */
export function getBotDatabase(botName: string): Database.Database {
    const sanitizedBotName = botName.toLowerCase().replace(/\s+/g, '-');
    const dbDir = path.join(process.cwd(), 'bots', sanitizedBotName);
    const dbPath = path.join(dbDir, 'brain.db');

    // Upewnij się, że katalog istnieje
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Włączamy WAL mode dla lepszej wydajności przy wielu zapisach
    db.pragma('journal_mode = WAL');

    return db;
}
