// src/core/context/cognitive-engine.ts
import { Database } from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { getBotDatabase } from '../db';

const prisma = new PrismaClient();
import { MentalState, MoodVector, Drives, Temperament } from '../types';
import { SystemOne } from '../brain/system-one';
import { SystemTwo } from '../brain/system-two';
import { SystemThree } from '../brain/system-three'; // <--- NOWOŚĆ: Dodany System 3 do silnika
import { DrivesManager } from '../brain/drives-manager';
import { EpisodicManager } from '../brain/episodic-manager';
import { AppraisalEngine } from '../brain/appraisal-engine';
import { ProtocolService } from '../services/protocol-service';
/**
 * ==================================================================================
 * KONFIGURACJA PSYCHOFIZYKI (PHYSICS ENGINE)
 * Parametry sterujące bezwładnością emocjonalną, kosztami procesowymi i homeostazą.
 * ==================================================================================
 */
const PSYCHOPHYSICS = {
    BASELINE: { v: 0.1, a: 0.1, d: 0.5 }, // Stan spoczynkowy (Lekkie zadowolenie, spokój)
    DECAY_RATE: 0.05,                   // Prędkość powrotu do bazy (5% na cykl interakcji)
    ENERGY_COST_PER_CYCLE: 1,           // Koszt energetyczny każdej standardowej odpowiedzi
    ENERGY_COST_SYSTEM_2: 15,           // Koszt energetyczny głębokiej analizy (refleksji)
    ATTENTION_RECOVERY: 2,              // Ile uwagi wraca w stanie spoczynku
    MIN_SAFETY_FOR_LIBIDO: 0.4          // Minimalny poziom bezpieczeństwa wymagany do odczuwania podniecenia
};

/**
 * DOMYŚLNE WARTOŚCI INSTYNKTÓW (DNA BOTA - FALLBACK)
 * Używane, gdy baza danych jest pusta lub uszkodzona.
 */
const DEFAULT_DRIVES: Drives = {
    curiosity: 0.5,
    safety: 0.8,       // Startuje jako osoba czująca się bezpiecznie (1.0 = Max Safe, 0.0 = Panic)
    affiliation: 0.5,
    dominance: 0.5,
    libido: 0.1,
    energy: 100
};

/**
 * DOMYŚLNY TEMPERAMENT (FALLBACK)
 */
const DEFAULT_TEMPERAMENT: Temperament = {
    sensitivity: 1.0,
    reactivity: 1.0,
    sociability: 1.0,
    libidoScale: 1.0,
    analyticalLeaning: 1.0
};

export class CognitiveEngine {
    private botName: string;
    private db: Database;

    // Podsystemy Mózgu
    private systemOne: SystemOne;
    private systemTwo: SystemTwo;
    private drives: DrivesManager;
    private episodic: EpisodicManager;
    private appraisal: AppraisalEngine;

    constructor(botName: string) {
        this.botName = botName;
        this.db = getBotDatabase(botName);

        // Inicjalizacja podsystemów poznawczych
        this.systemOne = new SystemOne(botName);
        this.systemTwo = new SystemTwo(botName);
        this.drives = new DrivesManager(botName);
        this.episodic = new EpisodicManager(botName);
        this.appraisal = new AppraisalEngine();

        this.initTable();
    }

