import { PrismaClient } from '@prisma/client';
import { BotConfig, BotLaunchOptions, BotTask } from './types';
import { CognitiveEngine } from './context/cognitive-engine';
import { NewsService } from './context/news-service';
import { getBotProfile } from '../app/actions';

const prisma = new PrismaClient();

export class BotInstance {
    name: string;
    status: 'IDLE' | 'WORKING' | 'STOPPED' = 'IDLE';
    private brain: CognitiveEngine;

    constructor(private config: BotConfig) {
        this.name = config.name;
        this.brain = new CognitiveEngine(this.name);
    }

    async initialize(options: BotLaunchOptions): Promise<boolean> {
        this.status = 'WORKING';
        console.log(`[BotInstance] ${this.name} initialized.`);

        // Start "Vigilance" loop (Heartbeat)
        this.startLifeLoop().catch(e => console.error(`[BotInstance] Loop crashed:`, e));

        return true;
    }

    async stop(): Promise<void> {
        this.status = 'STOPPED';
        console.log(`[BotInstance] ${this.name} stopped.`);
    }

    getStatus(): string {
        return this.status;
    }

    async assignTask(task: BotTask): Promise<void> {
        // Delegate to Brain
        console.log(`[BotInstance] Task assigned: ${task.type}`);
        await this.brain.processStimulus(`[TASK] ${task.type}`, 'HIVE');
    }

    async processStimulus(stimulus: string): Promise<void> {
        await this.brain.processStimulus(stimulus, 'ENV');
    }

    // --- DYNAMIC PERCEPTION LOOP ---
    private async startLifeLoop() {
        console.log(`[BotInstance] 💓 Life Loop started for ${this.name}`);

        while (this.status !== 'STOPPED') {
            try {
                // 1. Check Config for interval (Dynamic Vigilance)
                const intervalMin = this.config.perceptionIntervalMin || 60;

                // 2. Perform Perception (News/Weather)
                await this.performPerception();

                // 3. Wait dynamically
                // Check status every minute to allow faster stop
                for (let i = 0; i < intervalMin; i++) {
                    if ((this.status as string) === 'STOPPED') break;
                    await new Promise(r => setTimeout(r, 60 * 1000));
                }
            } catch (e) {
                console.error(`[LifeLoop] Error:`, e);
                await new Promise(r => setTimeout(r, 60 * 1000)); // Safety backoff
            }
        }
    }

    private async performPerception() {
        // [LOG] Rejestrujemy cykl życia jako akcję
        const botState = await prisma.botState.findUnique({ where: { name: this.name } });
        if (botState) {
            await prisma.log.create({
                data: {
                    botId: botState.id,
                    level: 'INFO', // Traktujemy to jako standardową akcję
                    message: 'Cycle: Scanning environment (News/Weather/Bio)...'
                }
            });
        }

        // [NEURO LINK] Autonomic sensing
        const { data: profile } = await getBotProfile(this.name);
        const city = profile?.location || "Warszawa";

        // Fetch News (External Sensing)
        const newsItems = await NewsService.getBotBriefing(city, ["Świat", "Technologia", "Lokalne"]);

        if (newsItems.length > 0) {
            const topNews = newsItems[0]; // Just one to not overwhelm
            console.log(`[BotInstance] 👁️ Sensing: ${topNews.title}`);
            const result = await this.brain.processStimulus(
                `[NEWS] ${topNews.title}`,
                'NEWS',
                topNews.imageUrl
            );

            // [NEURO LINK] Logging to Dashboard
            if (result.decision && result.decision !== 'IGNORE') {
                const botState = await prisma.botState.findFirst({ where: { name: this.name } });
                if (botState) {
                    await prisma.log.create({
                        data: {
                            botId: botState.id,
                            level: 'INFO',
                            message: `[NEURO-LINK] Analyzed news: "${topNews.title.substring(0, 30)}...". Result: ${result.decision}`
                        }
                    });
                }
            }
        }
    }
}
