// src/core/context/news-service.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsItem {
    title: string;
    url: string;
    source: string;
    summary?: string;
    imageUrl?: string;
}

// === BAZA ŹRÓDEŁ (DIRECT FEEDS) ===
// Podział na PL (70%) i GLOBAL (30%)
const RSS_CHANNELS = {
    CULTURE: { // Dla trybu "Comfort" (Sztuka, Muzyka, Mindfulness)
        PL: [
            'https://kultura.onet.pl/.feed',
            'https://kultura.gazeta.pl/pub/rss/kultura_muzyka.xml',
            'https://zwierciadlo.pl/feed'
        ],
        GLOBAL: [
            'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', // BBC Culture
            'https://www.artnews.com/feed/', // Art News
            'https://hyperallergic.com/feed/' // Sztuka alternatywna
        ]
    },
    TECH: { // Dla zainteresowań: Technologia, AI, Nauka
        PL: [
            'https://spidersweb.pl/feed',
            'https://antyweb.pl/feed',
            'https://whatnext.pl/feed/'
        ],
        GLOBAL: [
            'https://techcrunch.com/feed/',
            'https://www.theverge.com/rss/index.xml',
            'https://www.wired.com/feed/rss'
        ]
    },
    WORLD: { // Dla zainteresowań: Świat, Polityka, Kryzys
        PL: [
            'https://wiadomosci.gazeta.pl/pub/rss/wiadomosci_swiat.xml',
            'https://tvn24.pl/swiat.xml'
        ],
        GLOBAL: [
            'http://feeds.bbci.co.uk/news/world/rss.xml',
            'https://www.aljazeera.com/xml/rss/all.xml',
            'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'
        ]
    },
    BIZ: { // Dla zainteresowań: Ekonomia, Giełda, Pieniądze
        PL: [
            'https://businessinsider.com.pl/.feed',
            'https://www.bankier.pl/rss/wiadomosci.xml'
        ],
        GLOBAL: [
            'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', // CNBC Finance
            'https://feeds.bloomberg.com/markets/news.xml'
        ]
    },
    LOCAL: { // Tylko PL (Warszawa itp.)
        PL: [
            'https://tvn24.pl/warszawa.xml',
            'https://warszawa.naszemiasto.pl/rss/wydarzenia.xml'
        ],
        GLOBAL: [] // Brak odpowiednika
    },
    // --- NOWE KATEGORIE (Dla Sary i Anny) ---
    LIFESTYLE: { // Psychologia, Relacje, Intymność, Sex-Positive Edu (Sara)
        PL: [
            'https://anchor.fm/s/a92ccc58/podcast/rss',
            'https://natemat.pl/c/zdrowie/feed',
            'https://proseksualna.pl/feed/',           // Blog Natalii Grubizny
            'https://rozkoszna.pl/feed/',              // Blog o rozkoszy
            'https://seksdobrywszystkim.pl/feed/',     // Blog Ani
            'https://kobieta.wp.pl/rss.xml'
        ],
        GLOBAL: [
            'http://www.psychologytoday.com/blog/irrelationship/feed', // Baza psychologiczna
            'https://www.girlonthenet.com/feed/',      // Erotic/Relational Blog
            'https://sugarbutch.net/feed/',            // Queer/Lifestyle
            'https://www.refinery29.com/rss.xml'
        ]
    },
    ADULT_BIZ: { // Branża Adult, Swing, Biznes Erotyczny, Lifestyle (Anna)
        PL: [
            'https://swingwithme.pl/feed/',            // Blog pary swingersów
            'https://erodate.pl/blog/feed/',           // Erodate Blog
            'https://eross.pl/feed/',
            'https://erotrends.pl/feed/',
            'https://swingwithme.pl/feed/'
            
        ],
        GLOBAL: [
            'https://avn.com/feed/xml/news/all',       // AVN News (Branżowe)
            'https://www.xbiz.com/rss/news/all',       // XBIZ (Biznesowe)
            'https://www.ynot.com/feed/',              // YNOT (Cam/Tech)
            'https://bedhoppers.co.uk/feed/',          // Swing Lifestyle Podcast/Blog
            'https://blog.swinglifestyle.com/feed/',    // Swing Blog
            'https://feed.podbean.com/shoppes77/feed.xml', 
            'https://swingersadventuresmagazine.com/feed/',
            'https://news.google.com/rss/search?q=site:hustlermagazine.com&hl=en-US&gl=US&ceid=US:en',
            'https://www.swingerlifestyle.com/feed',
            'https://lifestylersmagazine.com/feed/'
            
        ]
    }
};

const cache: { [key: string]: { data: NewsItem[], timestamp: number } } = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minut cache

// Nagłówek udający przeglądarkę (zapobiega blokadom Google/Reddit)
const BROWSER_HEADER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7'
};

export class NewsService {

