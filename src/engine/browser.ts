// src/engine/browser.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { ProxyConfig } from '../core/types';

// Aktywacja wtyczki Stealth
puppeteer.use(StealthPlugin());

// --- GLOBALNY GARBAGE COLLECTOR DLA CHROME ---
const activeBrowsers: Set<Browser> = new Set();

const cleanupBrowsers = async () => {
  if (activeBrowsers.size === 0) return;
  console.log(`[BrowserLauncher] 🧹 Cleaning up ${activeBrowsers.size} hanging Chrome processes...`);
  
  const promises = Array.from(activeBrowsers).map(async (browser) => {
    try {
      await browser.close();
    } catch (e) {
      // Ignorujemy błędy, jeśli proces już nie żyje
    }
  });
  
  await Promise.all(promises);
  activeBrowsers.clear();
  console.log(`[BrowserLauncher] ✅ RAM freed.`);
};

['exit', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((signal) => {
  process.on(signal, async () => {
    await cleanupBrowsers();
    if (signal !== 'exit') process.exit();
  });
});
// ---------------------------------------------

export class BrowserLauncher {
  
  static async launchBrowser(proxy?: ProxyConfig): Promise<Browser> {
    const args = [
      // Podstawa dla systemów Linux / Root
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      
      // KRYTYCZNE DLA KALI LINUX / MASZYN WIRTUALNYCH (ZAPOBIEGA SILENT CRASHOM)
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-features=viz.display.compositor',
      
      // Reszta flag z Twojego projektu
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
      '--lang=pl-PL,pl',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--mute-audio',
      '--no-first-run',
      '--no-zygote'
    ];

    if (proxy) {
      args.push(`--proxy-server=${proxy.ip}:${proxy.port}`);
      console.log(`[BrowserLauncher] 🌍 Setting up proxy: ${proxy.ip}`);
    }

    try {
      const browser = await puppeteer.launch({
        headless: true, 
        args: args,
        ignoreDefaultArgs: ['--enable-automation'],
        pipe: true,
        // KALI LINUX FALLBACK: 
        // Jeśli nadal nie działa, zainstaluj w terminalu: sudo apt install chromium
        // A następnie ODKOMENTUJ poniższą linijkę:
         executablePath: '/usr/bin/chromium',
      });

      activeBrowsers.add(browser);

      browser.on('disconnected', () => {
        activeBrowsers.delete(browser);
      });

      return browser;
    } catch (error: any) {
      console.error(`[BrowserLauncher] ❌ Critical Launch Error: ${error.message}`);
      throw error;
    }
  }

  static async setupPage(browser: Browser, cookies: any[] = []): Promise<Page> {
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setExtraHTTPHeaders({ 
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8' 
    });

    if (cookies && cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    return page;
  }
}
