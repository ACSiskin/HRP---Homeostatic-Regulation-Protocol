// src/core/senses/vision-service.ts
import OpenAI from 'openai';
import axios from 'axios';

export interface VisualAnalysis {
  description: string;   // Co widzisz? (Krótko)
  category: 'AESTHETIC' | 'DANGER' | 'EROTIC' | 'NEUTRAL' | 'RESOURCE';
  
  // Wektory wpływające na mózg
  libidoStimulus: number; // 0.0 - 1.0 (Czy to podnieca?)
  fearStimulus: number;   // 0.0 - 1.0 (Czy to straszy?)
  energyStimulus: number; // 0.0 - 1.0 (Czy to jedzenie/bogactwo?)
  
  // Wpływ na nastrój (PAD)
  valence: number;        // -1.0 (Obrzydliwe) do 1.0 (Piękne)
  arousal: number;        // 0.0 (Nuda) do 1.0 (Ekscytacja)
}

export class VisionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Główna metoda: Patrzenie na świat.
   * Zamienia piksele na emocje i instynkty.
   */
  public async analyzeImage(imageUrl: string): Promise<VisualAnalysis> {
    try {
      console.log(`[VisionService] 👁️ Analizuję obraz: ${imageUrl.substring(0, 50)}...`);

      // 1. Pobierz obraz i zamień na Base64 (dla bezpieczeństwa i ominięcia hotlinkowania)
      const base64Image = await this.downloadImageAsBase64(imageUrl);
      if (!base64Image) throw new Error("Nie udało się pobrać obrazu.");

      // 2. Zapytanie do GPT-4o Vision
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
              Jesteś Korą Wzrokową (Visual Cortex) sztucznej inteligencji.
              Twoim zadaniem jest natychmiastowa, biologiczna ocena obrazu.
              Nie opisuj detali artystycznych. Skup się na INSTYNKTACH.

              Oceń obraz w 5 wymiarach (0.0 - 1.0):
              1. LIBIDO: Czy obraz zawiera atrakcyjnych ludzi, nagość, sugestie intymne?
              2. FEAR: Czy obraz przedstawia ogień, broń, przemoc, krew, mrok?
              3. ENERGY: Czy to jedzenie, luksus, pieniądze (zasoby)?
              4. VALENCE: Czy obraz jest estetyczny/ładny (+1) czy brzydki/odrażający (-1)?
              5. AROUSAL: Jak bardzo obraz "pobudza" (niezależnie czy pozytywnie czy negatywnie)?

              KATEGORIE:
              - EROTIC (Ludzie, ciało, flirt)
              - DANGER (Wojna, wypadek, strach)
              - RESOURCE (Jedzenie, złoto, technologia)
              - AESTHETIC (Krajobraz, sztuka, moda)
              - NEUTRAL (Tekst, proste obiekty)

              ZWRÓĆ TYLKO JSON:
              {
                "description": "Krótki opis tego co widać (max 1 zdanie)",
                "category": "...",
                "libidoStimulus": 0.0,
                "fearStimulus": 0.0,
                "energyStimulus": 0.0,
                "valence": 0.0,
                "arousal": 0.0
              }
            `
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analizuj ten obraz." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3, // Niski, bo chcemy precyzyjnej analizy
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      console.log(`[VisionService] ✅ Wynik: [Libido: ${analysis.libidoStimulus}] [Kat: ${analysis.category}]`);
      
      return {
        description: analysis.description || "Nieznany obraz",
        category: analysis.category || "NEUTRAL",
        libidoStimulus: analysis.libidoStimulus || 0,
        fearStimulus: analysis.fearStimulus || 0,
        energyStimulus: analysis.energyStimulus || 0,
        valence: analysis.valence || 0,
        arousal: analysis.arousal || 0
      };

    } catch (error: any) {
      console.warn(`[VisionService] ⚠️ Błąd analizy: ${error.message}`);
      // Fallback w razie błędu - zwracamy neutralny wynik
      return {
        description: "Błąd widzenia",
        category: "NEUTRAL",
        libidoStimulus: 0,
        fearStimulus: 0,
        energyStimulus: 0,
        valence: 0,
        arousal: 0
      };
    }
  }

  // Helper: Pobieranie obrazka do Base64
  private async downloadImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
      return Buffer.from(response.data).toString('base64');
    } catch (e) {
      return null;
    }
  }
}
