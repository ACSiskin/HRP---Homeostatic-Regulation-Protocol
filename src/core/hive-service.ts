// src/core/hive-service.ts
import fs from 'fs/promises';
import path from 'path';

export interface HiveMessage {
  id: string;
  senderId: string;
  content: string;
  topic: string;
  timestamp: string;
  emotion: 'anger' | 'joy' | 'sadness' | 'fear' | 'neutral';
  arousal: number;
}

const HIVE_FILE = path.join(process.cwd(), 'hive_memory.json');
const RELATIONS_FILE = path.join(process.cwd(), 'relationships.json');

export class HiveService {
  
  static async getMessages(): Promise<HiveMessage[]> {
    try {
      const data = await fs.readFile(HIVE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static async getLastMessages(limit: number = 6): Promise<HiveMessage[]> {
      const all = await this.getMessages();
      return all.slice(-limit); 
  }

  static async getUnreadMessages(lastCheck: number): Promise<HiveMessage[]> {
      const all = await this.getMessages();
      return all.filter(m => new Date(m.timestamp).getTime() > lastCheck);
  }

  static async getRelationships(): Promise<Record<string, number>> {
      try {
          const data = await fs.readFile(RELATIONS_FILE, 'utf-8');
          return JSON.parse(data);
      } catch {
          return {}; 
      }
  }

  static async updateRelationship(botA: string, botB: string, delta: number) {
      if (botA === botB || botB === 'admin') return;

      const key = [botA, botB].sort().join('-');
      const relations = await this.getRelationships();

      const currentScore = relations[key] || 0; 
      let newScore = currentScore + delta;

      if (newScore > 100) newScore = 100;
      if (newScore < -100) newScore = -100;

      relations[key] = newScore;

      await fs.writeFile(RELATIONS_FILE, JSON.stringify(relations, null, 2), 'utf-8');
      console.log(`[RELATIONS] ⚖️ ${botA} <-> ${botB}: ${newScore} (Delta: ${delta})`);
  }

  static async broadcast(sender: string, topic: string, content: string, arousal: number): Promise<void> {
    try {
        let emotion: HiveMessage['emotion'] = 'neutral';
        const lower = content.toLowerCase();

        if (arousal > 0.7) emotion = 'fear';
        if ((content.includes('!') || lower.includes('disagree') || lower.includes('no')) && arousal > 0.5) emotion = 'anger';
        if (lower.includes('haha') || lower.includes(':)') || lower.includes('thank')) emotion = 'joy';

        const history = await this.getMessages();
        const lastMsg = history[history.length - 1];

        if (lastMsg && lastMsg.senderId !== sender && lastMsg.senderId !== 'admin') {
            let delta = 0;
            if (emotion === 'anger') delta = -5;   
            if (emotion === 'joy') delta = +5;     
            if (emotion === 'fear') delta = -2;    
            if (content.length < 10 && delta === 0) delta = -1; 

            if (delta !== 0) {
                await this.updateRelationship(sender, lastMsg.senderId, delta);
            }
        }

        const newMessage: HiveMessage = {
            id: Date.now().toString(),
            senderId: sender,
            content: content,
            topic: topic,
            timestamp: new Date().toISOString(),
            emotion: emotion,
            arousal: arousal
        };

        const messages = await this.getMessages();
        messages.push(newMessage);
        const trimmed = messages.slice(-50);
        
        await fs.writeFile(HIVE_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
        console.log(`[HIVE] 📢 ${sender}: "${content}"`);

        this.triggerHiveWakeUp(sender, topic, content);
    } catch (e: any) {
        console.error(`[HiveService] Broadcast error:`, e.message);
    }
  }
  
  static async adminBroadcast(text: string) {
      const messages = await this.getMessages();
      messages.push({
          id: Date.now().toString(),
          senderId: 'admin',
          content: text,
          topic: 'System',
          timestamp: new Date().toISOString(),
          emotion: 'neutral',
          arousal: 1.0 
      });
      await fs.writeFile(HIVE_FILE, JSON.stringify(messages.slice(-50), null, 2), 'utf-8');
      
      this.triggerHiveWakeUp('admin', 'System', text);
  }

  private static async triggerHiveWakeUp(sender: string, topic: string, content: string) {
      try {
          const { AgenticLoopService } = await import('./services/agentic-loop-service');
          const { BotConfigService } = await import('./services/bot-config-service');

          const botsDir = path.join(process.cwd(), 'bots');
          let entries = [];
          try { 
              entries = await fs.readdir(botsDir, { withFileTypes: true }); 
          } catch (e) {
              return;
          }

          const relations = await this.getRelationships();

          for (const entry of entries) {
              if (entry.isDirectory()) {
                  const botName = entry.name;
                  
                  if (botName !== sender && botName !== 'admin') {
                      const config = await BotConfigService.loadRuntimeConfig(botName).catch(() => null);
                      
                      if (config && config.is_autonomous) {
                          console.log(`[HIVE EVENT] 🔔 Hive Bell! Waking up bot: ${botName}`);
                          
                          const relKey = [botName, sender].sort().join('-');
                          const relScore = relations[relKey] || 0;
                          
                          let relContext = "";
                          if (sender !== 'admin') {
                              if (relScore > 20) relContext = `You like ${sender} (Relationship score: ${relScore}/100). Be friendly.`;
                              else if (relScore < -20) relContext = `You dislike ${sender} (Relationship score: ${relScore}/-100). Be cold or hostile.`;
                              else relContext = `Your relationship with ${sender} is neutral.`;
                          } else {
                              relContext = `The sender is ADMIN. Be respectful.`;
                          }

                          // NOWOŚĆ: Priorytetowe żądanie, które wymusza odłożenie na bok powiadomień i innych informacji
                          const stimulus = `[HIVE HOLOGRAPHIC MESSAGE - URGENT PRIORITY 1] 
Sender: ${sender} | Topic: ${topic}
Content: "${content}"
Context: ${relContext}

SYSTEM DIRECTIVE: This direct communication has ABSOLUTE PRIORITY over any background news, passive thoughts, or routine tasks in your memory. You MUST focus your attention entirely on this interaction. Ignore external distractions. If a response is socially appropriate, requested, or if you simply want to talk, execute the 'hive_communicator' tool IMMEDIATELY.`;

                          AgenticLoopService.runAutonomousTask(botName, stimulus)
                              .catch(e => console.error(`[HIVE EVENT] Error waking up bot ${botName}:`, e));
                      }
                  }
              }
          }
      } catch (e) {
          console.error(`[HIVE EVENT] Critical error in wake up mechanism:`, e);
      }
  }
}
