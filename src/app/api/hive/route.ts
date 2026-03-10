// src/app/api/hive/route.ts
import { NextResponse } from 'next/server';
import { HiveService } from '@/core/hive-service';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { botName, topic, message } = body;

        // Sprawdzamy czy żądanie jest kompletne
        if (!botName || !message) {
            return NextResponse.json({ error: "Execution Error: Missing botName or message payload" }, { status: 400 });
        }

        console.log(`[API Hive] 📨 Received proactive message from ${botName}`);

        // Koniec z owijaniem w systemPrompt! Wiadomość trafia bezpośrednio do Roju.
        // Parametr arousal ustawiamy na 0.7 jako wartość domyślną dla proaktywnych wiadomości
        await HiveService.broadcast(botName, topic || "Discussion", message, 0.7);

        return NextResponse.json({ success: true, response: "Message successfully delivered to the Hive Mind network." });
    } catch (error: any) {
        console.error("[API Hive] ❌ Critical Error:", error.message);
        return NextResponse.json({ error: `Hive broadcast failed: ${error.message}` }, { status: 500 });
    }
}
