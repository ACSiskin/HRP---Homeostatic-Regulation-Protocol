import { TimeSlot } from '../types';

export class TimeManager {
  
  static getCurrentSlot(): TimeSlot {
    // Pobierz czas w Warszawie
    const now = new Date();
    const plTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
    
    const hour = plTime.getHours();
    const day = plTime.getDay(); // 0 = Niedziela, 1 = Poniedziałek...

    // Logika z city_profile.py
    // Weekend (Sobota=6, Niedziela=0 w JS)
    if (day === 0 || day === 6) {
      return 'DAY_OFF';
    }

    // Dzień Roboczy
    if (hour >= 6 && hour < 10) return 'MORNING';
    if (hour >= 10 && hour < 18) return 'WORK';
    if (hour >= 18 && hour < 23) return 'EVENING';
    
    return 'NIGHT';
  }

  static getLocalTime(): string {
    return new Date().toLocaleTimeString("pl-PL", { 
      timeZone: "Europe/Warsaw", 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  // Tematy do promptów (z city_profile.py TOPICS)
  static getTopicSuggestion(slot: TimeSlot): string {
    const topics: Record<TimeSlot, string[]> = {
      'MORNING': ["poranna kawa", "korki w mieście", "energia na start", "mgła nad Wisłą"],
      'WORK': ["deadline", "lunch na mieście", "spotkania", "praca biurowa"],
      'EVENING': ["relaks", "książka", "spacer", "wyjście ze znajomymi"],
      'DAY_OFF': ["wycieczka", "rower", "leniwy poranek", "kultura i sztuka"],
      'NIGHT': ["cisza nocna", "bezsenność", "myśli", "Netflix"]
    };

    const list = topics[slot] || topics['WORK'];
    return list[Math.floor(Math.random() * list.length)];
  }
}
