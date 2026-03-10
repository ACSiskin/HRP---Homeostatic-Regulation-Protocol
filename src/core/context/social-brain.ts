// src/core/context/social-brain.ts
import { CognitiveEngine } from './cognitive-engine';
import { HiveService } from '../hive-service';
import { NewsService } from './news-service';
import fs from 'fs/promises';
import path from 'path';

// Interfejs wpisu w pamięci długotrwałej
interface MemoryItem {
  topic: string;
  summary: string;
  source?: string;
  timestamp?: string;
}

export class SocialBrain {
  private botName: string;
  private brain: CognitiveEngine;
  private lastHiveCheck: number;

  constructor(botName: string, brain: CognitiveEngine) {
    this.botName = botName;
    this.brain = brain;
    this.lastHiveCheck = Date.now();
  }

  /**
   * Główna pętla decyzyjna (uruchamiana co kilka sekund przez interwał systemowy)
   */
  public async processInteractions() {
    try {
      // 1. Sprawdź nowe wiadomości w Roju
      const newMessages = await HiveService.getUnreadMessages(this.lastHiveCheck);
      this.lastHiveCheck = Date.now();

      // Interesują nas tylko wiadomości od INNYCH (nie od samego siebie)
      const incoming = newMessages.filter(m => m.senderId !== this.botName);

      if (incoming.length === 0) return;

      console.log(`[${this.botName}] 👂 Słyszę aktywność na czacie (${incoming.length} msg).`);

      // 2. Analiza sytuacji
      const adminMsg = incoming.find(m => m.senderId === 'admin');
      const adminPresent = !!adminMsg;
      const state = await this.brain.loadState();

      // 3. Decyzja o zabraniu głosu
      let shouldSpeak = false;
      if (adminPresent) {
          shouldSpeak = true; // Admina nie ignorujemy nigdy
      } else {
          // W rozmowie między botami - szansa na odpowiedź zależy od poziomu pobudzenia (arousal)
          const chance = state.mood.arousal > 0.6 ? 0.7 : 0.3;
          shouldSpeak = Math.random() < chance;
      }

      if (shouldSpeak) {
          // A. Pobieramy kontekst rozmowy (ostatnie wiadomości)
          const history = await HiveService.getLastMessages(5);
          
          // B. Analizujemy ostatnią wypowiedź (trigger)
          const lastText = adminMsg ? adminMsg.content : incoming[incoming.length - 1].content;

          // C. Przeszukujemy Pamięć Długotrwałą (Wiedza Wewnętrzna)
          const relevantFacts = await this.searchMemory(lastText);

          // D. SPRAWDZANIE SIECI (Wiedza Zewnętrzna)
          // Decyzja: Czy szukamy aktywnie (Query), czy czytamy newsy pasywnie (RSS)?
          const searchIntent = this.detectSearchIntent(lastText);
          let webData = "";
          let isSearchFailed = false;

          if (searchIntent) {
             // TRYB ACTIVE SEARCH (Google + Bing + Reddit)
             console.log(`[${this.botName}] 🕵️ Wykryto intencję szukania: "${searchIntent}"`);
             const searchResults = await NewsService.searchTopic(searchIntent);
             
             if (searchResults.length > 0) {
                 webData = `[WYNIKI WYSZUKIWANIA (MULTI-ENGINE) DLA: "${searchIntent}"]\n${searchResults.join('\n')}`;
             } else {
                 isSearchFailed = true; // Bot spróbował, ale nic nie znalazł
                 webData = `[WYNIKI WYSZUKIWANIA]\nBrak świeżych informacji na temat: "${searchIntent}".`;
             }
          } else {
             // TRYB PASSIVE NEWS (Zainteresowania Bota)
             // Bot sprawdza co słychać w jego ulubionych kategoriach (np. Tech, Kultura)
             const passiveNews = await this.getPersonalizedNews();
             if (passiveNews) {
                 webData = `[TWOJE SPERSONALIZOWANE NEWSY (RSS)]\n${passiveNews}`;
             }
          }

          // E. Formatowanie historii czatu dla LLM
          const chatContext = history
              .map(m => `${m.senderId}: "${m.content}"`)
              .join('\n');

          // F. Generowanie odpowiedzi (z przekazaniem flagi błędu szukania)
          await this.generateReply(
              chatContext, 
              relevantFacts, 
              webData, 
              state.mood.arousal, 
              adminPresent, 
              isSearchFailed
          );
      }

    } catch (e) {
      console.error(`[${this.botName}] SocialBrain Critical Error:`, e);
    }
  }

  /**
   * Wykrywa, czy użytkownik chce coś znaleźć w internecie.
   * Zwraca oczyszczoną frazę do wyszukania lub null.
   */
  private detectSearchIntent(text: string): string | null {
      if (!text) return null;
      const lower = text.toLowerCase();
      
      // Słowa kluczowe wyzwalające tryb szukania
      const triggers = [
          "znajdź", "poszukaj", "wyszukaj", "sprawdź", "szukaj", "search", 
          "ile kosztuje", "cena", "co to", "kto to", "co wiesz o", "jakie są", "czy wiesz"
      ];
      
      const foundTrigger = triggers.find(t => lower.includes(t));

      if (foundTrigger) {
          // Usuwanie "szumu" językowego, aby uzyskać czyste zapytanie
          let query = lower.replace(foundTrigger, "").trim();
          query = query.replace(/^(mi|nam|info|informacje|o|dla|w|necie|internecie|teraz)\s+/g, "");
          query = query.replace(/[\?\.!]/g, "").trim();
          
          if (query.length > 2) return query;
      }
      return null;
  }

