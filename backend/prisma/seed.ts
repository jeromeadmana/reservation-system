import { PrismaClient, UserRole, VehicleType, VehicleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
    },
  });
  console.log('✅ Admin user created');

  // Create Vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { licensePlate: 'ABC-1234' },
      update: {},
      create: {
        make: 'Mercedes-Benz',
        model: 'S-Class',
        year: 2023,
        licensePlate: 'ABC-1234',
        capacity: 4,
        type: VehicleType.LUXURY,
        status: VehicleStatus.AVAILABLE,
        amenities: JSON.stringify(['WiFi', 'Leather Seats', 'Climate Control']),
      },
    }),
    prisma.vehicle.upsert({
      where: { licensePlate: 'XYZ-5678' },
      update: {},
      create: {
        make: 'Cadillac',
        model: 'Escalade',
        year: 2023,
        licensePlate: 'XYZ-5678',
        capacity: 7,
        type: VehicleType.SUV,
        status: VehicleStatus.AVAILABLE,
        amenities: JSON.stringify(['WiFi', 'Entertainment System', 'Climate Control']),
      },
    }),
    prisma.vehicle.upsert({
      where: { licensePlate: 'LMO-9012' },
      update: {},
      create: {
        make: 'Lincoln',
        model: 'Stretch Limousine',
        year: 2022,
        licensePlate: 'LMO-9012',
        capacity: 10,
        type: VehicleType.LIMOUSINE,
        status: VehicleStatus.AVAILABLE,
        amenities: JSON.stringify([
          'Bar',
          'Entertainment System',
          'Mood Lighting',
          'Privacy Partition',
        ]),
      },
    }),
  ]);
  console.log('✅ Vehicles created');

  // Create Chauffeur Users
  const chauffeur1User = await prisma.user.upsert({
    where: { email: 'chauffeur1@example.com' },
    update: {},
    create: {
      email: 'chauffeur1@example.com',
      passwordHash: hashedPassword,
      role: UserRole.CHAUFFEUR,
      firstName: 'John',
      lastName: 'Driver',
      phone: '+1234567891',
      chauffeur: {
        create: {
          licenseNumber: 'CH-001',
          vehicleId: vehicles[0].id,
          status: 'available',
          rating: 4.8,
        },
      },
    },
  });

  const chauffeur2User = await prisma.user.upsert({
    where: { email: 'chauffeur2@example.com' },
    update: {},
    create: {
      email: 'chauffeur2@example.com',
      passwordHash: hashedPassword,
      role: UserRole.CHAUFFEUR,
      firstName: 'Sarah',
      lastName: 'Wilson',
      phone: '+1234567892',
      chauffeur: {
        create: {
          licenseNumber: 'CH-002',
          vehicleId: vehicles[1].id,
          status: 'available',
          rating: 4.9,
        },
      },
    },
  });
  console.log('✅ Chauffeur users created');

  // Create Customer Users
  const customer1User = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: hashedPassword,
      role: UserRole.CUSTOMER,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567893',
      customer: {
        create: {
          companyName: 'Smith Enterprises',
          billingAddress: '123 Main St, New York, NY 10001',
        },
      },
    },
  });

  const customer2User = await prisma.user.upsert({
    where: { email: 'customer2@example.com' },
    update: {},
    create: {
      email: 'customer2@example.com',
      passwordHash: hashedPassword,
      role: UserRole.CUSTOMER,
      firstName: 'Robert',
      lastName: 'Johnson',
      phone: '+1234567894',
      customer: {
        create: {},
      },
    },
  });
  console.log('✅ Customer users created');

  console.log('🎉 Database seeded successfully!');
  console.log('\n📝 Default Login Credentials:');
  console.log('─────────────────────────────');
  console.log('Admin:');
  console.log('  Email: admin@example.com');
  console.log('  Password: Password123!');
  console.log('\nChauffeur:');
  console.log('  Email: chauffeur1@example.com');
  console.log('  Password: Password123!');
  console.log('\nCustomer:');
  console.log('  Email: customer@example.com');
  console.log('  Password: Password123!');
  console.log('─────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
