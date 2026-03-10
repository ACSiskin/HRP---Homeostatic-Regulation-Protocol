// src/core/types.ts

// --- PLATFORM & INFRASTRUCTURE ---

export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'TWITTER' | 'LINKEDIN';

export interface BotLaunchOptions {
    mode: 'GHOST' | 'ACTIVE';
    platform: SocialPlatform;
}

export interface BotConfig {
    name: string;
    platform: SocialPlatform;
    isActive: boolean;
    credentials?: {
        email?: string;
        password?: string;
        proxy?: string;
        twoFactor?: string;
    };
    proxy?: string;
    schedule?: {
        startHour: number;
        endHour: number;
        postsPerDay?: number;
        activityProbability?: number;
    };
    interests?: string[];
    location?: string;
    perceptionIntervalMin?: number; // Minutes between autonomic perception loops
    
    // NOWOŚĆ: Główny bezpiecznik Systemu 3 dla narzędzi MCP
    tool_censor_active?: boolean;
}

export interface BotPersona {
    systemPrompt: string;
    writingStyle?: string[];
    interests?: string[];
}

export interface BotTask {
    id: string;
    type: string;
    payload: any;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface ProxyConfig {
    id: string;
    ip: string;
    port: string;
    user: string;
    pass: string;
    protocol: string;
    country: string;
    status: string;
    latency: number;
    addedAt: string;
}

export type TimeSlot = 'MORNING' | 'WORK' | 'EVENING' | 'DAY_OFF' | 'NIGHT';

export interface BotContext {
    location: string;
    timeSlot: string;
    localTime: string;
    weather: WeatherData | null;
    headlines: string[];
}

export interface WeatherData {
    temp: number;
    conditionCode: number;
    description: string;
    isRaining: boolean;
}

// --- COGNITIVE ARCHITECTURE (MIND OS) ---

/**
 * Podstawowe popędy sterujące zachowaniem bota.
 * Wartości 0-100 lub 0.0-1.0
 */
export interface Drives {
    curiosity: number;
    safety: number;
    affiliation: number;
    dominance: number;
    libido: number;
    energy: number;
}

/**
 * Wektor nastroju (PAD Model: Pleasure, Arousal, Dominance)
 * Wartości od -1.0 do 1.0
 */
export interface MoodVector {
    valence: number;   // -1 (Smutek/Złość) do 1 (Radość/Spokój)
    arousal: number;   // 0 (Senność) do 1 (Ekscytacja/Stres)
    dominance: number; // -1 (Uległość/Lęk) do 1 (Pewność siebie/Kontrola)
}

export interface EpisodicMemory {
    id: string;
    timestamp: string;
    trigger: string;
    context: string;
    emotionSnapshot: MoodVector;
    intensity: number;
    narrative: string;
    outcome: string;
}

// --- COGNITIVE CONTEXT ---

export interface SystemOneDecision {
    // NOWOŚĆ: Dodano USE_TOOL
    action: 'IGNORE' | 'LIKE' | 'COMMENT' | 'SHARE' | 'DM' | 'REPORT' | 'USE_TOOL';
    confidence: number; // 0.0 - 1.0
    reasoning: string;  // Krótkie uzasadnienie "intuicyjne"
    emotionalShift: MoodVector; // Jak ta decyzja wpłynie na nastrój
}

export interface SystemTwoPlan {
    goal: string;
    steps: string[];
    expectedOutcome: string;
    requiredResources: {
        energy: number;
        timeSeconds: number;
    };
}

export interface CognitiveContext {
    botName: string;
    timeSlot: string; // np. "MORNING", "NIGHT"
    location: string;
    weather?: string;
    newsHeadlines: string[];
    platformState: {
        unreadMessages: number;
        notifications: number;
    };
}

// --- TEMPERAMENT & MENTAL STATE ---

export interface Temperament {
    sensitivity: number;    // Ogólna wrażliwość na emocje (mnożnik VAD) - 0.5 (chłód) do 2.0 (histeria)
    reactivity: number;     // Jak szybko skaczą instynkty (Drives) - 0.5 do 2.0
    sociability: number;    // Skłonność do budowania więzi i dominacji
    libidoScale: number;    // Bazowa intensywność potrzeb seksualnych
    analyticalLeaning: number; // Skłonność do włączania Systemu 2 (refleksyjność)
}

/**
 * Główny stan umysłu bota.
 */
export interface MentalState {
    mood: MoodVector;
    energy: number;
    attention: number;
    libido: number;
    drives: Drives;
    temperament: Temperament; 
    lastUpdate: string;
    shortTermMemory: string[];
    history?: string[];
    
    // NOWOŚĆ: Kolejka myśli dla Cognitive Telemetry
    thoughtStream: string[]; 
}
