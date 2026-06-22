import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_DIRECT } },
  })

  console.log('🌱 Seeding Mazencito Jeddah...\n')

  // Clear existing data
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.table.deleteMany()
  await prisma.outlet.deleteMany()

  // ── Outlet ────────────────────────────────────────────────────────────────
  const outlet = await prisma.outlet.create({
    data: {
      name:     'Mazencito Jeddah',
      slug:     'mazencito-jeddah',
      city:     'Jeddah',
      address:  'Ash Shati, Atelier Lavie, Jeddah, Saudi Arabia',
      phone:    '+966 xx xxx xxxx',
      email:    'jeddah@mazencito.sa',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      apiKey:   process.env.API_SECRET ?? 'mz-dev-secret-2026',
    },
  })
  console.log(`  ✓ Outlet: ${outlet.name}`)
  console.log(`    ID     : ${outlet.id}`)
  console.log(`    API Key: ${outlet.apiKey}\n`)

  // ── Tables ────────────────────────────────────────────────────────────────
  const tables = await prisma.table.createMany({
    data: [
      { number: 1,  capacity: 2, outletId: outlet.id },
      { number: 2,  capacity: 4, outletId: outlet.id },
      { number: 3,  capacity: 4, outletId: outlet.id },
      { number: 4,  capacity: 2, outletId: outlet.id },
      { number: 5,  capacity: 6, outletId: outlet.id },
      { number: 6,  capacity: 4, outletId: outlet.id },
      { number: 7,  capacity: 4, outletId: outlet.id },
      { number: 8,  capacity: 2, outletId: outlet.id },
      { number: 9,  capacity: 6, outletId: outlet.id },
      { number: 10, capacity: 8, outletId: outlet.id },
      { number: 11, capacity: 4, outletId: outlet.id },
      { number: 12, capacity: 4, outletId: outlet.id },
    ],
  })
  console.log(`  ✓ ${tables.count} tables`)

  // ── Menu ──────────────────────────────────────────────────────────────────
  const menu = await prisma.menuItem.createMany({
    data: [
      // Pizza
      { outletId: outlet.id, nameEn: 'Pizza Margherita',      nameAr: 'بيتزا مارغريتا',       description: 'San Marzano tomato · Fior di latte · Fresh basil',              price: 25, category: 'PIZZA'    },
      { outletId: outlet.id, nameEn: 'Pizza Pepperoni',        nameAr: 'بيتزا بيبروني',         description: 'Premium pepperoni · House mozzarella',                           price: 30, category: 'PIZZA'    },
      { outletId: outlet.id, nameEn: 'Pizza Quattro Formaggi', nameAr: 'بيتزا أربعة جبن',       description: 'Mozzarella · Parmesan · Gorgonzola · Ricotta',                   price: 35, category: 'PIZZA'    },
      { outletId: outlet.id, nameEn: 'Pizza Vegetariana',      nameAr: 'بيتزا نباتية',           description: 'Bell peppers · Mushrooms · Olives · Tomatoes',                   price: 28, category: 'PIZZA'    },
      { outletId: outlet.id, nameEn: 'Pizza Al Tartufo',       nameAr: 'بيتزا الكمأة',           description: 'Black truffle · Wild mushrooms · Parmesan',                      price: 45, category: 'PIZZA',   special: true },
      { outletId: outlet.id, nameEn: 'Pizza Diavola',          nameAr: 'بيتزا ديافولا',          description: 'Nduja · Chili · Mozzarella · Tomato',                            price: 32, category: 'PIZZA'    },
      // Pasta
      { outletId: outlet.id, nameEn: 'Pasta Carbonara',        nameAr: 'باستا كاربونارا',        description: 'Guanciale · Egg yolk · Pecorino · Black pepper',                 price: 35, category: 'PASTA'    },
      { outletId: outlet.id, nameEn: 'Pasta Pesto',            nameAr: 'باستا بيستو',            description: 'Genovese pesto · Pine nuts · Parmigiano',                        price: 30, category: 'PASTA'    },
      { outletId: outlet.id, nameEn: 'Fettuccine Alfredo',     nameAr: 'فيتوتشيني ألفريدو',      description: 'Fresh fettuccine · Butter · Parmigiano Reggiano',                 price: 32, category: 'PASTA'    },
      { outletId: outlet.id, nameEn: 'Penne al Pesto',         nameAr: 'بيني بالبيستو',          description: 'Penne · Cherry tomato · Basil pesto',                            price: 28, category: 'PASTA',   available: false },
      // Soups
      { outletId: outlet.id, nameEn: 'Minestrone Soup',        nameAr: 'شوربة مينيسترونة',       description: 'Classic Italian vegetable soup with pasta and beans',            price: 15, category: 'SOUPS'    },
      { outletId: outlet.id, nameEn: 'Tomato Basil Soup',      nameAr: 'شوربة الطماطم والريحان', description: 'Creamy tomato soup with fresh basil and Parmigiano',             price: 14, category: 'SOUPS'    },
      // Salads
      { outletId: outlet.id, nameEn: 'Caprese Salad',          nameAr: 'سلطة كابريزي',           description: 'Buffalo mozzarella · Tomatoes · Basil · Extra virgin olive oil', price: 22, category: 'SALADS'   },
      { outletId: outlet.id, nameEn: 'Insalata Mista',         nameAr: 'سلطة مشكلة',             description: 'Mixed leaves · Cherry tomatoes · Olives · Balsamic',            price: 18, category: 'SALADS'   },
      // Desserts
      { outletId: outlet.id, nameEn: 'Tiramisu',               nameAr: 'تيراميسو',               description: 'Espresso-soaked ladyfingers · Mascarpone · Cocoa',               price: 22, category: 'DESSERTS', special: true },
      { outletId: outlet.id, nameEn: 'Panna Cotta',            nameAr: 'بانا كوتا',              description: 'Vanilla cream · Berry coulis',                                   price: 18, category: 'DESSERTS' },
      { outletId: outlet.id, nameEn: 'Cannoli Siciliani',      nameAr: 'كانولي صقلية',           description: 'Crispy shells · Ricotta cream · Candied orange · Pistachios',    price: 22, category: 'DESSERTS' },
      // Beverages
      { outletId: outlet.id, nameEn: 'Soft Drinks',            nameAr: 'مشروبات غازية',          description: 'Pepsi · 7UP · Miranda · Soda Water',                             price: 7,  category: 'BEVERAGES' },
      { outletId: outlet.id, nameEn: 'Fresh Juices',           nameAr: 'عصائر طازجة',            description: 'Orange · Lemon · Mango · Strawberry',                            price: 14, category: 'BEVERAGES' },
      { outletId: outlet.id, nameEn: 'Espresso',               nameAr: 'إسبريسو',                description: 'Single or double shot · Italian roast',                          price: 10, category: 'BEVERAGES' },
      { outletId: outlet.id, nameEn: 'Cappuccino',             nameAr: 'كابتشينو',               description: 'Double espresso · Steamed milk · Microfoam',                     price: 14, category: 'BEVERAGES' },
    ],
  })
  console.log(`  ✓ ${menu.count} menu items`)

  console.log('\n✅ Seed complete.\n')
  console.log('━'.repeat(52))
  console.log('  Mazencito Jeddah')
  console.log(`  Outlet ID : ${outlet.id}`)
  console.log(`  API Key   : ${outlet.apiKey}`)
  console.log('━'.repeat(52))
  console.log('\nAdd to frontend .env.local:')
  console.log(`  NEXT_PUBLIC_API_URL=http://localhost:4000`)
  console.log(`  API_KEY=${outlet.apiKey}`)
  console.log(`  OUTLET_ID=${outlet.id}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
