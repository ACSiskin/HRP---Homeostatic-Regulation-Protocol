// src/core/agent-manager.ts
import { PrismaClient } from '@prisma/client';
import { Browser } from 'puppeteer';
import { BotInstance } from './bot-instance';
import { BotConfig, BotTask, BotLaunchOptions, ProxyConfig } from './types';
import { BrowserLauncher } from '../engine/browser';
import { ProxyService } from './services/proxy-service';

const prisma = new PrismaClient();

// ZMIANA: Zmniejszono pulę przeglądarek z 12 na 4 (optymalizacja RAM)
const POOL_SIZE = 4; 
const MAX_TASKS_PER_BROWSER = 50; 

interface BrowserSlot {
  browser: Browser;
  status: 'AVAILABLE' | 'BUSY';
  taskCount: number;
  lastUsed: number;
}

class AgentManager {
  private static instance: AgentManager;
  private bots: Map<string, BotInstance> = new Map();
  private browserPool: BrowserSlot[] = [];
  
  // ZMIANA: Flagi do obsługi "Lazy Loading" (ładowania na żądanie)
  private isPoolInitialized = false;
  private initPoolPromise: Promise<void> | null = null; 

  private constructor() {
    // ZMIANA: Usunięto this.initPool().catch(...)
    // Pula nie ładuje się już agresywnie podczas startu systemu H.R.P.
    console.log(`[Manager] 🧠 Agent Manager gotowy w trybie Standby (Przeglądarki uśpione).`);
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  // --- 1. ZARZĄDZANIE PULĄ PRZEGLĄDAREK (THE BODY POOL - ON DEMAND) ---

  private async initPool() {
    // Zabezpieczenie przed sytuacją, w której dwa boty na raz żądają inicjalizacji
    if (this.initPoolPromise) return this.initPoolPromise;

    this.initPoolPromise = (async () => {
      console.log(`[Manager] 🌊 Inicjalizacja puli przeglądarek ON-DEMAND (Rozmiar: ${POOL_SIZE})...`);
      
      const proxiesRes = await ProxyService.getAll();
      const proxies = Array.isArray(proxiesRes) ? proxiesRes : [];

      for (let i = 0; i < POOL_SIZE; i++) {
        try {
          const proxy = proxies[i % proxies.length];
          const browser = await BrowserLauncher.launchBrowser(proxy);
          this.browserPool.push({
            browser,
            status: 'AVAILABLE',
            taskCount: 0,
            lastUsed: Date.now()
          });
          // Staggered launch to prevent CPU spikes
          await new Promise(r => setTimeout(r, 2000)); 
        } catch (e) {
          console.error(`[Manager] Failed to init browser slot ${i}:`, e);
        }
      }

      this.isPoolInitialized = true;
      console.log(`[Manager] ✅ Pula przeglądarek gotowa (${this.browserPool.length}/${POOL_SIZE}).`);
    })();

    return this.initPoolPromise;
  }

  private async assignBrowserSlot(): Promise<Browser> {
    // ZMIANA: Jeśli pula nie jest aktywna, uruchom ją dopiero teraz!
    if (!this.isPoolInitialized) {
      console.log(`[Manager] 🛑 Pula przeglądarek wyłączona. Uruchamiam procesy Chromium...`);
      await this.initPool();
    }

    // Szukamy wolnego slota (Least recently used)
    const availableSlots = this.browserPool
      .filter(s => s.status === 'AVAILABLE')
      .sort((a, b) => a.lastUsed - b.lastUsed);

    if (availableSlots.length > 0) {
      const slot = availableSlots[0];
      slot.status = 'BUSY';
      slot.lastUsed = Date.now();
      slot.taskCount++;

      // Odświeżanie przeglądarki jeśli wykonała zbyt dużo zadań (zapobiega wyciekom pamięci)
      if (slot.taskCount > MAX_TASKS_PER_BROWSER) {
        console.log(`[Manager] ♻️ Recycling przeglądarki (Osiągnięto limit: ${MAX_TASKS_PER_BROWSER} zadań).`);
        try {
          await slot.browser.close();
          const proxiesRes = await ProxyService.getAll();
          const proxy = Array.isArray(proxiesRes) && proxiesRes.length > 0 ? proxiesRes[0] : undefined;
          slot.browser = await BrowserLauncher.launchBrowser(proxy);
          slot.taskCount = 0;
        } catch (e) {
          console.error(`[Manager] Failed to recycle browser:`, e);
        }
      }

      return slot.browser;
    }

    throw new Error("Brak wolnych przeglądarek w puli (Wszystkie sloty zajęte).");
  }

  private releaseBrowserSlot(browser: Browser) {
    const slot = this.browserPool.find(s => s.browser === browser);
    if (slot) {
      slot.status = 'AVAILABLE';
      slot.lastUsed = Date.now();
    }
  }

  // --- 2. ZARZĄDZANIE AGENTAMI (THE MINDS) ---

  public async startBot(config: BotConfig, options: BotLaunchOptions) {
    if (this.bots.has(config.name)) {
      throw new Error(`Bot ${config.name} już pracuje.`);
    }

    const bot = new BotInstance(config);
    this.bots.set(config.name, bot);

    // Aktualizacja w bazie
    await prisma.botState.update({
      where: { name: config.name },
      data: { status: 'WORKING', lastActive: new Date() }
    });

    console.log(`[Manager] 🚀 Uruchamiam bota: ${config.name} (Mode: ${options.mode})`);

    try {
      if (options.mode === 'ACTIVE') {
        const browser = await this.assignBrowserSlot();
        await bot.initialize(options); // Przekazujemy przeglądarkę pod spodem, wkrótce bot dostanie adapter
        // W przyszłości tu będzie podpięcie bota do Playwright/Puppeteer adaptera
      } else {
        // Tryb GHOST (Tylko procesy myślowe)
        await bot.initialize(options);
      }
      
      const botRecord = await prisma.botState.findUnique({ where: { name: config.name } });
      if (botRecord) {
        await prisma.log.create({
          data: {
            botId: botRecord.id,
            level: 'SUCCESS',
            message: `Persona ${config.name} online w trybie ${options.mode}.`
          }
        });
      }

    } catch (e: any) {
      console.error(`[Manager] ❌ Awaria podczas startu bota ${config.name}:`, e);
      this.bots.delete(config.name);
      await prisma.botState.update({
        where: { name: config.name },
        data: { status: 'ERROR' }
      });
      throw e;
    }
  }

  public async stopBot(botName: string) {
    const bot = this.bots.get(botName);
    if (!bot) return;

    await bot.stop();
    this.bots.delete(botName);

    await prisma.botState.update({
      where: { name: botName },
      data: { status: 'IDLE', lastActive: new Date() }
    });

    console.log(`[Manager] 🛑 Zatrzymano bota: ${botName}`);
  }

  public getAllStatuses() {
    const statuses: Record<string, { status: string, mode: string }> = {};
    for (const [name, bot] of this.bots.entries()) {
      statuses[name] = {
        status: bot.getStatus(),
        mode: 'GHOST' // Na razie uproszczone
      };
    }
    return statuses;
  }

  // --- 3. MISSION CONTROL & JITTER ---

  public async broadcastCampaign(topic: string) {
    const activeBots = Array.from(this.bots.values()).filter(b => b.status === 'IDLE');
    if (activeBots.length === 0) throw new Error("Brak wolnych botów do misji.");

    console.log(`[Manager] 📢 Broadcaster: "${topic}" do ${activeBots.length} jednostek.`);
    
    let delay = 0;
    for (const bot of activeBots) {
      // Jitter: 1-5 minut między botami dla bezpieczeństwa
      delay += Math.floor(Math.random() * (300000 - 60000) + 60000); 

      setTimeout(async () => {
        const task: BotTask = {
          id: Math.random().toString(36).substring(7),
          type: 'CAMPAIGN_INTERACTION',
          payload: { topic },
          status: 'PENDING'
        };
        bot.assignTask(task);
        
        const botRecord = await prisma.botState.findFirst({ where: { name: bot.name } });
        if (botRecord) {
          await prisma.log.create({
            data: { botId: botRecord.id, level: 'ACTION', message: `Mission deployed: ${topic}` }
          });
        }
      }, delay);
    }

    return { dispatched: activeBots.length, eta: `${Math.round(delay / 60000)} min` };
  }
}

export const agentManager = AgentManager.getInstance();