    /**
     * Główna metoda pobierania newsów (Pasywna - RSS).
     * Decyduje o kategorii i o tym, czy pobrać PL czy GLOBAL.
     */
    static async getBotBriefing(city: string, interests: string[]): Promise<NewsItem[]> {
        const query = interests.join(' ').toLowerCase();
        const cacheKey = `briefing_${city}_${interests.sort().join('_')}`;

        // 1. Cache Check
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TTL)) {
            return cache[cacheKey].data;
        }

        try {
            let selectedUrls: string[] = [];
            let sourceMode = 'PL';

            // 2. Wykrywanie Kategorii (Intencja)
            let category: keyof typeof RSS_CHANNELS | null = null;

            if (query.includes('sztuka') || query.includes('muzyka') || query.includes('przyroda') || query.includes('mindfulness') || query.includes('kultura')) {
                category = 'CULTURE';
            } else if (query.includes('technologia') || query.includes('ai') || query.includes('nauka') || query.includes('cyfrow')) {
                category = 'TECH';
            } else if (query.includes('ekonomia') || query.includes('giełda') || query.includes('pieniądze') || query.includes('finanse') || query.includes('biznes') || query.includes('bankowość')) {
                category = 'BIZ';
            } else if (query.includes('świat') || query.includes('wojna') || query.includes('polityka') || query.includes('kryzys')) {
                category = 'WORLD';
            } else if (query.includes('warszawa') || query.includes('lokalne')) {
                category = 'LOCAL';
            } 
            // --- DETEKCJA NOWYCH KATEGORII ---
            else if (query.includes('psychologia') || query.includes('relacje') || query.includes('randki') || query.includes('flirt') || query.includes('intymność') || query.includes('wellness') || query.includes('styl') || query.includes('kobieta')) {
                 category = 'LIFESTYLE';
            } else if (query.includes('seks') || query.includes('porno') || query.includes('swing') || query.includes('erotyka') || query.includes('adult') || query.includes('branża')) {
                 category = 'ADULT_BIZ';
            }

            // 3. Losowanie PL (70%) vs GLOBAL (30%)
            const isGlobal = Math.random() > 0.7; // 30% szans na świat

            if (category) {
                // Sprawdzenie czy mamy URL-e w danej kategorii (np. ADULT_BIZ PL jest pusty)
                const targetPool = isGlobal ? RSS_CHANNELS[category].GLOBAL : RSS_CHANNELS[category].PL;
                
                if (targetPool.length > 0) {
                    selectedUrls = targetPool;
                    sourceMode = isGlobal ? 'GLOBAL' : 'PL';
                } else {
                    // Fallback jeśli np. wylosowało PL a lista pusta -> bierzemy GLOBAL
                    selectedUrls = RSS_CHANNELS[category].GLOBAL;
                    sourceMode = 'GLOBAL (Fallback)';
                }
                
                // Jeśli nadal pusto (co nie powinno się zdarzyć), fallback do Bing
                if (selectedUrls.length === 0) category = null;
                else console.log(`[NewsService] 🎯 Category: ${category} | Mode: ${sourceMode}`);
            } 
            
            if (!category) {
                // Fallback dla Adama (specyficzne inżynierskie tematy) i innych niszowych zapytań
                console.log(`[NewsService] 🌍 No dedicated RSS category for "${query}". Using Bing Search.`);
                const searchQuery = `${city} ${interests.join(' ')}`;
                const bingUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(searchQuery)}&format=rss`;
                selectedUrls = [bingUrl];
            }

            // 4. Pobieranie i Parsowanie
            // Pobieramy z max 2 źródeł na raz, żeby nie mulić
            const targetUrls = selectedUrls.sort(() => Math.random() - 0.5).slice(0, 2);
            let allItems: NewsItem[] = [];

            for (const url of targetUrls) {
                try {
                    const response = await axios.get(url, { timeout: 6000, headers: BROWSER_HEADER });
                    const $ = cheerio.load(response.data, { xmlMode: true });

                    $('item').each((i, el) => {
                        if (i >= 5) return;

                        const title = $(el).find('title').text();
                        const link = $(el).find('link').text();
                        let origin = $(el).find('source').text();
                        if (!origin) {
                            try { origin = new URL(link).hostname.replace('www.', ''); } catch { origin = 'RSS'; }
                        }

                        if (link && title) {
                            allItems.push({ title, url: link, source: origin });
                        }
                    });
                } catch (e) {
                    console.warn(`[NewsService] Error retrieving the feed. ${url}`);
                }
            }

            // Mieszamy wyniki, żeby bot nie czytał zawsze pierwszego z brzegu
            allItems = allItems.sort(() => Math.random() - 0.5);
            
            cache[cacheKey] = { data: allItems, timestamp: Date.now() };
            return allItems;

        } catch (error) {
            console.error("[NewsService] Critical Error:", error);
            return [];
        }
    }

    /**
     * DEEP DIVE: Pobieranie pełnej treści (Uniwersalne)
     */
    static async fetchFullArticle(url: string): Promise<string | null> {
        try {
            console.log(`[NewsService] 🕵️ Deep Dive: ${url}`);

            const response = await axios.get(url, { headers: BROWSER_HEADER, timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);

            // --- CZYSZCZENIE ---
            $('script, style, nav, footer, header, aside, iframe, .ad, .advertisement, .cookie-banner, .social-share, .comments, .meta').remove();
            $('.paywall-box, .wideo-player, .gallery, .read-more, .newsletter-signup').remove();

            let content = "";

            // --- STRATEGIA 1: Szukanie kontenera semantycznego ---
            const selectors = [
                'article',
                '[class*="article-body"]',
                '[class*="post-content"]',
                '.entry-content',
                '.story-body',
                '.article__content',
                '#main-content'
            ];

            for (const selector of selectors) {
                const container = $(selector);
                if (container.length > 0 && container.text().length > 300) {
                    container.find('p').each((i, el) => {
                        const txt = $(el).text().trim();
                        if (txt.length > 40) content += txt + "\n\n";
                    });
                    if (content.length > 200) break;
                }
            }

            // --- STRATEGIA 2: Fallback ---
            if (content.length < 100) {
                $('p').each((i, el) => {
                    const text = $(el).text().trim();
                    if (text.length > 60 && !text.includes('Copyright') && !text.includes('Subscribe')) {
                        content += text + "\n\n";
                    }
                });
            }

            if (content.length < 100) return null;

            const maxLength = 3000;
            if (content.length > maxLength) {
                return content.substring(0, maxLength) + "... [Truncated.]";
            }

            return content;

        } catch (e: any) {
            console.warn(`[NewsService] Błąd pobierania: ${e.message}`);
            return null;
        }
    }

/**
     * KOMBAJN WYSZUKIWANIA (MULTI-ENGINE SEARCH)
     * Agreguje wyniki z Google, Bing i Reddit, aby dać botom szerszy kontekst.
     */
    static async searchTopic(query: string): Promise<string[]> {
        console.log(`[NewsService] 🚀 Initiating Multi-Search for: "${query}"...`);
        const encoded = encodeURIComponent(query);
        const results: string[] = [];

        // Definiujemy silniki wyszukiwania
        const engines = [
            {
                name: 'Google News',
                url: `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`, // Ustawione na EN
                itemSelector: 'item',
                limit: 3
            },
            {
                name: 'Bing News',
                url: `https://www.bing.com/news/search?q=${encoded}&format=rss`,
                itemSelector: 'item',
                limit: 3
            },
            {
                name: 'Reddit', // Dla opinii i "ludzkiego" głosu
                url: `https://www.reddit.com/search.rss?q=${encoded}&sort=relevance&t=week`,
                itemSelector: 'entry', // Reddit używa Atom feed (entry zamiast item)
                limit: 2
            }
        ];

        try {
            // Uruchamiamy wszystkie zapytania RÓWNOLEGLE (dla szybkości)
            const promises = engines.map(async (engine) => {
                try {
                    const response = await axios.get(engine.url, { timeout: 5000, headers: BROWSER_HEADER });
                    const $ = cheerio.load(response.data, { xmlMode: true });

                    let count = 0;
                    $(engine.itemSelector).each((i, el) => {
                        if (count >= engine.limit) return;

                        let title = $(el).find('title').text();
                        let snippet = '';

                        // Reddit specific cleanup
                        if (engine.name === 'Reddit') {
                            const author = $(el).find('author > name').text();
                            title = `(u/${author}) ${title}`;
                            // Wyciągamy zawartość i czyścimy z tagów HTML
                            snippet = $(el).find('content').text().replace(/(<([^>]+)>)/gi, "").trim().substring(0, 250);
                        } else {
                            // Google/Bing source cleanup
                            const source = $(el).find('source').text();
                            if (source) title = `[${source}] ${title}`;
                            // Wyciągamy krótki opis z RSS i czyścimy z tagów HTML
                            snippet = $(el).find('description').text().replace(/(<([^>]+)>)/gi, "").trim().substring(0, 250);
                        }

                        // Ignorujemy śmieci (uwzględnia EN 'sponsored' i PL 'sponsorowane' na wszelki wypadek)
                        const lowerTitle = title.toLowerCase();
                        if (title && !lowerTitle.includes('sponsored') && !lowerTitle.includes('sponsorowane') && title.length > 15) {
                            // NOWOŚĆ: Dodajemy snippet ("Snippet:" zamiast "Fragment:")
                            results.push(`[${engine.name}] ${title}\n   Snippet: ${snippet}...`);
                            count++;
                        }
                    });
                } catch (e) {
                    console.warn(`[NewsService] ⚠️ ${engine.name} failed (fallback available).`);
                }
            });

            // Czekamy aż wszystkie skończą (lub padną)
            await Promise.allSettled(promises);

            // Usuwamy duplikaty
            const uniqueResults = Array.from(new Set(results));

            console.log(`[NewsService] ✅ Found ${uniqueResults.length} unique results in total.`);
            return uniqueResults.slice(0, 6); // Zwracamy max 6 najlepszych

        } catch (e: any) {
            console.error(`[NewsService] ❌ Critical Search Error: ${e.message}`);
            return [];
        }
    }
    }