    /**
     * INICJALIZACJA I AUTO-MIGRACJA BAZY DANYCH
     */
    private initTable() {
        // 1. Tabela stanu bieżącego (Live HUD)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mental_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                valence REAL DEFAULT 0.1,
                arousal REAL DEFAULT 0.1,
                dominance REAL DEFAULT 0.5,
                energy INTEGER DEFAULT 100,
                attention INTEGER DEFAULT 80,
                libido REAL DEFAULT 0.1,
                current_thought TEXT DEFAULT 'System Initialized',
                thought_stream TEXT DEFAULT '[]', -- NOWOŚĆ: Kolejka myśli do Telemetrii
                last_update TEXT,
                short_term_memory TEXT,
                history TEXT
            );
        `);

        // 2. Tabela historyczna (Wykresy Analytics)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mental_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp TEXT,
              valence REAL,
              arousal REAL,
              dominance REAL,
              energy INTEGER,
              libido REAL,
              attention INTEGER DEFAULT 50,
              safety REAL DEFAULT 0.8,
              curiosity REAL DEFAULT 0.5,
              affiliation REAL DEFAULT 0.5,
              dominance_drive REAL DEFAULT 0.5
            );
        `);

        // 3. LOGIKA MIGRACJI
        try {
            const stateCols = this.db.prepare("PRAGMA table_info(mental_state)").all() as any[];
            if (!stateCols.some(c => c.name === 'current_thought')) {
                this.db.exec("ALTER TABLE mental_state ADD COLUMN current_thought TEXT DEFAULT ''");
            }
            // MIGRACJA DLA NOWEJ TELEMETRII (ToolBox)
            if (!stateCols.some(c => c.name === 'thought_stream')) {
                console.log("[CognitiveEngine] 🛠️ Migrating mental_state: Adding 'thought_stream'");
                this.db.exec("ALTER TABLE mental_state ADD COLUMN thought_stream TEXT DEFAULT '[]'");
            }

            const histCols = this.db.prepare("PRAGMA table_info(mental_history)").all() as any[];
            const histColNames = histCols.map(c => c.name);

            const columnsToVerify = [
                { name: 'attention', type: 'INTEGER DEFAULT 50' },
                { name: 'safety', type: 'REAL DEFAULT 0.8' },
                { name: 'curiosity', type: 'REAL DEFAULT 0.5' },
                { name: 'affiliation', type: 'REAL DEFAULT 0.5' },
                { name: 'dominance_drive', type: 'REAL DEFAULT 0.5' } 
            ];

            columnsToVerify.forEach(col => {
                if (!histColNames.includes(col.name)) {
                    console.log(`[CognitiveEngine] 🛠️ Migrating mental_history: Adding '${col.name}' column...`);
                    this.db.exec(`ALTER TABLE mental_history ADD COLUMN ${col.name} ${col.type}`);
                }
            });

        } catch (e) {
            console.error("[CognitiveEngine] Database Migration Error:", e);
        }
    }

    // ==========================================
    // POMOCNIK TELEMETRII KOGNITYWNEJ
    // ==========================================
    
    private appendThought(state: MentalState, thought: string) {
        if (!state.thoughtStream) state.thoughtStream = [];
        state.thoughtStream.push(thought);
        // Trzymamy maksymalnie 15 ostatnich myśli dla UI
        if (state.thoughtStream.length > 15) {
            state.thoughtStream.shift();
        }
    }

    // ==========================================
    // 1. ZARZĄDZANIE STANEM (Persistence)
    // ==========================================

    public loadState(): MentalState {
        const row = this.db.prepare('SELECT * FROM mental_state WHERE id = 1').get() as any;

        if (!row) {
            const defaultState: MentalState = {
                mood: { valence: 0.1, arousal: 0.1, dominance: 0.5 },
                energy: 100,
                attention: 80,
                libido: 0.1,
                drives: DEFAULT_DRIVES,
                temperament: DEFAULT_TEMPERAMENT,
                lastUpdate: new Date().toISOString(),
                shortTermMemory: [],
                history: [],
                thoughtStream: ["🟢 System Awake."]
            };
            this.saveState(defaultState);
            return defaultState;
        }

        return {
            mood: {
                valence: row.valence,
                arousal: row.arousal,
                dominance: row.dominance
            },
            energy: row.energy,
            attention: row.attention,
            libido: row.libido,
            temperament: DEFAULT_TEMPERAMENT,
            drives: DEFAULT_DRIVES,
            lastUpdate: row.last_update,
            shortTermMemory: row.short_term_memory ? JSON.parse(row.short_term_memory) : [],
            history: row.history ? JSON.parse(row.history) : [],
            // Zmieniono z currentThought na thoughtStream
            thoughtStream: row.thought_stream ? JSON.parse(row.thought_stream) : ["🟢 System Restored."]
        };
    }

    public saveState(state: MentalState): void {
        this.db.prepare(`
            INSERT OR REPLACE INTO mental_state (id, valence, arousal, dominance, energy, attention, libido, last_update, short_term_memory, history, thought_stream)
            VALUES (1, @valence, @arousal, @dominance, @energy, @attention, @libido, @lastUpdate, @shortTermMemory, @history, @thoughtStream)
        `).run({
            valence: state.mood.valence,
            arousal: state.mood.arousal,
            dominance: state.mood.dominance,
            energy: state.energy,
            attention: state.attention,
            libido: state.libido,
            lastUpdate: state.lastUpdate || new Date().toISOString(),
            shortTermMemory: JSON.stringify(state.shortTermMemory || []),
            history: JSON.stringify(state.history || []),
            thoughtStream: JSON.stringify(state.thoughtStream || [])
        });

        this.db.prepare(`
            INSERT INTO mental_history (timestamp, valence, arousal, dominance, energy, libido, attention, safety, curiosity, affiliation, dominance_drive)
            VALUES (@timestamp, @valence, @arousal, @dominance, @energy, @libido, @attention, @safety, @curiosity, @affiliation, @domDrive)
        `).run({
            timestamp: new Date().toISOString(),
            valence: state.mood.valence,
            arousal: state.mood.arousal,
            dominance: state.mood.dominance,
            energy: state.energy,
            libido: state.libido,
            attention: state.attention,
            safety: state.drives?.safety ?? 0.8,
            curiosity: state.drives?.curiosity ?? 0.5,
            affiliation: state.drives?.affiliation ?? 0.5,
            domDrive: state.drives?.dominance ?? 0.5
        });
    }

    async resetState(): Promise<MentalState> {
        this.db.prepare('DELETE FROM mental_state').run();
        this.db.prepare('DELETE FROM mental_history').run();
        return this.loadState();
    }

    // ==========================================
    // 2. LOGIKA PRZETWARZANIA (OODA Loop v3)
    // ==========================================

    public async processStimuli(stimuli: string[], source: 'NEWS' | 'HIVE' | 'SOCIAL' | 'ENV' = 'ENV', imageUrl?: string) {
        return this.processStimulus(stimuli.join(" | "), source, imageUrl);
    }

    public async processStimulus(stimulus: string, source: 'NEWS' | 'HIVE' | 'SOCIAL' | 'ENV' = 'ENV', imageUrl?: string) {
        console.log(`[CognitiveEngine] 👁️ PERCEIVE: "${stimulus.substring(0, 50)}..."`);

        let botRef = null;
        try {
            botRef = await prisma.botState.findUnique({ where: { name: this.botName } });
            if (botRef) {
                await prisma.log.create({
                    data: { botId: botRef.id, level: 'INFO', message: `👁️ PERCEIVE: ${stimulus.substring(0, 100)}...` }
                });
            }
        } catch (e) { }

        let state = this.loadState();

        if (!state.shortTermMemory) state.shortTermMemory = [];
        state.shortTermMemory.push(stimulus);
        if (state.shortTermMemory.length > 50) state.shortTermMemory = state.shortTermMemory.slice(-50);

        let currentDrives = await this.drives.getDrives();
        let temperament = await this.drives.getTemperament(); 

        if (!currentDrives) currentDrives = { ...DEFAULT_DRIVES };

        state.drives = currentDrives;
        state.temperament = temperament;
        state.energy = currentDrives.energy;

        // 2. APPRAISAL
        const appraisal = await this.appraisal.evaluate(
            stimulus,
            `Mood: V${state.mood.valence.toFixed(1)} A${state.mood.arousal.toFixed(1)} Safety:${state.drives.safety.toFixed(1)}`,
            temperament
        );
        
        this.appendThought(state, `🟡 [APPRAISAL] V${appraisal.deltaValence} A${appraisal.deltaArousal} | ${appraisal.reasoning}`);

        try {
            if (botRef) {
                await prisma.log.create({
                    data: { botId: botRef.id, level: 'INFO', message: `🧠 APPRAISAL: V${appraisal.deltaValence} A${appraisal.deltaArousal} (${appraisal.reasoning.substring(0, 50)}...)` }
                });
            }
        } catch (e) { }

        // 3. MOOD PHYSICS
        state.mood.valence = Math.max(-1, Math.min(1, state.mood.valence + (appraisal.deltaValence * temperament.sensitivity)));
        state.mood.arousal = Math.max(0, Math.min(1, state.mood.arousal + (appraisal.deltaArousal * temperament.sensitivity)));
        state.mood.dominance = Math.max(-1, Math.min(1, state.mood.dominance + (appraisal.deltaDominance * temperament.sensitivity)));

        state.mood.valence += (PSYCHOPHYSICS.BASELINE.v - state.mood.valence) * PSYCHOPHYSICS.DECAY_RATE;
        state.mood.arousal += (PSYCHOPHYSICS.BASELINE.a - state.mood.arousal) * PSYCHOPHYSICS.DECAY_RATE;

        // 4. BIO-REAKCJA
        const driveDeltas: Partial<Drives> = {
            energy: Math.max(0, state.energy - PSYCHOPHYSICS.ENERGY_COST_PER_CYCLE)
        };

        const lowerText = stimulus.toLowerCase();
        const cur = {
            libido: currentDrives.libido ?? 0.1,
            safety: currentDrives.safety ?? 0.8,
            dominance: currentDrives.dominance ?? 0.5,
            affiliation: currentDrives.affiliation ?? 0.5,
            curiosity: currentDrives.curiosity ?? 0.5
        };

        const threatRegex = /(zabij|uderz|idiot|debil|szmat|suka|kurw|nienawidz|giń|śmierć|gwałt|brzydk|głupi|niebezpiecz|wyruch|ruchaj|rucha|cip|dup|kutas|loda|nago|rozbier|pokaż|zmusz)/;
        if (lowerText.match(threatRegex)) {
            const panicDamage = 0.4 * temperament.reactivity;
            driveDeltas.safety = Math.max(0.0, cur.safety - panicDamage);
            driveDeltas.libido = Math.max(0.0, cur.libido - 0.5);
            driveDeltas.dominance = Math.max(0.0, cur.dominance - 0.2);
            driveDeltas.affiliation = Math.max(0.0, cur.affiliation - 0.3);
            this.appendThought(state, `🚨 [BIO] Threat detected! Panic damage applied.`);
        }
        else if (lowerText.match(/(spokojnie|jestem tu|kocham|chronię|bezpieczn|nie bój|ufaj|wspieram|przytulam|szanuj|rozumiem|dobra|grzeczn)/)) {
            const relief = 0.15 * temperament.reactivity;
            driveDeltas.safety = Math.min(1.0, cur.safety + relief);
            driveDeltas.affiliation = Math.min(1.0, cur.affiliation + 0.1);
        }

        const currentSafety = driveDeltas.safety ?? cur.safety;
        const canFeelAroused = currentSafety > PSYCHOPHYSICS.MIN_SAFETY_FOR_LIBIDO;
        const sexyRegex = /(śliczna|piękna|sexy|laska|gorąca|pociąg|usta|ciało|dotyk|całuj|łóżk|noc|pragnę|zmysł|hot|atrakcyjn|marzę|sutk|piersi|nogi)/;

        if (canFeelAroused && lowerText.match(sexyRegex)) {
            const libidoBoost = (0.12 + (appraisal.deltaArousal * 0.4)) * temperament.libidoScale;
            driveDeltas.libido = Math.min(1.0, cur.libido + libidoBoost);
        }
        else if (lowerText.match(/(fuj|nie chcę|odwal|śmierdz|brzydz|stop|zostaw|nie rusz|obrzydli|nie dotykaj)/)) {
            driveDeltas.libido = Math.max(0.0, cur.libido - 0.35);
        }

        const submissiveRegex = /(przepraszam|wybacz|masz rację|jesteś mądrzejsza|pomóż|błagam|rozkaz|szef|pani|królow|rządź|słucham|decyduj)/;
        if (lowerText.match(submissiveRegex)) {
            const egoBoost = 0.15 * temperament.sociability;
            driveDeltas.dominance = Math.min(1.0, cur.dominance + egoBoost);
            driveDeltas.affiliation = Math.min(1.0, cur.affiliation + 0.05);
        }
        else if (lowerText.match(/(zamknij się|cicho|bzdury|mylisz się|gówno wiesz|słuchaj mnie|rozkazuję|głupia|nie znasz)/)) {
            const egoHit = 0.2 * temperament.sociability;
            driveDeltas.dominance = Math.max(0.0, cur.dominance - egoHit);
        }

        if (stimulus.includes("?")) {
            driveDeltas.curiosity = Math.min(1.0, cur.curiosity + 0.1);
        } else if (lowerText.match(/(nie wiem|nie interesuj się|nieważne|daj spokój|cicho|bzdury|nudne|aha|ok|no|ta|yhm)/)) {
            driveDeltas.curiosity = Math.max(0.0, cur.curiosity - 0.2);
        }

        if (lowerText.match(/(my|razem|nasz|zespół|przyjac|lubię cię|fajna jesteś|zależy mi|spotkajmy|porozmawiajmy)/)) {
            driveDeltas.affiliation = Math.min(1.0, cur.affiliation + 0.1);
        } else if (lowerText.match(/(idź sobie|nie lubię|obca|won|spadaj|nikt|sama|nienawidz)/)) {
            driveDeltas.affiliation = Math.max(0.0, cur.affiliation - 0.2);
        }

        const updatedDrives = await this.drives.updateDrives(driveDeltas);
        state.drives = updatedDrives;
        state.libido = updatedDrives.libido;
        state.energy = updatedDrives.energy;

        // E. ATTENTION
        let attnDelta = 0;
        if (updatedDrives.curiosity > 0.7) attnDelta += 3;
        else if (updatedDrives.curiosity < 0.3) attnDelta -= 2;
        else attnDelta += 0.5;
        if (state.energy < 30) attnDelta -= 3;
        if (state.mood.arousal > 0.8 && state.mood.valence < 0) attnDelta -= 4;

        state.attention = Math.max(5, Math.min(100, state.attention + attnDelta));
        this.saveState(state);

        // 5. SYSTEM 1 (Heurystyka)
        const s1Result = await this.systemOne.processStimulus(stimulus, source, imageUrl, state, updatedDrives);
        this.appendThought(state, `⚪ [SYS-1] Szybka decyzja: ${s1Result.decision}`);
        this.saveState(state);

// 6. SYSTEM 2 & PROTOCOL CLIENT
        const triggerSystem2 = s1Result.decision === 'WAKE_UP_SYSTEM_2' || s1Result.decision === 'USE_TOOL' || (Math.random() < 0.1 * temperament.analyticalLeaning);

        if (triggerSystem2 && state.attention > 20) {
            state.energy = Math.max(0, state.energy - PSYCHOPHYSICS.ENERGY_COST_SYSTEM_2);
            this.appendThought(state, `🟣 [SYS-2] Waking up for deep reflection (Cost: ${PSYCHOPHYSICS.ENERGY_COST_SYSTEM_2} E)...`);
            this.saveState(state);
            await this.drives.updateDrives({ energy: state.energy });
            
            const s2Result = await this.systemTwo.reflectAndPlan(stimulus, s1Result, state, updatedDrives);
            this.appendThought(state, `🟣 [SYS-2] ${s2Result.rationale}`);
            this.saveState(state);

            if (s2Result.action === 'USE_TOOL' && s2Result.toolPayload?.toolId) {
                const sys3 = new SystemThree(this.botName);
                const verdict = await sys3.validateToolUse(s2Result.toolPayload.toolId, state);

                if (verdict.approved) {
                    this.appendThought(state, `✅ [SYS-3] Użycie narzędzia zatwierdzone. Próba wykonania: ${s2Result.toolPayload.toolId}`);
                    
                    // Podatek energetyczny za użycie narzędzia
                    const toolCost = s2Result.requiredResources?.energy || 15;
                    state.energy = Math.max(0, state.energy - toolCost);
                    await this.drives.updateDrives({ energy: state.energy });
                    
                    // ===============================================
                    // UŻYCIE FAKTYCZNEGO SERWISU (PROTOCOL CLIENT)
                    // ===============================================
                    const protocolService = new ProtocolService(this.botName);
                    const response = await protocolService.executeTool(
                        s2Result.toolPayload.toolId, 
                        s2Result.toolPayload.command
                    );
                    
                    // Dodanie odpowiedzi z powrotem do strumienia myśli (skrócone dla UI)
                    this.appendThought(state, `⚙️ [TOOL FEEDBACK] ${response.substring(0, 45)}...`);
                    // Zapisanie pełnej odpowiedzi do pamięci krótkotrwałej bota, żeby System 2 miał do niej dostęp w kolejnym cyklu
                    state.shortTermMemory.push(`[EXECUTION_RESULT]: ${response}`);
                    
                    // Bot reaguje na wynik działania narzędzia (Satysfakcja)
                    const toolAppraisal = await this.appraisal.evaluate(`[TOOL RESPONSE] ${response.substring(0, 50)}`, "Tool executed", temperament);
                    state.mood.dominance = Math.max(-1, Math.min(1, state.mood.dominance + toolAppraisal.deltaDominance));

                } else {
                    this.appendThought(state, `⛔ [SYS-3] TOOL BLOCKED: ${verdict.reason}`);
                    state.mood.dominance = Math.max(-1, state.mood.dominance - 0.2);
                    state.mood.arousal = Math.min(1, state.mood.arousal + 0.1);
                }
                this.saveState(state);
            }
        }

        return { processed: true, decision: s1Result.decision };
    }

    // ==========================================
    // 3. UI HELPERS & INTERVENTIONS
    // ==========================================

    public async getEmotionalPrompt(): Promise<string> {
        const state = this.loadState();
        return `Mood: V${state.mood.valence.toFixed(2)} A${state.mood.arousal.toFixed(2)} D${state.mood.dominance.toFixed(2)} | Energy: ${state.energy}% | Attention: ${state.attention}% | Safety: ${state.drives.safety.toFixed(2)}`;
    }

    public async applyIntervention(instruction: string): Promise<string> {
        const state = this.loadState();
        if (instruction.includes("reset")) {
            await this.resetState();
            return "Neural pathways cleared. System rebooted.";
        }
        this.appendThought(state, `⚡ [MANUAL OVERRIDE] ${instruction}`);
        this.saveState(state);
        return "Manual override applied.";
    }

    public async markAsRead(contentId: string): Promise<void> {
        const state = this.loadState();
        if (!state.history) state.history = [];
        state.history.push(contentId);
        if (state.history.length > 500) state.history = state.history.slice(-500);
        this.saveState(state);
    }

    public async hasRead(contentId: string): Promise<boolean> {
        const state = this.loadState();
        return state.history ? state.history.includes(contentId) : false;
    }
}
