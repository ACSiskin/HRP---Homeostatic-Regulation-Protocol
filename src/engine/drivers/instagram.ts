// src/engine/drivers/instagram.ts
import { Page } from 'puppeteer';

export class InstagramDriver {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Sprawdza sesję (szuka elementu Home lub Profilu)
   */
  async validateSession(): Promise<boolean> {
    try {
      // Szukamy ikonki domku (Home) lub serduszka, co świadczy o zalogowaniu
      await this.page.waitForSelector('svg[aria-label="Home"], svg[aria-label="Strona główna"]', { timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * [LURKER MODE] Scrolluje feed i zbiera teksty do analizy.
   * Nie lajkuje, nie komentuje. Tylko patrzy.
   */
  async observeFeed(durationSeconds: number = 30): Promise<string[]> {
    console.log('[InstagramDriver] 👀 Obserwuję otoczenie (Passive Mode)...');
    const collectedTexts: string[] = [];
    const endTime = Date.now() + (durationSeconds * 1000);

    while (Date.now() < endTime) {
      // 1. Scraping widocznych opisów (szukamy w tagach article)
      const visibleTexts = await this.page.evaluate(() => {
        const posts = document.querySelectorAll('article');
        return Array.from(posts).map(p => {
          // Próba znalezienia opisu (Instagram często zmienia klasy, szukamy po strukturze)
          const textElement = p.querySelector('ul li span');
          return textElement ? textElement.textContent || '' : '';
        }).filter(t => t.length > 15); // Ignorujemy puste/krótkie
      });

      collectedTexts.push(...visibleTexts);

      // 2. Scroll w dół (humanizowany)
      await this.page.evaluate(() => window.scrollBy(0, 600 + Math.random() * 400));

      // 3. Pauza na "czytanie"
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    }

    // Unikalne teksty
    return Array.from(new Set(collectedTexts));
  }

  /**
   * Publikuje post (Placeholder - tu przeniesiemy logikę publishera)
   */
  async postContent(imagePath: string, caption: string): Promise<boolean> {
    console.log(`[InstagramDriver] 📸 Symulacja publikacji: "${caption.substring(0, 30)}..."`);
    await new Promise(r => setTimeout(r, 3000));
    return true;
  }
}
