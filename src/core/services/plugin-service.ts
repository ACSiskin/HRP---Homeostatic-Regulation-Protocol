// src/core/services/plugin-service.ts
import { BasePlugin } from '../../plugins/base-plugin';
import { SystemCoderPlugin } from '../../plugins/system-coder/index';
import { LocalFSPlugin } from '../../plugins/local-fs/index';
import { ToolForgePlugin } from '../../plugins/tool-forge/index'; 
import { InternetSearchPlugin } from '../../plugins/internet-search/index'; // <--- DODANY IMPORT WYSZUKIWARKI
import { HiveCommunicatorPlugin } from '../../plugins/hive-communicator/index';

export class PluginService {
    // 1. Rejestr (Registry) wszystkich dostępnych wtyczek w systemie H.R.P.
    // Dodając nową wtyczkę w przyszłości, po prostu dopisujesz ją tutaj.
    private static plugins: Map<string, BasePlugin> = new Map<string, BasePlugin>([
        ["system_coder", new SystemCoderPlugin()],
        ["local_fs", new LocalFSPlugin()],
        ["tool_forge", new ToolForgePlugin()],
        ["internet_search", new InternetSearchPlugin()],
        ["hive_communicator", new HiveCommunicatorPlugin()] // <--- DODAJ TO
    ]);

    /**
     * Zwraca listę dostępnych wtyczek (nazwa + opis).
     * Przydatne, jeśli w przyszłości będziemy chcieli dynamicznie wstrzykiwać
     * tę listę do promptu Systemu 2.
     */
    public static getAvailablePlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            name: p.name,
            description: p.description
        }));
    }

    /**
     * Główny router wykonawczy. Odbiera żądanie od bota, szuka wtyczki i ją odpala.
     * @param botName Imię bota (wymagane do izolacji Workspace'u)
     * @param pluginName Nazwa wtyczki (np. "system_coder" lub "local_fs")
     * @param args Argumenty w formacie JSON (np. { filename: "...", code: "..." })
     */
    public static async runPlugin(botName: string, pluginName: string, args: any): Promise<string> {
        const plugin = this.plugins.get(pluginName);
        
        if (!plugin) {
            console.warn(`[PluginService] ⚠️ Plugin '${pluginName}' not found.`);
            return `[PLUGIN ERROR] Plugin '${pluginName}' does not exist or is not loaded.`;
        }

        console.log(`[PluginService] 🔌 Bot '${botName}' is invoking plugin: ${pluginName}`);
        
        try {
            // Wykonanie logiki wtyczki
            const result = await plugin.execute(botName, args);
            
            // Tłumaczenie zunifikowanego obiektu PluginResponse na czysty tekst dla LLM-a
            if (result.success) {
                return `[PLUGIN OUTPUT - ${pluginName}]\n${result.output}`;
            } else {
                return `[PLUGIN CRASH - ${pluginName}]\nExecution Error:\n${result.error}\nPartial Output:\n${result.output}`;
            }
        } catch (e: any) {
            // Łapanie krytycznych błędów (np. brak pamięci RAM, błędy uprawnień)
            console.error(`[PluginService] ❌ Fatal error executing ${pluginName}:`, e);
            return `[PLUGIN FATAL ERROR] ${e.message}`;
        }
    }
}
