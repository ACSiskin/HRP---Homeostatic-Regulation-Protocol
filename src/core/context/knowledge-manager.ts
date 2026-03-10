// src/core/context/knowledge-manager.ts
import OpenAI from 'openai';
import { Database } from 'better-sqlite3';
import { getBotDatabase } from '../db';

// Struktura pojedynczego faktu w bazie wiedzy
export interface KnowledgeItem {
  id: string;
  date: string;       // YYYY-MM-DD
  topic: string;      // np. "Ekonomia", "Technologia"
  summary: string;    // Skondensowana wiedza (1 zdanie)
  source: string;     // Skąd to wiem (np. "Onet", "Rozmowa")
  emotion: string;    // Ślad emocjonalny (np. "ANXIETY", "CURIOSITY")
  importance: number; // 1-10 (używane do zapominania)
  embedding?: string; // Optional column for future vector search
}

export class KnowledgeManager {
  private botName: string;
  private db: Database;
  private openai: OpenAI;

  constructor(botName: string) {
    this.botName = botName;
    this.db = getBotDatabase(botName);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.initTable();
  }

  private initTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge (
         id TEXT PRIMARY KEY,
         date TEXT,
         topic TEXT,
         summary TEXT,
         source TEXT,
         emotion TEXT,
         importance INTEGER,
         embedding TEXT
      );
    `);
  }

  // --- 1. ODCZYT BAZY ---
  async loadKnowledge(): Promise<KnowledgeItem[]> {
    try {
      // Pobierz ostatnie 50 wpisów
      const rows = this.db.prepare(`
            SELECT * FROM knowledge 
            ORDER BY date DESC, importance DESC 
            LIMIT 50
        `).all() as KnowledgeItem[];
      return rows;
    } catch (error) {
      console.error("Failed to load knowledge:", error);
      return [];
    }
  }

  // --- 3. UCZENIE SIĘ (Kompresja na wejściu) ---
  // To wywołujesz, gdy bot przeczyta ciekawy artykuł.
  // Zamiast zapisać cały tekst, AI tworzy "Notatkę".
  async learn(rawText: string, source: string, contextTopic: string) {
    console.log(`[Knowledge] ${this.botName} przetwarza nową wiedzę...`);

    const prompt = `
      Jesteś filtrem pamięci długotrwałej.
      Przeanalizuj poniższy tekst i stwórz 1 wpis do bazy wiedzy.
      
      TEKST: "${rawText.substring(0, 1500)}..."
      
      Zwróć TYLKO JSON w formacie:
      {
        "summary": "Jedno zdanie podsumowania faktu (nie newsa, ale faktu).",
        "topic": "Kategoria (np. ${contextTopic})",
        "emotion": "Dominująca emocja (np. FEAR, JOY, INTEREST)",
        "importance": (liczba 1-10, gdzie 10 to przełomowe odkrycie)
      }
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Tu wystarczy tani model
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      if (!result.summary) return; // Błąd generowania

      const newItem: KnowledgeItem = {
        id: Math.random().toString(36).substring(7),
        date: new Date().toISOString().split('T')[0],
        topic: result.topic || "General",
        summary: result.summary,
        source: source,
        emotion: result.emotion || "NEUTRAL",
        importance: result.importance || 5
      };

      // Zapis do SQLite
      this.db.prepare(`
        INSERT OR REPLACE INTO knowledge (id, date, topic, summary, source, emotion, importance, embedding)
        VALUES (@id, @date, @topic, @summary, @source, @emotion, @importance, @embedding)
      `).run({ ...newItem, embedding: null });

      console.log(`[Knowledge] Zapisano fakt: [${newItem.topic}] ${newItem.summary}`);

    } catch (e) {
      console.error("Learning failed:", e);
    }
  }

  // --- 4. SEN (KONSOLIDACJA I PORZĄDKOWANIE) ---
  // To uruchamiasz w nocy. Łączy fakty, usuwa duplikaty.
  async consolidate() {
    const db = await this.loadKnowledge();
    if (db.length < 5) return "Zbyt mało wiedzy do konsolidacji.";

    console.log(`[Knowledge] Rozpoczynam sen i porządkowanie wiedzy (${db.length} wpisów)...`);

    // Serializujemy wiedzę do tekstu, żeby GPT to przeczytał
    const memoryDump = db.map(i => `- [${i.date}] (${i.topic}) ${i.summary} [Emo: ${i.emotion}]`).join("\n");

    const prompt = `
      Jesteś "Hipokampem" - procesem konsolidacji pamięci podczas snu.
      Oto surowe fakty, które bot zapamiętał:
      
      ${memoryDump}
      
      ZADANIE:
      1. Usuń duplikaty (jeśli 3 wpisy mówią o tym samym, zrób z nich 1).
      2. Usuń stare i mało ważne wpisy (garbage collection).
      3. Połącz powiązane fakty w głębsze wnioski (Synteza).
      4. Zachowaj format JSON listy obiektów (id, date, topic, summary, source, emotion, importance).
      5. Zwróć nową, oczyszczoną listę (max 20 najważniejszych wpisów).
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // Tu potrzebny mądry model
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" }
      });

      // Oczekujemy struktury { "items": [...] } lub tablicy
      const raw = JSON.parse(completion.choices[0].message.content || "{}");
      const optimizedDB = raw.items || raw.knowledge || raw;

      if (Array.isArray(optimizedDB)) {
        // Transactional update
        const insert = this.db.prepare(`
            INSERT OR REPLACE INTO knowledge (id, date, topic, summary, source, emotion, importance, embedding)
            VALUES (@id, @date, @topic, @summary, @source, @emotion, @importance, @embedding)
         `);

        const deleteOld = this.db.prepare('DELETE FROM knowledge');

        // Wykonaj w transakcji
        this.db.transaction(() => {
          deleteOld.run();
          for (const item of optimizedDB) {
            insert.run({ ...item, embedding: null });
          }
        })();

        console.log(`[Knowledge] Sen zakończony. Zredukowano wiedzę z ${db.length} do ${optimizedDB.length} wpisów.`);
        return `Przetworzono wspomnienia. Wiedza skonsolidowana.`;
      }

      return "Błąd struktury danych po śnie.";

    } catch (e) {
      console.error("Consolidation error:", e);
      return "Koszmar (błąd API).";
    }
  }
}