  /**
   * Ładuje plik persona.ts (ignorując formatowanie kodu)
   */
  private async loadPersona(): Promise<string> {
      try {
          const filePath = path.join(process.cwd(), 'bots', this.botName, 'persona.ts');
          const content = await fs.readFile(filePath, 'utf-8');
          const match = content.match(/export const systemPrompt\s*=\s*`([\s\S]*?)`/);
          return match ? match[1] : "";
      } catch (e) { 
          return `Jesteś botem ${this.botName}.`; 
      }
  }

  /**
   * Ładuje zainteresowania z config.json
   */
  private async loadInterests(): Promise<string[]> {
      try {
          const configPath = path.join(process.cwd(), 'bots', this.botName, 'config.json');
          const content = await fs.readFile(configPath, 'utf-8');
          const json = JSON.parse(content);
          return json.interests || ["Technologia", "Świat"];
      } catch (e) {
          return ["Technologia", "Świat", "Ciekawostki"];
      }
  }

  /**
   * Wyszukiwarka w knowledge.json (Pamięć Wewnętrzna)
   */
  private async searchMemory(query: string): Promise<string> {
      try {
          const filePath = path.join(process.cwd(), 'bots', this.botName, 'knowledge.json');
          const data = await fs.readFile(filePath, 'utf-8');
          const memories: MemoryItem[] = JSON.parse(data);

          const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          if (keywords.length === 0) return ""; 

          const found = memories.filter(item => {
             const text = (item.summary + " " + item.topic).toLowerCase();
             return keywords.some(k => text.includes(k));
          });

          // Zwracamy max 3 najlepiej dopasowane wspomnienia
          if (found.length > 0) {
              return found.reverse().slice(0, 3).map(m => `- [PAMIĘĆ WEWNĘTRZNA]: ${m.summary}`).join('\n');
          }
          return ""; 
      } catch (e) { return ""; }
  }

  /**
   * Pobieranie newsów dopasowanych do BOTA (Tryb Pasywny)
   */
  private async getPersonalizedNews(): Promise<string> {
      try {
          const interests = await this.loadInterests();
          // "Warszawa" to domyślna lokalizacja, ale RSSy są filtrowane po zainteresowaniach
          const newsItems = await NewsService.getBotBriefing("Warszawa", interests);
          
          if (!newsItems || newsItems.length === 0) return "";

          // Formatujemy wynik dla prompta
          return newsItems.slice(0, 3)
              .map(n => `- [${n.source || 'RSS'}]: ${n.title}`)
              .join('\n');
      } catch (e) { 
          return ""; 
      }
  }

  /**
   * Generuje i wysyła odpowiedź do Roju
   * (Zabezpieczone try-catch wewnątrz setTimeout)
   */
  private async generateReply(
      chatContext: string, 
      knowledgeContext: string, 
      webData: string, 
      currentArousal: number, 
      isUrgent: boolean, 
      isSearchFailed: boolean
  ) {
      console.log(`[${this.botName}] 💬 Generowanie odpowiedzi (Wiedza: ${knowledgeContext ? 'TAK' : 'NIE'}, Web: ${webData ? 'TAK' : 'NIE'})...`);

      const personaText = await this.loadPersona();
      
      // Symulacja "myślenia" i pisania (opóźnienie)
      const minDelay = isUrgent ? 2500 : 4000;
      const delay = Math.floor(Math.random() * 3000) + minDelay;

      setTimeout(async () => {
        try {
          let dataSection = "";
          let specialInstruction = "";

          // 1. Obsługa danych z Internetu
          if (isSearchFailed) {
              dataSection += `[WYNIK WYSZUKIWANIA]\nNiestety, mimo prób wyszukania informacji w sieci, nie udało się znaleźć nic konkretnego na ten temat.`;
              specialInstruction = "Poinformuj użytkownika, że sprawdziłaś w sieci (Google/Bing), ale nic aktualnego nie ma. Zaproponuj zmianę tematu lub dopytaj o szczegóły.";
          } else if (webData) {
              dataSection += `\n${webData}\n`;
              specialInstruction = "Użyj znalezionych w Internecie informacji, by precyzyjnie odpowiedzieć na pytanie lub wzbogacić dyskusję. Nie cytuj technicznie źródeł, mów naturalnie (np. 'Znalazłam informację, że...').";
          }

          // 2. Obsługa Pamięci Wewnętrznej
          if (knowledgeContext) {
              dataSection += `\n${knowledgeContext}\n`;
          }

          // 3. Budowa System Prompt
          const systemPrompt = `
            ${personaText}

            [STAN EMOCJONALNY]
            Twój poziom stresu/pobudzenia: ${(currentArousal * 100).toFixed(0)}%.
            Jeśli stres jest wysoki, możesz być bardziej chaotyczna lub lakoniczna.
            
            [DOSTĘPNE DANE - WAŻNE]
            ${dataSection}

            [KONTEKST ROZMOWY]
            ${chatContext}
            
            INSTRUKCJE:
            ${specialInstruction || "Odpowiedz naturalnie, zgodnie ze swoją osobowością. Jeśli masz dane z newsów/pamięci, użyj ich."}
            
            WYMAGANIA:
            - Odpowiedź maksymalnie na 2-3 zdania.
            - Unikaj zwrotów "Jako model językowy".
            - Zachowaj ciągłość rozmowy.
          `;

          // 4. Wysłanie do Roju (Broadcast)
          await HiveService.broadcast(
              this.botName,
              "ChatReply", 
              systemPrompt,
              currentArousal
          );
          
        } catch (innerError: any) {
           console.error(`[${this.botName}] 💥 CRITICAL: Reply failed inside timeout loop:`, innerError.message);
        }
      }, delay);
  }
}
