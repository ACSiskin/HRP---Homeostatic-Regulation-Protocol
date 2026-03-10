// src/core/services/monitoring-service.ts
import { PrismaClient } from '@prisma/client';
import { agentManager } from '../agent-manager';
import { CognitiveEngine } from '../context/cognitive-engine';
import { DrivesManager } from '../brain/drives-manager';
import { NewsManager } from '../context/news-manager';
import { HiveService } from '../hive-service';
import { getBotDatabase } from '../db';
import { BotConfigService } from './bot-config-service'; // Z Fazy 1

const prisma = new PrismaClient();

export class MonitoringService {

  // --- 1. GLOBALNY DASHBOARD (Baza SQL) ---
  static async getDashboardOverview() {
    try {
      // Używamy Promise.all zamiast transaction, aby nie blokować SQLite podczas zapisu przez boty
      const [bots, logs, totalLogs] = await Promise.all([
        prisma.botState.findMany({ orderBy: { name: 'asc' } }),
        prisma.log.findMany({ take: 50, orderBy: { createdAt: 'desc' } }), // Zmniejszamy take do 50
        prisma.log.count()
      ]);
      return { bots, logs, totalLogs };
    } catch (error) {
      console.error("Dashboard fetch error - returning empty fallback", error);
      return { bots: [], logs: [], totalLogs: 0 };
    }
  }

  static async getAgentStatuses() {
    return agentManager.getAllStatuses();
  }

  // --- 2. HEARTBEAT & FIZYKA MENTALNA (Logika czasu rzeczywistego) ---
  /**
   * To jest najważniejsza funkcja monitoringowa. 
   * Jest wywoływana przez UI co ~1s. 
   * Oprócz zwracania stanu, oblicza "fizykę" emocji (stygniecie, nuda).
   */
  static async getBotHeartbeat(botName: string) {
    try {
      const engine = new CognitiveEngine(botName);
      const dm = new DrivesManager(botName);

      // Ładowanie stanu
      const state = await engine.loadState();
      let drives = await dm.getDrives();
      const temperament = await dm.getTemperament();

      // --- LOGIKA PASYWNA (Decay & Boredom) ---
      const lastUpdate = new Date(state.lastUpdate).getTime();
      const now = new Date().getTime();
      const secondsSinceUpdate = (now - lastUpdate) / 1000;
      const reactivity = temperament.reactivity || 1.0;

      const BASELINE_AROUSAL = 0.1;
      let stateChanged = false;

      // Uruchamiamy fizykę tylko jeśli minęło > 5 sekund od ostatniego zapisu
      if (secondsSinceUpdate > 5) {

        // A. Stygnięcie emocji (Decay)
        if (state.mood.arousal > BASELINE_AROUSAL + 0.05) {
          const decayFactor = (0.05 * (secondsSinceUpdate / 10)) / reactivity;
          const safeDecay = Math.min(decayFactor, 0.15);
          state.mood.arousal -= ((state.mood.arousal - BASELINE_AROUSAL) * safeDecay);
          stateChanged = true;
        }

        // B. Pętla Nudy (Boredom -> Curiosity)
        if (state.mood.arousal < 0.3 && drives.curiosity < 0.9) {
          const boredomDepth = (0.3 - state.mood.arousal) * 2;
          const curiosityGrowth = (0.02 * (secondsSinceUpdate / 10)) * boredomDepth * reactivity;
          const newCuriosity = Math.min(1.0, drives.curiosity + curiosityGrowth);

          if (newCuriosity > drives.curiosity) {
            drives.curiosity = newCuriosity;
            await dm.updateDrives({ curiosity: newCuriosity });
          }
        }
      }

      if (stateChanged) {
        state.lastUpdate = new Date().toISOString();
        await engine.saveState(state);
      }

      // --- AUTONOMICZNY UKŁAD NERWOWY (Trigger percepcji) ---
      // Szansa na to, że bot sam z siebie sprawdzi newsy, jeśli się nudzi
      const boredomFactor = (1.0 - state.mood.arousal);
      const curiosityChance = 0.02 * drives.curiosity * boredomFactor * reactivity;

      if (drives.energy > 30 && Math.random() < curiosityChance) {
        // Fire & Forget (nie blokujemy UI)
        NewsManager.runAutonomicPerception(botName).catch(err => console.error("NewsManager failed", err));
      }

      return {
        ...state,
        drives,
        temperament,
        energy: drives.energy
      };

    } catch (e) {
      throw new Error("Brain offline or inaccessible");
    }
  }

  // --- 3. HISTORIA MENTALNA (SQLite) ---
  static async getMentalHistory(botName: string, limit: number = 150) {
    try {
      const db = getBotDatabase(botName);
      // Bezpośrednie zapytanie do SQLite (better-sqlite3)
      const rows = db.prepare('SELECT * FROM mental_history ORDER BY id DESC LIMIT ?').all(limit);
      return rows;
    } catch (e) {
      return [];
    }
  }

  // --- 4. HIVE MIND (Wizualizacja Sieci) ---
  static async getHiveVisuals() {
    try {
      const bots = await prisma.botState.findMany({
        where: { status: { in: ['WORKING', 'IDLE'] } },
        select: { name: true, status: true }
      });

      if (bots.length === 0) return { nodes: [], edges: [] };

      const nodes = bots.map(b => ({
        id: b.name,
        status: b.status,
        avatar: `/avatars/${b.name.toLowerCase()}.jpg`
      }));

      const relationships = await HiveService.getRelationships();
      const edges = [];

      for (let i = 0; i < bots.length; i++) {
        for (let j = i + 1; j < bots.length; j++) {
          const botA = bots[i].name;
          const botB = bots[j].name;
          const key = [botA, botB].sort().join('-');

          let score = relationships[key] || 0;

          // Fallback simulation (jeśli brak danych w pliku)
          if (score === 0) {
            const combined = botA.length + botB.length;
            score = (combined % 2 === 0) ? 5 : -5;
          }

          edges.push({ from: botA, to: botB, score: score });
        }
      }
      return { nodes, edges };
    } catch {
      return { nodes: [], edges: [] };
    }
  }
}
