import { BotConfig } from '../../src/core/types';

export const config: BotConfig = {
  name: "New_Bot",
  isActive: false,
  platform: "FACEBOOK",
  
  credentials: {
    email: "email@example.com",
    password: "change_me",
    proxy: "" // Format: "http://user:pass@ip:port"
  },

  schedule: {
    startHour: 8,
    endHour: 22,
    postsPerDay: 1,
    activityProbability: 0.8
  }
};
