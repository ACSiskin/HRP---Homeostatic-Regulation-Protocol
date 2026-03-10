import { WeatherData } from '../types';

// Cache w pamięci RAM (prosty Singleton)
let weatherCache: { data: WeatherData; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minut

// Współrzędne Warszawy (zgodnie z Twoim city_profile.py)
const WAW_LAT = 52.2297;
const WAW_LON = 21.0122;

export class WeatherService {
  
  static async getCurrentWeather(): Promise<WeatherData | null> {
    // 1. Sprawdź Cache
    if (weatherCache && (Date.now() - weatherCache.timestamp < CACHE_TTL)) {
      return weatherCache.data;
    }

    // 2. Pobierz z Open-Meteo
    try {
      console.log('[WeatherService] 🌦️ Odświeżam dane pogodowe dla Warszawy...');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${WAW_LAT}&longitude=${WAW_LON}&current_weather=true`;
      
      const res = await fetch(url, { next: { revalidate: 1800 } }); // Next.js caching
      if (!res.ok) throw new Error('Weather API error');
      
      const json = await res.json();
      const current = json.current_weather;

      const data: WeatherData = {
        temp: current.temperature,
        conditionCode: current.weathercode,
        description: this.mapWeatherCode(current.weathercode),
        isRaining: current.weathercode >= 51 // Kody deszczu/śniegu zaczynają się od 51
      };

      // Zapisz do cache
      weatherCache = { data, timestamp: Date.now() };
      return data;

    } catch (error) {
      console.error('[WeatherService] Błąd:', error);
      // Jeśli mamy stare dane, zwróć je awaryjnie, jeśli nie - null
      return weatherCache ? weatherCache.data : null;
    }
  }

  // Tłumaczenie kodów WMO na ludzki język (z Twojego ai_engine.py)
  private static mapWeatherCode(code: number): string {
    if (code === 0) return "Bezchmurnie ☀️";
    if (code >= 1 && code <= 3) return "Zachmurzenie umiarkowane ⛅";
    if (code >= 45 && code <= 48) return "Mgła / Smog 🌫️";
    if (code >= 51 && code <= 67) return "Deszcz / Mżawka 🌧️";
    if (code >= 71 && code <= 77) return "Śnieg ❄️";
    if (code >= 95) return "Burza ⛈️";
    return "Pochmurno ☁️";
  }
}
