// src/app/actions.ts
'use server'
import fs from 'fs/promises' 
import path from 'path'      
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// --- SERVICES (Warstwa Logiki) ---
import { BotConfigService } from '../core/services/bot-config-service'
import { BrainInteractionService } from '../core/services/brain-interaction-service'
import { BioRhythmService } from '../core/services/bio-rhythm-service'
import { MonitoringService } from '../core/services/monitoring-service'
import { ProxyService } from '../core/services/proxy-service'
import { LifeLoopService } from '../core/services/life-loop' // <--- DODANY IMPORT PĘTLI ŻYCIA

// --- CORE ---
import { agentManager } from '../core/agent-manager'
import { BotConfig, BotLaunchOptions, SocialPlatform, Drives } from '../core/types'
import { WeatherService } from '../core/context/weather-service';
import { TimeManager } from '../core/context/time-manager';
import { NewsService } from '../core/context/news-service';
import { NewsManager } from '../core/context/news-manager';
import { KnowledgeManager } from '../core/context/knowledge-manager';
import { EpisodicManager } from '../core/brain/episodic-manager';
import { HiveService } from '../core/hive-service';

// --- BRAIN HELPERS ---
import { DrivesManager } from '../core/brain/drives-manager';
import { CognitiveEngine } from '../core/context/cognitive-engine';
import { NarrativeEngine } from '../core/brain/narrative-engine';
import { MCPManager } from '../core/brain/mcp-manager'; // <--- NOWOŚĆ: Import MCP Managera

const prisma = new PrismaClient()

// =================================================================================
// 1. ZARZĄDZANIE PROCESAMI (LIFECYCLE)
// =================================================================================

export async function toggleBotStatus(botId: string, currentStatus: string) {
  const targetStatus = currentStatus === 'WORKING' ? 'IDLE' : 'WORKING'

  try {
    const botState = await prisma.botState.findUnique({ where: { id: botId } })
    if (!botState) throw new Error("Bot not found")

    if (targetStatus === 'WORKING') {
      const creds = await BotConfigService.getCredentials(botState.name);

      const config: BotConfig = {
        name: botState.name,
        platform: 'INSTAGRAM',
        isActive: true,
        proxy: creds.proxy || undefined,
        schedule: { startHour: 8, endHour: 22 }
      }

      const launched = await agentManager.startBot(config)
      if (!launched) throw new Error("AgentManager failed to launch browser")

      await prisma.log.create({
        data: { botId, level: 'SUCCESS', message: 'Process started via AgentManager.' }
      })

    } else {
      const stopped = await agentManager.stopBot(botState.name)
      await prisma.log.create({
        data: { botId, level: 'INFO', message: stopped ? 'Process killed.' : 'Process was not running.' }
      })
    }

    await prisma.botState.update({
      where: { id: botId },
      data: { status: targetStatus, lastActive: new Date() }
    })

    revalidatePath('/')
    return { success: true, status: targetStatus }

  } catch (error: any) {
    console.error("Toggle error:", error)
    return { success: false, error: error.message }
  }
}

