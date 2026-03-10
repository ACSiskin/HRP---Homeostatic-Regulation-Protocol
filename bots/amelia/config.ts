import { BotConfig } from '../../src/core/types';

export const config: BotConfig = {
  name: "Amelia",
  isActive: true,
  platform: "INSTAGRAM",
  
  credentials: {
    email: "amelia.test@example.com",
    password: "super_secret_password",
    // Tu wkleisz proxy, jak już kupisz. Na razie puste = twoje IP (do testów dev)
    proxy: "" 
  },

  schedule: {
    startHour: 7,
    endHour: 23,
    postsPerDay: 2,
    activityProbability: 0.95
  }
};
