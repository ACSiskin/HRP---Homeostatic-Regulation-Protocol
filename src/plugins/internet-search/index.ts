// src/plugins/internet-search/index.ts
import { BasePlugin } from '../base-plugin';
import { NewsService } from '../../core/context/news-service';

export class InternetSearchPlugin implements BasePlugin {
    name = 'internet_search';
    // Opis dla LLM - musi być po angielsku, żeby System 2 dokładnie zrozumiał, jak użyć narzędzia
    description = 'Searches the internet (Google, Bing, Reddit) in real-time. Requires an argument in JSON format: {"query": "exact phrase to search for"}. Use this tool whenever you need up-to-date information.';

    async execute(botName: string, args: any): Promise<{success: boolean, output?: string, error?: string}> {
        // Sprawdzamy, czy LLM podał poprawny obiekt JSON z polem "query"
        if (!args || !args.query) {
            return { 
                success: false, 
                error: "Execution Error: You must provide a 'query' parameter in your JSON payload." 
            };
        }

        try {
            // Logujemy próbę wyszukiwania w konsoli serwera dla debugowania
            console.log(`[InternetSearchPlugin] 🌐 ${botName} is executing web search for: "${args.query}"`);
            
            // Wykorzystujemy już istniejący, solidny serwis do szukania (bez pisania scraperów w Pythonie)
            const results = await NewsService.searchTopic(args.query);
            
            if (results.length === 0) {
                 return { 
                     success: true, 
                     output: "No recent information found on the internet for this query. Try different keywords." 
                 };
            }

            // Łączymy wyniki w jeden tekst i zwracamy do Systemu 2
            return { 
                success: true, 
                output: `[LIVE WEB RESULTS FOR: "${args.query}"]\n${results.join('\n')}` 
            };
            
        } catch (e: any) {
            return { 
                success: false, 
                error: `Critical search failure: ${e.message}` 
            };
        }
    }
}
