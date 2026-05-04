/**
 * Database Seed Script
 * 
 * Creates sample users and a group for testing.
 * Run with: npm run seed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { name: 'Alice', email: 'alice@example.com' }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { name: 'Bob', email: 'bob@example.com' }
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: { name: 'Charlie', email: 'charlie@example.com' }
  });

  const diana = await prisma.user.upsert({
    where: { email: 'diana@example.com' },
    update: {},
    create: { name: 'Diana', email: 'diana@example.com' }
  });

  console.log(`  Created users: ${alice.name}, ${bob.name}, ${charlie.name}, ${diana.name}`);

  // Create a sample group
  const group = await prisma.group.create({
    data: {
      name: 'Friday Dinner Gang',
      members: {
        create: [
          { userId: alice.id, dietType: 'VEG' },
          { userId: bob.id, dietType: 'NON_VEG' },
          { userId: charlie.id, dietType: 'NON_VEG' },
          { userId: diana.id, dietType: 'VEG' },
        ]
      }
    }
  });

  console.log(`  Created group: ${group.name}`);
  console.log('✅ Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
