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
          has_kitchen: true,
          has_wood_stove: true,
          has_terrace: true,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina  tiene microondas, estufa, refrigerador, calentador de agua, platos, tazas, sartenes, y cuchillos.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
          description_es: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina  tiene microondas, estufa, refrigerador, calentador de agua, platos, tazas, sartenes, y cuchillos.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado`,
          description_en: "The bathroom has the basics: towels, soap, and toilet paper. There is a small terrace. The kitchen has a microwave, stove, refrigerator, water heater, dishes, cups, pans, and knives. There is a wood-burning stove. All cabins have access to the grills, playground, and private parking.",
        },
        {
          name: 'Cabaña Mediana',
          num_bathrooms: 1,
          num_bedrooms: 2,
          num_beds: 3,
          num_floors: 1,
          square_feet: 0,
          price_per_night: 1200,
          has_kitchen: true,
          has_wood_stove: true,
          has_terrace: false,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          La cocina tiene utensilios de cocina, los básicos, platos, vasos, tazas, sartenes, comal, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
          description_es: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          La cocina tiene utensilios de cocina, los básicos, platos, vasos, tazas, sartenes, comal, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado`,
          description_en: "The bathroom has the basics: towels, soap, and toilet paper. The kitchen has cookware and the basics: plates, glasses, cups, pans, a griddle, refrigerator, and microwave. There is a wood-burning stove. All cabins have access to the grills, playground, and private parking.",
        },
        {
          name: 'Cabaña Pequeña',
          num_bathrooms: 1,
          num_bedrooms: 1,
          num_beds: 2,
          num_floors: 2,
          square_feet: 0,
          price_per_night: 850,
          has_kitchen: true,
          has_wood_stove: true,
          has_terrace: true,
          description: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina tiene elementos básicos, comal, sartenes, platos, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado.`,
          description_es: `
          El baño tiene elementos básicos, toallas, jabón, y papel higiénico.
          Hay una terraza pequeña.
          La cocina tiene elementos básicos, comal, sartenes, platos, refrigerador, y microondas.
          Hay un calentón de leña.
          Todas de las cabañas tienen accesso a los asadores, la àrea infantil, el estacionamiento privado`,
          description_en: "The bathroom has the basics: towels, soap, and toilet paper. There is a small terrace. The kitchen has a griddle, pans, plates, refrigerator, and microwave. There is a wood-burning stove. All cabins have access to the grills, playground, and private parking.",
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