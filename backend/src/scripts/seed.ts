import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

/**
 * Seed database with sample KOLs
 */
async function seed() {
  logger.info('Seeding database...');

  // Sample KOLs (Crypto Twitter influencers)
  const kols = [
    {
      twitterHandle: 'VitalikButerin',
      twitterId: '295218901',
      name: 'Vitalik Buterin',
      followersCount: 5200000,
      priority: 10
    },
    {
      twitterHandle: 'elonmusk',
      twitterId: '44196397',
      name: 'Elon Musk',
      followersCount: 170000000,
      priority: 9
    },
    {
      twitterHandle: 'cz_binance',
      twitterId: '902926941413453824',
      name: 'CZ Binance',
      followersCount: 8000000,
      priority: 8
    },
    {
      twitterHandle: 'APompliano',
      twitterId: '1450694649',
      name: 'Anthony Pompliano',
      followersCount: 1600000,
      priority: 7
    },
    {
      twitterHandle: 'CryptoCobain',
      twitterId: '1043875805112881152',
      name: 'Crypto Cobain',
      followersCount: 650000,
      priority: 6
    }
  ];

  for (const kol of kols) {
    try {
      const created = await prisma.kOL.upsert({
        where: { twitterHandle: kol.twitterHandle },
        update: {},
        create: kol
      });
      logger.info(`Created/Updated KOL: ${created.twitterHandle}`);
    } catch (error) {
      logger.error(`Failed to create KOL ${kol.twitterHandle}:`, error);
    }
  }

  logger.info('Seeding completed!');
}

seed()
  .catch((error) => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

