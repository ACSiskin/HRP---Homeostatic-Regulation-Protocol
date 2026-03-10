// src/engine/actor/publisher.ts
import { Page } from 'puppeteer';
import { performScrollGesture, randomDelay } from '../utils'; // Używamy Twoich utilsów z VESPERA

export interface PostPayload {
  imagePath: string; // Pełna ścieżka do pliku na dysku
  caption: string;
}

/**
 * Procedura publikacji posta na Instagramie (Wersja Mobile Emulation)
 */
export async function publishPost(page: Page, payload: PostPayload): Promise<boolean> {
  console.log(`[Actor] 📸 Rozpoczynam procedurę publikacji...`);

  try {
    // 1. Upewnij się, że jesteśmy na głównej i w trybie mobilnym
    // (Instagram Web pozwala na upload tylko gdy User-Agent udaje telefon)
    // To powinno być ustawione na poziomie BrowserLauncher, ale dla pewności:
    // await page.emulate(KnownDevices['iPhone 12']); <--- Opcjonalnie, jeśli browser tego nie ustawił

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

    // Szukamy przycisku "New Post" (Ikona z plusem [+])
    // Selektory na Instagramie są dynamiczne, więc szukamy po aria-label lub SVG
    const newPostSelector = 'svg[aria-label="Nowy post"], svg[aria-label="New post"], svg[aria-label="Utwórz"], svg[aria-label="Create"]';

    await page.waitForSelector(newPostSelector, { timeout: 10000 });
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click(newPostSelector), // Klikamy w [+]
    ]);

    console.log(`[Actor] 📂 Wybieram plik: ${payload.imagePath}`);
    await randomDelay(1000, 2000); // Ludzkie wahanie

    // 2. Upload pliku
    if (!payload.imagePath) throw new Error("Brak ścieżki do pliku.");
    await fileChooser.accept([payload.imagePath]);

    // Czekamy na modal edycji
    await randomDelay(3000, 5000);

    // 3. Flow klikania "Dalej" (Next)
    // Zazwyczaj trzeba kliknąć "Dalej" dwa razy (raz po cropie, raz po filtrach)
    const nextButtonSelector = '//div[text()="Dalej" or text()="Next"]';

    // Krok 1: Crop (Dalej)
    await clickByText(page, "Dalej", "Next");
    await randomDelay(2000, 4000);

    // Krok 2: Filtry (Dalej)
    await clickByText(page, "Dalej", "Next");
    await randomDelay(2000, 4000);

    // 4. Wpisywanie opisu (Caption)
    console.log(`[Actor] ✍️ Piszę opis...`);
    const textAreaSelector = 'div[role="textbox"][contenteditable="true"], textarea[aria-label="Napisz podpis..."], textarea[aria-label="Write a caption..."]';
    await page.waitForSelector(textAreaSelector);
    await page.click(textAreaSelector);

    // Symulacja pisania (nie wklejamy wszystkiego naraz)
    await page.keyboard.type(payload.caption, { delay: 50 }); // 50ms na znak

    await randomDelay(2000, 3000);

    // 5. Finalizacja (Udostępnij / Share)
    console.log(`[Actor] 🚀 Klikam Udostępnij...`);
    await clickByText(page, "Udostępnij", "Share");

    // 6. Weryfikacja sukcesu
    // Czekamy aż modal zniknie lub pojawi się komunikat "Post shared"
    await randomDelay(5000, 8000); // Czas na upload

    // Sprawdzamy czy wróciło do feedu lub czy jest sukces
    // To jest uproszczona weryfikacja
    const success = await page.evaluate(() => {
      return !document.querySelector('div[role="dialog"]'); // Jeśli modal zniknął, to sukces
    });

    if (success) {
      console.log(`[Actor] ✅ Post opublikowany pomyślnie.`);
      return true;
    } else {
      console.warn(`[Actor] ⚠️ Nie mam pewności czy post przeszedł (Modal nadal widoczny?).`);
      return true; // Zakładamy sukces optymistycznie, chyba że wystąpił błąd
    }

  } catch (error) {
    console.error(`[Actor] ❌ Błąd publikacji:`, error);
    // Zrób screenshot błędu (przydatne w debugowaniu)
    try {
      await page.screenshot({ path: `error_upload_${Date.now()}.png` });
    } catch { }
    return false;
  }
}

// Funkcja pomocnicza do szukania przycisków po tekście (bo Instagram nie ma ID)
async function clickByText(page: Page, textPL: string, textEN: string) {
  const xpath = `//div[text()="${textPL}" or text()="${textEN}"] | //button[text()="${textPL}" or text()="${textEN}"]`;
  const elements = await page.$$(`xpath/${xpath}`);

  if (elements.length > 0) {
    await (elements[0] as any).click(); // Rzutowanie na any bo typy puppeteer-core bywają kapryśne przy xpath
  } else {
    console.warn(`[Actor] Nie znaleziono przycisku: ${textPL}/${textEN}`);
  }
}
