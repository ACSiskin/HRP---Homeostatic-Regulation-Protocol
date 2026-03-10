// src/core/services/bot-config-service.ts
import fs from 'fs/promises';
import path from 'path';
import { BotConfig } from '../types';

/**
 * SERWIS: BotConfigService
 * ODPOWIEDZIALNOŚĆ: Zarządzanie plikami konfiguracyjnymi, profilami, mediami i sesjami na dysku.
 */
export class BotConfigService {
  
  private static getBotPath(botName: string) {
    return path.join(process.cwd(), 'bots', botName.toLowerCase().replace(/\s+/g, '-'));
  }

  // --- 1. RUNTIME CONFIG (config.json) ---
  static async loadRuntimeConfig(botName: string): Promise<Partial<BotConfig>> {
    try {
      const configPath = path.join(this.getBotPath(botName), 'config.json');
      const fileContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (e) {
      return {};
    }
  }

  // NOWOŚĆ: Zapis aktualizacji konfiguracji (używane przez główny przełącznik Systemu 3)
  static async updateRuntimeConfig(botName: string, updates: Partial<BotConfig>): Promise<void> {
    const configPath = path.join(this.getBotPath(botName), 'config.json');
    let currentConfig: Partial<BotConfig> = {};
    
    try {
      const fileContent = await fs.readFile(configPath, 'utf-8');
      currentConfig = JSON.parse(fileContent);
    } catch (e) {
      // Jeśli plik nie istnieje, tworzymy nowy z podstawami
      currentConfig = { name: botName };
    }

    const newConfig = { ...currentConfig, ...updates };
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
  }

  // --- 2. PERSONA (persona.ts) ---
  static async getPersonaConfig(botName: string): Promise<string> {
    try {
      const filePath = path.join(this.getBotPath(botName), 'persona.ts');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error('Nie znaleziono pliku persona.ts');
    }
  }

  static async savePersonaConfig(botName: string, content: string): Promise<void> {
    const filePath = path.join(this.getBotPath(botName), 'persona.ts');
    await fs.writeFile(filePath, content, 'utf-8');
  }

  // --- 3. PROFILE (profile.json) ---
  static async getProfile(botName: string): Promise<any> {
    try {
      const profilePath = path.join(this.getBotPath(botName), 'profile.json');
      const fileContent = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch {
      // Default fallback structure
      return { age: "", location: "", job: "", edu: "", traits: [], interests: [] };
    }
  }

  static async saveProfile(botName: string, data: any): Promise<void> {
    const profilePath = path.join(this.getBotPath(botName), 'profile.json');
    await fs.writeFile(profilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- 4. MEDIA (files) ---
  static async getMediaFiles(botName: string): Promise<string[]> {
    try {
      const mediaPath = path.join(this.getBotPath(botName), 'media');
      try { 
        await fs.access(mediaPath); 
      } catch { 
        await fs.mkdir(mediaPath, { recursive: true }); 
        return []; 
      }
      const files = await fs.readdir(mediaPath);
      return files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    } catch {
      return [];
    }
  }

  // --- 5. SESSION & CREDENTIALS ---
  static async saveCredentials(botName: string, data: any): Promise<void> {
    const credsPath = path.join(this.getBotPath(botName), 'credentials.json');
    await fs.writeFile(credsPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async getCredentials(botName: string): Promise<any> {
    try {
      const credsPath = path.join(this.getBotPath(botName), 'credentials.json');
      const data = await fs.readFile(credsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { login: '', password: '', twoFactor: '' };
    }
  }

  static async checkSessionStatus(botName: string): Promise<{ status: 'ACTIVE' | 'EXPIRED' | 'MISSING', lastCheck: Date | null }> {
    try {
      const cookiesPath = path.join(this.getBotPath(botName), 'cookies.json');
      await fs.access(cookiesPath);
      const stats = await fs.stat(cookiesPath);
      const hoursSinceUpdate = (new Date().getTime() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > 24) return { status: 'EXPIRED', lastCheck: stats.mtime };
      return { status: 'ACTIVE', lastCheck: stats.mtime };
    } catch {
      return { status: 'MISSING', lastCheck: null };
    }
  }

  static async clearSessionFiles(botName: string): Promise<void> {
    const cookiesPath = path.join(this.getBotPath(botName), 'cookies.json');
    try { await fs.unlink(cookiesPath); } catch (e) { }
  }

  // --- 6. BOT CREATION (File System Operations) ---
  static async createBotFileSystem(name: string): Promise<void> {
    const templatePath = path.join(process.cwd(), 'bots', '_template');
    const newBotPath = this.getBotPath(name);

    // Check strict existence
    try { 
        await fs.access(newBotPath); 
        throw new Error('Bot folder already exists'); 
    } catch (e: any) {
        if (e.message === 'Bot folder already exists') throw e;
    }

    await fs.cp(templatePath, newBotPath, { recursive: true });
  }
}
