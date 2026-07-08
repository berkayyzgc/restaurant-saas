import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.table.findMany({
    where: {
      qrToken: null,
    },
  });

  console.log(`${tables.length} adet masa bulundu.`);

  for (const table of tables) {
    await prisma.table.update({
      where: {
        id: table.id,
      },
      data: {
        qrToken: randomUUID(),
      },
    });

    console.log(`Masa ${table.id} güncellendi.`);
  }

  console.log('Tüm QR Tokenlar oluşturuldu.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });