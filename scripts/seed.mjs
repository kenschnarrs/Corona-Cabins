import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    await prisma.cabin.createMany({
      data: [
        {
          name: 'Cabaña Grande',
          num_bathrooms: 1,
          num_bedrooms: 3,
          num_beds: 4,
          num_floors: 2,
          square_feet: 0, // TODO: add sq ft.
          price_per_night: 1800,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina  tiene microondas, estufa, refrigerador, calentador de agua, platos, tazas, sartenes, y cuchillos.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
        },
        {
          name: 'Cabaña Mediana',
          num_bathrooms: 1,
          num_bedrooms: 2,
          num_beds: 3,
          num_floors: 1,
          square_feet: 0,
          price_per_night: 1200,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          La cocina tiene utensilios de cocina, los básicos, platos, vasos, tazas, sartenes, comal, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
        },
        {
          name: 'Cabaña Pequeña',
          num_bathrooms: 1,
          num_bedrooms: 1,
          num_beds: 2,
          num_floors: 2,
          square_feet: 0,
          price_per_night: 850,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina tiene elementos básicos, comal, sartenes, platos, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
        },
      ],
    });
    console.log('Seed data inserted successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();