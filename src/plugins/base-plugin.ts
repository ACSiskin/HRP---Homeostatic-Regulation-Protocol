// src/plugins/base-plugin.ts

/**
 * Zunifikowana odpowiedź dla wszystkich wtyczek w systemie H.R.P.
 * System 2 i System 3 będą oczekiwać dokładnie tego formatu, 
 * aby zrozumieć, co się wydarzyło w świecie zewnętrznym.
 */
export interface PluginResponse {
    success: boolean;       // Czy wykonanie wtyczki powiodło się?
    output: string;         // Główny wynik (stdout, odpowiedź z API, przeliczone dane)
    error?: string;         // Komunikat błędu (stderr, wyjątki)
    metadata?: {            // Dodatkowe dane telemetryczne
        executionTimeMs?: number;
        cost?: number;
        [key: string]: any;
    };
}

/**
 * Klasa abstrakcyjna, po której MUSI dziedziczyć każda nowa wtyczka w systemie.
 * Gwarantuje to spójność architektury i chroni rdzeń przed błędami implementacji.
 */
export abstract class BasePlugin {
    /**
     * Unikalna nazwa wtyczki (używana przez LLM w ToolBoxie)
     * Np. "system_coder", "local_file_reader", "notion_api"
     */
    abstract readonly name: string;

    /**
     * Precyzyjny opis dla Systemu 2. 
     * To na jego podstawie bot zdecyduje, czy użyć tej wtyczki do rozwiązania problemu.
     */
    abstract readonly description: string;

    /**
     * Główna logika wykonawcza wtyczki.
     * @param botName Imię bota, który wywołuje wtyczkę (do tworzenia izolowanych folderów/kontekstów)
     * @param args Argumenty w formacie JSON wygenerowane przez System 2
     */
    abstract execute(botName: string, args: any): Promise<PluginResponse>;

    /**
     * Wbudowany w matrycę mechanizm bezpiecznego logowania do konsoli.
     * Dodaje odpowiednie prefiksy do logów systemowych.
     */
    protected log(message: string): void {
        console.log(`[Plugin: ${this.name}] ⚙️ ${message}`);
    }

    protected warn(message: string): void {
        console.warn(`[Plugin: ${this.name}] ⚠️ ${message}`);
    }

    protected error(message: string, error?: any): void {
        console.error(`[Plugin: ${this.name}] ❌ ${message}`, error || '');
    }
}
