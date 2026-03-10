// src/core/loader.ts
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BOTS_DIR = path.join(process.cwd(), 'bots');

async function syncBotsWithDatabase() {
  console.log('🔄 Skanowanie katalogu botów...');

  // 1. Pobierz listę folderów w /bots (pomijając _template i pliki ukryte)
  if (!fs.existsSync(BOTS_DIR)) {
    console.error('❌ Katalog /bots nie istnieje!');
    return;
  }

  const botFolders = fs.readdirSync(BOTS_DIR).filter(item => {
    const fullPath = path.join(BOTS_DIR, item);
    return fs.statSync(fullPath).isDirectory() && 
           !item.startsWith('_') && // Ignoruj _template
           !item.startsWith('.');   // Ignoruj .git itp
  });

  console.log(`📂 Znaleziono boty: ${botFolders.join(', ')}`);

  // 2. Dla każdego folderu sprawdź/utwórz wpis w bazie
  for (const botName of botFolders) {
    const existing = await prisma.botState.findUnique({
      where: { name: botName }
    });

    if (!existing) {
      console.log(`➕ Rejestrowanie nowego bota w systemie: ${botName}`);
      await prisma.botState.create({
        data: {
          name: botName,
          status: 'IDLE'
        }
      });
      
      // Dodaj log powitalny
      const newBot = await prisma.botState.findUnique({ where: { name: botName }});
      if (newBot) {
        await prisma.log.create({
          data: {
            botId: newBot.id,
            level: 'SUCCESS',
            message: 'Bot wykryty w plikach i dodany do systemu.'
          }
        });
      }
    } else {
      console.log(`✅ Bot ${botName} jest już w bazie.`);
    }
  }

  console.log('🏁 Synchronizacja zakończona.');
}

// Uruchomienie (jeśli plik jest wywoływany bezpośrednio)
if (require.main === module) {
  syncBotsWithDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
