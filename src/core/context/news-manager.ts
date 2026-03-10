// src/core/context/news-manager.ts
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { NewsService } from './news-service';
import { CognitiveEngine } from './cognitive-engine';
import { BotConfig } from '../types';
import { getBotProfile } from '../../app/actions'; // Importujemy helpera do profilu

// Pamięć podręczna serwera na czasy ostatnich odwiedzin
const PERCEPTION_COOLDOWN: Record<string, number> = {};
const COOLDOWN_MINUTES = 10;

export class NewsManager {

    /**
     * Główna pętla autonomicznej percepcji.
     * Wywoływana przez "bicie serca" bota (getBotMentalState).
     */
    static async runAutonomicPerception(botName: string) {
        try {
            // 1. Sprawdź Cooldown (Ochrona przed spamowaniem API)
            const lastRun = PERCEPTION_COOLDOWN[botName] || 0;
            const now = Date.now();
            const timeDiff = (now - lastRun) / 1000 / 60; // w minutach

            if (timeDiff < COOLDOWN_MINUTES) {
                return; // Za wcześnie, ignorujemy cicho
            }

            // Zaktualizuj czas, blokujemy kolejne wywołania
            PERCEPTION_COOLDOWN[botName] = now;
            console.log(`[NewsManager] 👁️ ${botName} rozgląda się z własnej woli...`);

            // 2. Pobierz konfigurację (Zainteresowania + Lokalizacja)
            const config = await this.loadConfig(botName);
            const { data: profile } = await getBotProfile(botName);

            const city = profile?.location || "Warszawa";
            // Domyślne zainteresowania, jeśli config pusty
            const interests = config.interests || ["Technologia", "Świat"];

            // 3. Pobierz Newsy z NewsService (Pobiera więcej, np. 6-10 sztuk)
            const allNewsItems = await NewsService.getBotBriefing(city, interests);

            if (allNewsItems.length === 0) return;

            // 4. TASOWANIE (SHUFFLE) - Kluczowe dla różnorodności!
            // Dzięki temu Adam i Amelia, nawet mając te same źródła, wybiorą inne artykuły.
            const shuffledNews = allNewsItems.sort(() => Math.random() - 0.5);

            // 5. Przetwarzanie przez Mózg z filtrowaniem duplikatów
            const engine = new CognitiveEngine(botName);
            let processedCount = 0;
            const MAX_ARTICLES_PER_SESSION = 2; // Ile max przeczytać na raz

            for (const news of shuffledNews) {
                // Limit na sesję
                if (processedCount >= MAX_ARTICLES_PER_SESSION) break;

                // A. Sprawdź czy już czytał (Pamięć długotrwała)
                const alreadyRead = await engine.hasRead(news.url);
                if (alreadyRead) {
                    // console.log(`[NewsManager] ⏩ ${botName} pominął (już czytane): ${news.title}`);
                    continue; // Skocz do następnego wylosowanego
                }

                // B. Analiza wizualna (opcjonalnie)
                const visualTriggers = ['zobacz', 'zdjęcia', 'wideo', 'skandal', 'wygląda', 'foto', 'galeria'];
                const titleLower = news.title.toLowerCase();
                const isInterestingVisual = visualTriggers.some(t => titleLower.includes(t));
                let useVision = (isInterestingVisual || Math.random() > 0.7) && !!news.imageUrl;

                // C. Wstrzyknięcie bodźca do silnika
                await engine.processStimuli(
                    [`[NEWS] ${news.title} (${news.summary?.substring(0, 100) || "..."})`],
                    'NEWS',
                    useVision ? news.imageUrl : undefined
                );

                // D. Oznacz jako przeczytane (żeby nie czytać jutro tego samego)
                await engine.markAsRead(news.url);
                processedCount++;
            }

            if (processedCount > 0) {
                console.log(`[NewsManager] ✅ ${botName} przyswoił ${processedCount} nowych informacji.`);

                // [FIX] Zapisz to w bazie jako akcję
                const botRef = await prisma.botState.findUnique({ where: { name: botName } });
                if (botRef) {
                    await prisma.log.create({
                        data: {
                            botId: botRef.id,
                            level: 'SUCCESS',
                            message: `Knowledge Update: Analyzed and absorbed ${processedCount} new articles.`
                        }
                    });
                }
            } else {
                // Opcjonalnie: Logujemy też brak newsów, żeby widać było, że szukał
                console.log(`[NewsManager] 💤 ${botName} nie znalazł nic nowego.`);
            }

        } catch (e) {
            console.error("[NewsManager] Error:", e);
        }
    }

    // Helper do ładowania configu (skopiowany z actions, żeby był niezależny)
    private static async loadConfig(botName: string): Promise<Partial<BotConfig>> {
        try {
            const configPath = path.join(process.cwd(), 'bots', botName.toLowerCase().replace(/\s+/g, '-'), 'config.json');
            const fileContent = await fs.readFile(configPath, 'utf-8');
            return JSON.parse(fileContent);
        } catch (e) {
            return {};
        }
    }
}