export async function startBotHybrid(botName: string, mode: 'GHOST' | 'ACTIVE', platform?: 'INSTAGRAM' | 'FACEBOOK') {
  try {
    // 1. Sprawdź czy bot ma instynkty, jeśli nie - zasiej ego
    try {
      await MonitoringService.getBotHeartbeat(botName);
    } catch {
      await BioRhythmService.seedEgo(botName);
    }

    // 2. Pobierz config runtime
    const fileConfig = await BotConfigService.loadRuntimeConfig(botName);

    const runtimeConfig = {
      name: botName,
      proxy: fileConfig.proxy || "",
      location: fileConfig.location || "Warszawa",
      interests: fileConfig.interests || ["Technologia"]
    };

    const options: BotLaunchOptions = { mode: mode, platform: platform as SocialPlatform };
    const success = await agentManager.startBot(runtimeConfig as any, options);

    if (success) {
      const botRecord = await prisma.botState.findFirst({ where: { name: botName } });
      if (botRecord) {
        await prisma.botState.update({ where: { id: botRecord.id }, data: { status: 'WORKING', lastActive: new Date() } });
      }
      
      // ==========================================
      // START ZEGARA BIOLOGICZNEGO (AUTO-SLEEP)
      // ==========================================
      await LifeLoopService.startLoop(botName);
    }

    revalidatePath('/');
    return { success };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function stopBotAction(botName: string) {
  try {
    // ==========================================
    // STOP ZEGARA BIOLOGICZNEGO
    // ==========================================
    LifeLoopService.stopLoop(botName);
    
    await agentManager.stopBot(botName);
    const botRecord = await prisma.botState.findFirst({ where: { name: botName } });
    if (botRecord) {
      await prisma.botState.update({ where: { id: botRecord.id }, data: { status: 'OFFLINE', lastActive: new Date() } });
      await prisma.log.create({ data: { botId: botRecord.id, level: 'WARN', message: `Process terminated manually.` } });
    }
    revalidatePath('/');
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

// =================================================================================
// 2. ZARZĄDZANIE PLIKAMI I KONFIGURACJĄ (BOT CONFIG SERVICE)
// =================================================================================

export async function createBot(formData: FormData) {
  const name = formData.get('name') as string
  if (!name) return { success: false, error: 'Name is required' }

  try {
    await BotConfigService.createBotFileSystem(name.toLowerCase().replace(/\s+/g, '-'));

    const newBot = await prisma.botState.create({
      data: { name: name.toLowerCase().replace(/\s+/g, '-'), status: 'IDLE' }
    })

    await prisma.log.create({
      data: { botId: newBot.id, level: 'SUCCESS', message: `Bot '${name}' created.` }
    })

    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create bot.' }
  }
}

export async function getBotConfig(botName: string) {
  try {
    const content = await BotConfigService.getPersonaConfig(botName);
    return { success: true, content };
  } catch { return { success: false, content: '// Error loading persona.ts' } }
}

export async function saveBotConfig(botName: string, newContent: string) {
  try {
    await BotConfigService.savePersonaConfig(botName, newContent);
    revalidatePath('/')
    return { success: true }
  } catch { return { success: false, error: 'Failed to save file' } }
}

export async function getBotProfile(botName: string) {
  const data = await BotConfigService.getProfile(botName);
  return { success: true, data };
}

export async function saveBotProfile(botName: string, profileData: any) {
  try {
    await BotConfigService.saveProfile(botName, profileData);
    revalidatePath('/');
    return { success: true };
  } catch { return { success: false, error: 'Failed to save profile' }; }
}

export async function getBotMedia(botName: string) {
  const files = await BotConfigService.getMediaFiles(botName);
  return { success: true, files };
}

export async function getBotSettings(botName: string) {
  try {
    const fileConfig = await BotConfigService.loadRuntimeConfig(botName);
    return { success: true, settings: fileConfig };
  } catch { return { success: false, settings: {} } }
}

export async function updateBotSettings(botName: string, settings: any) {
  try {
    // Zapisuje nowe ustawienia do pliku
    await BotConfigService.updateRuntimeConfig(botName, settings);

    // Reakcja na żywo na przełącznik "Master Autonomy Loop" w panelu UI!
    if (settings.is_autonomous !== undefined || settings.perception_interval !== undefined) {
        const currentConfig = await BotConfigService.loadRuntimeConfig(botName);
        if (currentConfig.is_autonomous) {
            // Natychmiast startuje pętlę po włączeniu
            await LifeLoopService.startLoop(botName); 
        } else {
            // Zatrzymuje pętlę po wyłączeniu
            LifeLoopService.stopLoop(botName);
        }
    }

    revalidatePath('/');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}
// =================================================================================
// 3. NEURO LINK I INTERAKCJA (BRAIN INTERACTION & BIORHYTHM)
// =================================================================================

export async function chatWithBot(botName: string, userMessage: string) {
  // A. ROUTING KOMEND ADMINA
  if (userMessage.startsWith('/')) {
    const cmd = userMessage.trim();
    if (cmd === '/sleep') return await triggerSleepCycle(botName);
    if (cmd === '/seed') return await seedBotEgo(botName);
    if (cmd.startsWith('/learn ')) {
      const fact = cmd.replace('/learn ', '');
      await learnFactAction(botName, fact, "Admin Console");
      return { success: true, response: `[SYSTEM] 🧠 Wprowadzono fakt: "${fact}"` };
    }
    return { success: true, response: `[SYSTEM] ⚠️ Nieznana komenda: ${cmd}` };
  }

  // B. NORMALNA ROZMOWA
  try {
    const response = await BrainInteractionService.chat(botName, userMessage);
    return { success: true, response };
  } catch (error: any) {
    return { success: false, response: `[ERROR]: ${error.message}` };
  }
}

export async function generateContextAwarePost(botName: string, manualTopic?: string) {
  try {
    const result = await BrainInteractionService.generateContextPost(botName, manualTopic);
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function triggerSleepCycle(botName: string) {
  try {
    const result = await BioRhythmService.executeSleepCycle(botName);
    return {
      success: true,
      response: `Sen zakończony.\n📖 Rozdział: "${result.chapterTitle}"\n✨ ${result.evolutionMsg}`
    };
  } catch (error: any) {
    return { success: false, response: `[ERROR] ${error.message}` };
  }
}

export async function seedBotEgo(botName: string) {
  try {
    const msg = await BioRhythmService.seedEgo(botName);
    revalidatePath('/');
    return { success: true, response: `[SYSTEM] ${msg}` };
  } catch (e: any) { return { success: false, response: e.message }; }
}

export async function evolveBot(botName: string) {
  try {
    const brain = new CognitiveEngine(botName);
    const msg = await BioRhythmService.evolvePersona(botName, brain);
    revalidatePath('/');
    return { success: true, message: msg };
  } catch (e: any) { return { success: false, message: e.message }; }
}

export async function injectMemory(botName: string, instruction: string, currentFileContent: string) {
  try {
    let newContent = currentFileContent;
    if (currentFileContent.includes('export const systemPrompt = `')) {
      newContent = currentFileContent.replace('`;', `\n- WAŻNE: ${instruction}\n\`;`);
    } else {
      newContent = `// [AUTO-MEMORY]: ${instruction}\n` + currentFileContent;
    }

    await BotConfigService.savePersonaConfig(botName, newContent);
    return { success: true, newContent };
  } catch { return { success: false, error: "Injection failed" }; }
}

// =================================================================================
// 4. MONITORING I TELEMETRIA (MONITORING SERVICE)
// =================================================================================

export async function getDatabaseData() {
  try {
    const data = await MonitoringService.getDashboardOverview();
    return { success: true, data };
  } catch (e) { return { success: false, error: "DB Error" }; }
}

export async function getBotMentalState(botName: string) {
  try {
    const state = await MonitoringService.getBotHeartbeat(botName);
    return { success: true, state };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getBotHistory(botName: string, limit: number = 150) {
  const history = await MonitoringService.getMentalHistory(botName, limit);
  return { success: true, history };
}

export async function getBotDrives(botName: string) {
  try {
    const dm = new DrivesManager(botName);
    return { success: true, drives: await dm.getDrives() };
  } catch { return { success: false }; }
}

export async function getHiveNetwork() {
  const result = await MonitoringService.getHiveVisuals();
  return { success: true, ...result };
}

export async function getAgentStatuses() {
  const data = await MonitoringService.getAgentStatuses();
  return { success: true, data };
}

// =================================================================================
// 5. NARZĘDZIA (PROXY & SESSION)
// =================================================================================

export async function getProxies() {
  const data = await ProxyService.getAll();
  return { success: true, data };
}

export async function addProxies(rawText: string) {
  const count = await ProxyService.addBulk(rawText);
  revalidatePath('/');
  return { success: true, count };
}

export async function deleteProxy(id: string) {
  await ProxyService.delete(id);
  revalidatePath('/');
  return { success: true };
}

export async function checkProxyStatus(id: string) {
  const status = await ProxyService.checkStatus(id);
  revalidatePath('/');
  return { success: true, status };
}

export async function getSessionStatus(botName: string) {
  return await BotConfigService.checkSessionStatus(botName);
}

export async function saveCredentials(botName: string, data: any) {
  try {
    await BotConfigService.saveCredentials(botName, data);
    return { success: true };
  } catch { return { success: false }; }
}

export async function getCredentials(botName: string) {
  const data = await BotConfigService.getCredentials(botName);
  return { success: true, data };
}

export async function clearSession(botName: string) {
  await BotConfigService.clearSessionFiles(botName);
  await agentManager.stopBot(botName);
  revalidatePath('/');
  return { success: true };
}

export async function performLogin(botName: string, type: 'AUTO' | 'INTERACTIVE') {
  try {
    const creds = await BotConfigService.getCredentials(botName);
    const config: BotConfig = {
      name: botName,
      platform: 'INSTAGRAM',
      isActive: true,
      proxy: creds.proxy,
    };

    const success = await agentManager.startBot(config);
    if (success) {
      await prisma.log.create({ data: { botId: 'UNKNOWN', level: 'INFO', message: `Login Session: ${botName}` } });
    }

    revalidatePath('/');
    return { success, type };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// =================================================================================
// 6. POZOSTAŁE POMNIEJSZE FUNKCJE
// =================================================================================

export async function getBotContext(botName: string) {
  try {
    const profile = await BotConfigService.getProfile(botName);
    const city = profile?.location || "Warszawa";
    const weather = await WeatherService.getCurrentWeather();

    await NewsManager.runAutonomicPerception(botName);
    const newsItems = await NewsService.getBotBriefing(city, ["Świat", "Technologia"]);

    return {
      success: true,
      data: {
        location: `${city} (Proxy: Warszawa)`,
        timeSlot: TimeManager.getCurrentSlot(),
        weather: weather,
        localTime: TimeManager.getLocalTime(),
        headlines: newsItems.slice(0, 5).map(n => `[${n.source}] ${n.title}`)
      }
    };
  } catch { return { success: false }; }
}

export async function learnFactAction(botName: string, text: string, source: string) {
  const km = new KnowledgeManager(botName);
  await km.learn(text, source, "Manual");
  return { success: true };
}

export async function injectEpisodicMemory(botName: string, content: string, emotion: string) {
  const episodic = new EpisodicManager(botName);
  await episodic.encodeEpisode(content, "Manual", { valence: 0.5, arousal: 0.5, dominance: 0.5 }, "Admin");
  return { success: true };
}

export async function sendOperatorCommand(botName: string, command: string) {
  try {
    const engine = new CognitiveEngine(botName);
    const response = await engine.applyIntervention(command);
    return { success: true, response };
  } catch { return { success: false, error: "Failed" }; }
}

export async function startCampaign(topic: string) {
  try {
    await agentManager.broadcastCampaign(topic);
    revalidatePath('/');
    return { success: true, message: "Campaign Started" };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getBotAutobiography(botName: string) {
  try {
    const engine = new NarrativeEngine(botName);
    const data = await engine.loadAutobiography();
    return { success: true, data };
  } catch (e) {
    console.error("Autobiography load error:", e);
    return { success: false, error: "Failed to load narrative" };
  }
}

export async function getBotInstincts(botName: string) {
  const dm = new DrivesManager(botName);
  return { success: true, drives: await dm.getDrives() };
}

export async function updateBotInstincts(botName: string, drives: Partial<Drives>) {
  const dm = new DrivesManager(botName);
  await dm.updateDrives(drives);
  revalidatePath('/');
  return { success: true };
}

export async function getHiveHistory() {
  return { success: true, data: await HiveService.getMessages() };
}

export async function postHiveAdminMessage(text: string) {
  await HiveService.adminBroadcast(text);
  return { success: true };
}

// =================================================================================
// 7. MCP TOOLBOX (UNIVERSAL PROTOCOL HUB)
// =================================================================================

export async function getMcpServers(botName: string) {
  try {
    const mcp = new MCPManager(botName);
    return { success: true, servers: mcp.getServers() };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function addMcpServer(
  botName: string, 
  name: string, 
  description: string, 
  customHeaders: string, 
  urlOrCommand: string, 
  energyCost: number, 
  autoApprove: boolean,
  protocolType: 'MCP' | 'REST_API' | 'LOCAL_SHELL' | 'PLUGIN' = 'MCP' // Zmiana z poprzedniej wersji!
) {
  try {
    const mcp = new MCPManager(botName);
    const server = mcp.addServer(name, description, customHeaders, urlOrCommand, energyCost, autoApprove, protocolType);
    revalidatePath('/');
    return { success: true, server };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateMcpServer(botName: string, id: string, updates: any) {
  try {
    const mcp = new MCPManager(botName);
    mcp.updateServerConfig(id, updates);
    revalidatePath('/');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function removeMcpServer(botName: string, id: string) {
  try {
    const mcp = new MCPManager(botName);
    mcp.removeServer(id);
    revalidatePath('/');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function toggleToolCensor(botName: string, isActive: boolean) {
  try {
    await BotConfigService.updateRuntimeConfig(botName, { tool_censor_active: isActive });
    revalidatePath('/');
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function pingAllTools(botName: string) {
  try {
    const mcp = new MCPManager(botName);
    const servers = mcp.getServers();
    let updated = false;

    for (const tool of servers) {
        let isOnline = false;
        
        if (tool.protocolType === 'REST_API' || tool.protocolType === 'MCP') {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000); 

            try {
                await fetch(tool.urlOrCommand, { method: 'OPTIONS', signal: controller.signal })
                    .catch(() => fetch(tool.urlOrCommand, { method: 'GET', signal: controller.signal }));
                isOnline = true;
            } catch {
                isOnline = false; 
            } finally {
                clearTimeout(timeout);
            }
        // Dodano obsługę PLUGIN
       } else if (tool.protocolType === 'LOCAL_SHELL' || tool.protocolType === 'PLUGIN') {
            isOnline = true;
        }

        const newStatus = isOnline ? 'ONLINE' : 'ERROR';
        
        if (tool.status !== newStatus) {
            mcp.setServerStatus(tool.id, newStatus);
            updated = true;
        }
    }
    
    if (updated) revalidatePath('/');
    return { success: true, servers: mcp.getServers() };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// =================================================================================
// 8. GLOBAL SYSTEM SETTINGS & SECURITY
// =================================================================================

/**
 * Sprawdza obecność kluczowych zmiennych środowiskowych w systemie.
 * Zwraca jedynie status (true/false), aby ukryć rzeczywiste wartości przed frontendem.
 */
export async function getSystemEnvStatus() {
  return {
    success: true,
    env: {
      openai: !!process.env.OPENAI_API_KEY,
      discordWebhook: !!process.env.DISCORD_WEBHOOK_URL,
      captcha: !!process.env.CAPTCHA_API_KEY,
      sms: !!process.env.SMS_ACTIVATE_KEY
    }
  };
}

/**
 * 9. MASTER KILL SWITCH
 * Natychmiastowe, awaryjne zatrzymanie wszystkich pracujących agentów.
 */
export async function executeMasterKill() {
  try {
    console.log("[EMERGENCY] 🔴 MASTER KILL SWITCH TRIGGERED!");

    const workingBots = await prisma.botState.findMany({
      where: { status: 'WORKING' }
    });

    if (workingBots.length === 0) {
      return { success: true, killedCount: 0 };
    }

    const killPromises = workingBots.map(async (bot) => {
      // Twarde zatrzymanie procesu 
      await agentManager.stopBot(bot.name);

      // Zatrzymanie Pętli Życia (Autonomii i Auto-Sleepu)
      LifeLoopService.stopLoop(bot.name);

      await prisma.botState.update({
        where: { id: bot.id },
        data: { status: 'OFFLINE', lastActive: new Date() }
      });

      await prisma.log.create({
        data: { 
            botId: bot.id, 
            level: 'WARN', 
            message: `EMERGENCY TERMINATION: Zatrzymano awaryjnie przez Master Kill Switch.` 
        }
      });
    });

    await Promise.all(killPromises);

    revalidatePath('/');
    
    return { success: true, killedCount: workingBots.length };
  } catch (e: any) {
    console.error("[EMERGENCY] Failed to execute Kill Switch:", e);
    return { success: false, error: e.message };
  }
}
/**
 * 10. SYSTEM NOTIFICATIONS
 * Wysyła testowy alert na wskazany w .env Webhook (Discord/Telegram)
 */
export async function sendTestNotification() {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return { success: false, error: "Webhook URL is missing in .env file." };
    }

    // Sformatowana wiadomość (Markdown zoptymalizowany pod Discorda)
    const payload = {
      content: null,
      embeds: [
        {
          title: "🟢 V.E.S.P.E.R. System Link Active",
          description: "This is a secure automated test from your Global Stealth Panel. Comms channel is fully operational.",
          color: 3066993, // Zielony kolor paska
          fields: [
            { name: "Environment", value: "Production", inline: true },
            { name: "Master Kill Switch", value: "DISENGAGED", inline: true }
          ],
          footer: { text: "V.E.S.P.E.R. Central Command" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `Webhook API returned status: ${response.status}` };
    }
  } catch (e: any) {
    console.error("[NOTIFY] Error:", e);
    return { success: false, error: e.message };
  }
}

// =================================================================================
// 11. SYSTEM MAINTENANCE (Logs & DB Backup)
// =================================================================================

export async function getDatabaseSize() {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const stats = await fs.stat(dbPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    return { success: true, sizeMB };
  } catch (e: any) {
    return { success: false, sizeMB: "0.00" };
  }
}

export async function purgeSystemLogs(days: number = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await prisma.log.deleteMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    revalidatePath('/');
    return { success: true, count: result.count };
  } catch (e: any) {
    console.error("[MAINTENANCE] Failed to purge logs:", e);
    return { success: false, error: e.message };
  }
}

export async function backupSystemDatabase() {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const backupsDir = path.join(process.cwd(), 'backups');
    
    // Upewniamy się, że folder backups istnieje
    await fs.mkdir(backupsDir, { recursive: true });
    
    const backupPath = path.join(backupsDir, `dev_backup_${Date.now()}.db`);
    await fs.copyFile(dbPath, backupPath);
    
    return { success: true, path: backupPath };
  } catch (e: any) {
    console.error("[MAINTENANCE] Failed to backup DB:", e);
    return { success: false, error: e.message };
  }
}

// ==========================================
// DELETE BOT (Usunięcie Persony)
// ==========================================
export async function deleteBot(botName: string) {
  try {
    console.log(`[Actions] 🗑️ Rozpoczynam procedurę usuwania persony: ${botName}`);

    // 1. Upewniamy się, że bot jest zatrzymany w Agent Managerze
    try {
      await stopBotAction(botName);
    } catch (e) {
      console.log(`[Actions] Bot ${botName} nie był uruchomiony lub ignoruję błąd zatrzymania.`);
    }

    // 2. Usunięcie wpisu z bazy danych (Logi i Aktywności znikną dzięki onDelete: Cascade w schemacie)
    await prisma.botState.delete({
      where: { name: botName }
    });
    console.log(`[Actions] ✅ Usunięto bota ${botName} z bazy SQLite.`);

    // 3. Usunięcie plików systemowych z dysku (Twardy reset)
    const sanitizedBotName = botName.toLowerCase().replace(/\s+/g, '-');
    const botPath = path.join(process.cwd(), 'bots', sanitizedBotName);
    
    try {
      // Używamy rm z flagami recursive i force, żeby usunąć folder niezależnie od zawartości
      await fs.rm(botPath, { recursive: true, force: true });
      console.log(`[Actions] ✅ Usunięto folder bota z dysku: ${botPath}`);
    } catch (fsError) {
      console.warn(`[Actions] ⚠️ Nie udało się usunąć folderu na dysku (może nie istnieć):`, fsError);
    }

    // 4. Odświeżenie UI Next.js
    revalidatePath('/');
    
    return { success: true, message: `Persona ${botName} została całkowicie usunięta z H.R.P.` };
  } catch (error: any) {
    console.error(`[Actions] ❌ Błąd krytyczny podczas usuwania bota ${botName}:`, error);
    return { success: false, error: error.message };
  }
}
