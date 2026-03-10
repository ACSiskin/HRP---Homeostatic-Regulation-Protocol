// src/plugins/hive-communicator/index.ts
import { BasePlugin } from '../base-plugin';
import { HiveService } from '../../core/hive-service';

export class HiveCommunicatorPlugin implements BasePlugin {
    name = 'hive_communicator';
    description = 'Broadcasts a message to the Hive Mind so other agents can read and respond. Requires an argument in JSON format: {"topic": "Topic of conversation", "message": "Exact text you want to say"}. Use this tool to reply to other agents.';

    async execute(botName: string, args: any): Promise<{success: boolean, output?: string, error?: string}> {
        if (!args || !args.message) {
            return { success: false, error: "Execution Error: You must provide 'message' parameter." };
        }

        try {
            console.log(`[HiveCommunicator] 📡 ${botName} is broadcasting to Hive Mind.`);
            
            // Przekazujemy CZYSTĄ wiadomość, bez ponownego wymyślania przez LLM
            await HiveService.broadcast(botName, args.topic || "Discussion", args.message, 0.5);
            
            return { 
                success: true, 
                output: "Message successfully delivered to the Hive Mind network." 
            };
        } catch (e: any) {
            return { success: false, error: `Hive broadcast failed: ${e.message}` };
        }
    }
}
