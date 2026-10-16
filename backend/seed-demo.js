import { prisma } from './src/db.js';

async function main() {
  // 1. Create demo customers
  const customer1 = await prisma.customer.upsert({
    where: { email: 'aarav.sharma@example.com' },
    update: {},
    create: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@example.com',
      phone: '9000000001',
      source: 'crm',
      tags: ['demo', 'regular'],
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'priya.naik@example.com' },
    update: {},
    create: {
      firstName: 'Priya',
      lastName: 'Naik',
      email: 'priya.naik@example.com',
      phone: '9000000002',
      source: 'crm',
      tags: ['demo', 'new'],
    },
  });

  // 2. Create demo orders
  await prisma.order.upsert({
    where: { wooId: 900001 },
    update: {},
    create: {
      wooId: 900001,
      number: 'DEMO-1001',
      status: 'completed',
      currency: 'INR',
      total: '998.00',
      billingEmail: customer1.email,
      billingName: 'Aarav Sharma',
      dateCreated: new Date('2026-10-15T10:00:00Z'),
      dateModified: new Date('2026-10-15T10:00:00Z'),
      customer: { connect: { id: customer1.id } },
      items: {
        create: [
          {
            name: 'Cotton T-Shirt',
            sku: 'TSH001',
            quantity: 2,
            total: '998.00',
          },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: { wooId: 900002 },
    update: {},
    create: {
      wooId: 900002,
      number: 'DEMO-1002',
      status: 'processing',
      currency: 'INR',
      total: '1499.00',
      billingEmail: customer2.email,
      billingName: 'Priya Naik',
      dateCreated: new Date('2026-10-16T10:00:00Z'),
      dateModified: new Date('2026-10-16T10:00:00Z'),
      customer: { connect: { id: customer2.id } },
      items: {
        create: [
          {
            name: 'Sports Shoes',
            sku: 'SHO002',
            quantity: 1,
            total: '1499.00',
          },
        ],
      },
    },
  });

  console.log('Demo customers and orders created successfully!');
}

main()
  .catch((error) => {
    console.error('Error creating demo data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });