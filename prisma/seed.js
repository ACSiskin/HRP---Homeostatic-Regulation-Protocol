const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
// Ścieżka do Twojego folderu 'bots' w głównym katalogu
const BOTS_DIR = path.join(__dirname, '../bots'); 

async function main() {
  console.log('⬢ Starting folder synchronization with the database...');

  if (!fs.existsSync(BOTS_DIR)) {
    console.log(`[!] Folder ${BOTS_DIR} Does not exist. Aborting.`);
    return;
  }

  // Skanowanie zawartości folderu
  const botEntries = fs.readdirSync(BOTS_DIR, { withFileTypes: true });

  for (const entry of botEntries) {
    if (entry.isDirectory()) {
      const entityName = entry.name;
      
      // POMIJAJ folder _template (formatkę)
      if (entityName === '_template') {
        console.log(`[-] Skipping template folder: ${entityName}`);
        continue;
      }
      
      // Upsert: Utwórz, jeśli nie istnieje. Ignoruj, jeśli już jest.
      const entity = await prisma.botState.upsert({
        where: { name: entityName },
        update: {}, 
        create: {
          name: entityName,
          status: "IDLE",
          hasValidSession: false,
        },
      });
      console.log(`[+] Entity synchronized: ${entity.name}`);
    }
  }
  
  console.log('⬢ Synchronization completed successfully!');
}

main()
  .catch((e) => {
    console.error('[X] Error during synchronization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
