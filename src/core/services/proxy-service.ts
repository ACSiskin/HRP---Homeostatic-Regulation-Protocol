import fs from 'fs/promises';
import path from 'path';

const PROXY_FILE = path.join(process.cwd(), 'proxies.json');

export class ProxyService {
  
  static async getAll() {
    try {
      const data = await fs.readFile(PROXY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch { return []; }
  }

  static async addBulk(rawText: string) {
    try {
      const current = await this.getAll();
      const lines = rawText.split('\n').filter(line => line.trim().length > 0);

      const newProxies = lines.map(line => {
        const parts = line.trim().split(':');
        return {
          id: Math.random().toString(36).substring(7),
          ip: parts[0],
          port: parts[1],
          user: parts[2] || '',
          pass: parts[3] || '',
          protocol: 'http',
          country: 'UNK',
          status: 'UNCHECKED',
          latency: 0,
          addedAt: new Date().toISOString()
        };
      });

      const updated = [...current, ...newProxies];
      await fs.writeFile(PROXY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return newProxies.length;
    } catch { return 0; }
  }

  static async delete(id: string) {
    const current = await this.getAll();
    const updated = current.filter((p: any) => p.id !== id);
    await fs.writeFile(PROXY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  }

  static async checkStatus(id: string) {
    // Symulacja sprawdzenia (w prawdziwej produkcji tu byłby request HTTP)
    await new Promise(r => setTimeout(r, Math.random() * 1500 + 500));
    const isAlive = Math.random() > 0.2;
    const latency = Math.floor(Math.random() * 300) + 20;
    
    const current = await this.getAll();
    const updated = current.map((p: any) => {
      if (p.id === id) {
        return {
          ...p, 
          status: isAlive ? 'ONLINE' : 'OFFLINE',
          latency: isAlive ? latency : 0,
          country: ['PL', 'DE', 'US', 'FR'][Math.floor(Math.random() * 4)]
        };
      }
      return p;
    });
    
    await fs.writeFile(PROXY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return isAlive ? 'ONLINE' : 'OFFLINE';
  }
}
