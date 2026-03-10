// src/engine/utils.ts
import { Page } from 'puppeteer';

// Podstawowa funkcja losująca czas (niezbędna dla Actora)
export const randomDelay = (min: number, max: number) => 
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Wykonuje jeden "ludzki" ruch scrolla.
 */
export async function performScrollGesture(page: Page) {
    try {
        // Losowy dystans 300-500px
        const distance = Math.floor(Math.random() * (500 - 300 + 1) + 300);
        
        await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), distance);
        
        // Pauza po ruchu (dajemy czas na renderowanie)
        await randomDelay(1000, 2000); 
    } catch (e) {
        console.error('Scroll error', e);
    }
}

/**
 * Symuluje "zastanowienie się" (czytanie posta).
 */
export async function simulateReading(probability = 0.3) {
    if (Math.random() < probability) {
        await randomDelay(3000, 6000);
    } else {
        await randomDelay(1500, 2500);
    }
}

/**
 * Mikro-powrót (korekta scrolla w górę).
 */
export async function microCorrection(page: Page, probability = 0.15) {
    if (Math.random() < probability) {
        await page.evaluate(() => window.scrollBy({ top: -250, behavior: 'smooth' }));
        await randomDelay(1500, 2500);
    }
}

// Parser liczb (np. "10k" -> 10000) - przyda się później do Vespera
export const parseCount = (str: string | null | undefined) => {
    if (!str) return 0;
    let clean = str.replace(/[^0-9.,kKmM]/g, '').replace(/,/g, '.');

    let mult = 1;
    if (clean.toUpperCase().includes('K')) { mult = 1000; clean = clean.replace(/[kK]/g, ''); }
    if (clean.toUpperCase().includes('M')) { mult = 1000000; clean = clean.replace(/[mM]/g, ''); }
    
    if ((clean.match(/\./g) || []).length > 1 || (mult === 1 && clean.includes('.') && clean.split('.')[1].length === 3)) {
        clean = clean.replace(/\./g, '');
    }

    return Math.floor(parseFloat(clean) * mult) || 0;
};

// --- GEOINT (Potrzebne, żeby Vesper działał w przyszłości) ---
export interface GeoEvent {
    id: string;
    type: 'photo_evidence' | 'soft_location';
    lat: number;
    lng: number;
    timestamp: number;
    dateStr: string;
    thumbnailUrl: string;
    locationName: string;
    postUrl: string;
    description?: string;
}

export function mergeGeoData(posts: any[], ghostLocations: Array<{ name: string; lat: number; lng: number }>): GeoEvent[] {
    const events: GeoEvent[] = [];
    const usedLocations = new Set<string>();

    posts.forEach((post, index) => {
        if (post.locationName) {
            const cleanName = post.locationName.toLowerCase().trim();
            const match = ghostLocations.find(gl => gl.name.toLowerCase().trim() === cleanName);

            if (match && match.lat && match.lng) {
                events.push({
                    id: `ev_${index}_${Date.now()}`,
                    type: 'photo_evidence',
                    lat: match.lat,
                    lng: match.lng,
                    timestamp: new Date(post.date).getTime(),
                    dateStr: post.date,
                    thumbnailUrl: post.mediaUrl,
                    locationName: match.name,
                    postUrl: post.url,
                    description: post.caption?.substring(0, 100) + '...'
                });
                usedLocations.add(match.name);
            }
        }
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
}
