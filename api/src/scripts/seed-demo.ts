// Demo seed: 1 company, 1 live auction, 1 lot (physical location),
// 10 items each individually biddable with placeholder photos.
//
// Run inside the api container:
//   node dist/scripts/seed-demo.js
//
// Idempotent by name: re-running reuses the demo company/auction/lot
// and only inserts items that don't already exist (by item_number).

import { PrismaClient } from '@prisma/client';

const COMPANY_NAME = 'Demo Auction Co';
const COMPANY_EMAIL = 'demo-owner@stratabid.test';
const CONSIGNOR_EMAIL = 'demo-consignor@stratabid.test';
const AUCTION_TITLE = 'Demo Live Auction';
const LOT_TITLE = 'Yard A — Main Lot';
const ITEM_COUNT = 10;

const ITEMS = [
  { title: '2015 John Deere 5075E Utility Tractor', category: 'equipment',
    make: 'John Deere', model: '5075E', year: 2015, horsepower: 75,
    usage_value: 1820, usage_unit: 'hours', fuel_type: 'diesel',
    condition: 'good', runs: true, reserve_price: 18000,
    description: '75 HP utility tractor, runs strong, recent service.' },
  { title: '2018 Bobcat S650 Skid Steer', category: 'equipment',
    make: 'Bobcat', model: 'S650', year: 2018, horsepower: 74,
    usage_value: 2400, usage_unit: 'hours', fuel_type: 'diesel',
    condition: 'good', runs: true, reserve_price: 24000,
    description: 'Enclosed cab, A/C, 2-speed travel.' },
  { title: '2012 Ford F-350 Service Truck', category: 'vehicle',
    make: 'Ford', model: 'F-350', year: 2012,
    usage_value: 142000, usage_unit: 'miles', fuel_type: 'diesel',
    condition: 'fair', runs: true, reserve_price: 12500,
    description: '6.7L Powerstroke, utility bed, crane delete.' },
  { title: '2020 PJ 20ft Equipment Trailer', category: 'trailer',
    make: 'PJ', model: 'CC202', year: 2020,
    weight_rating_lbs: 14000, condition: 'excellent',
    reserve_price: 7500,
    description: 'Tandem dual, electric brakes, fold-up ramps.' },
  { title: '2008 Caterpillar 420E Backhoe', category: 'equipment',
    make: 'Caterpillar', model: '420E', year: 2008, horsepower: 92,
    usage_value: 5800, usage_unit: 'hours', fuel_type: 'diesel',
    condition: 'fair', runs: true, reserve_price: 32000,
    description: '4x4, extendahoe, recent hydraulic rebuild.' },
  { title: '2016 Kubota L3301 Compact Tractor', category: 'equipment',
    make: 'Kubota', model: 'L3301', year: 2016, horsepower: 33,
    usage_value: 940, usage_unit: 'hours', fuel_type: 'diesel',
    condition: 'excellent', runs: true, reserve_price: 14000,
    description: 'Loader, R4 tires, low hours.' },
  { title: '2014 Chevrolet Silverado 2500HD', category: 'vehicle',
    make: 'Chevrolet', model: 'Silverado 2500HD', year: 2014,
    usage_value: 98000, usage_unit: 'miles', fuel_type: 'gas',
    condition: 'good', runs: true, reserve_price: 16500,
    description: 'Crew cab, 4x4, gooseneck prep.' },
  { title: 'Lincoln Ranger 250 GXT Welder/Generator', category: 'equipment',
    make: 'Lincoln', model: 'Ranger 250 GXT', year: 2019,
    usage_value: 612, usage_unit: 'hours', fuel_type: 'gas',
    condition: 'excellent', runs: true, reserve_price: 4200,
    description: 'Stick/TIG capable, 11kW aux power.' },
  { title: '2021 Wacker Neuson DPU6555 Plate Compactor', category: 'equipment',
    make: 'Wacker Neuson', model: 'DPU6555', year: 2021,
    usage_value: 180, usage_unit: 'hours', fuel_type: 'diesel',
    condition: 'excellent', runs: true, reserve_price: 5800,
    description: 'Reversible plate, hatz diesel, low hours.' },
  { title: '20ft Conex Shipping Container', category: 'other',
    condition: 'good', reserve_price: 2500,
    description: 'Wind- and water-tight, original locking bars.' },
] as const;

function photoUrls(index: number): string[] {
  // picsum.photos returns a deterministic image per seed string.
  const seed = `stratabid-demo-item-${index}`;
  return [
    `https://picsum.photos/seed/${seed}-a/1024/768`,
    `https://picsum.photos/seed/${seed}-b/1024/768`,
    `https://picsum.photos/seed/${seed}-c/1024/768`,
  ];
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // Company (find by name; create if missing).
    let company = await prisma.auction_companies.findFirst({
      where: { name: COMPANY_NAME },
    });
    if (!company) {
      company = await prisma.auction_companies.create({
        data: {
          name: COMPANY_NAME,
          owner_email: COMPANY_EMAIL,
          status: 'approved',
          city: 'Charleston',
          state: 'WV',
        },
      });
      console.log(`Created company: ${company.name} (${company.id})`);
    } else {
      console.log(`Reusing company: ${company.name} (${company.id})`);
    }

    // Consignor user (items require consignor_id).
    let consignor = await prisma.users.findUnique({
      where: { email: CONSIGNOR_EMAIL },
    });
    if (!consignor) {
      consignor = await prisma.users.create({
        data: {
          email: CONSIGNOR_EMAIL,
          full_name: 'Demo Consignor',
          role: 'user',
        },
      });
      console.log(`Created consignor user: ${consignor.email}`);
    }

    // Auction (find by title within company; create if missing).
    const now = new Date();
    const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let auction = await prisma.auctions.findFirst({
      where: { company_id: company.id, title: AUCTION_TITLE },
    });
    if (!auction) {
      auction = await prisma.auctions.create({
        data: {
          company_id: company.id,
          title: AUCTION_TITLE,
          description: 'Demo auction seeded for development & QA.',
          format: 'timed',
          status: 'live',
          starts_at: now,
          ends_at: endsAt,
          location_city: 'Charleston',
          location_state: 'WV',
        },
      });
      console.log(`Created auction: ${auction.title} (${auction.id}) — live`);
    } else {
      if (auction.status !== 'live') {
        await prisma.auctions.update({
          where: { id: auction.id },
          data: { status: 'live', starts_at: now, ends_at: endsAt },
        });
        console.log(`Reusing auction and flipped to live: ${auction.title}`);
      } else {
        console.log(`Reusing live auction: ${auction.title} (${auction.id})`);
      }
    }

    // Lot — a physical location grouping; items inside are individually biddable.
    let lot = await prisma.lots.findFirst({
      where: { auction_id: auction.id, title: LOT_TITLE },
    });
    if (!lot) {
      lot = await prisma.lots.create({
        data: {
          auction_id: auction.id,
          lot_number: 1,
          sort_order: 1,
          title: LOT_TITLE,
          description: 'Outdoor lot, west side of the yard. Items sold individually.',
          status: 'open',
          sale_mode: 'individual',
          ends_at: endsAt,
        },
      });
      console.log(`Created lot: ${lot.title} (${lot.id}) — sale_mode=individual`);
    } else {
      console.log(`Reusing lot: ${lot.title} (${lot.id})`);
    }

    // Items — 10 individually biddable items in the lot, each with placeholder photos.
    let created = 0;
    let skipped = 0;
    for (let i = 0; i < ITEM_COUNT; i++) {
      const itemNumber = i + 1;
      const existing = await prisma.equipment_listings.findFirst({
        where: { auction_id: auction.id, item_number: itemNumber },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const spec = ITEMS[i];
      await prisma.equipment_listings.create({
        data: {
          auction_id: auction.id,
          lot_id: lot.id,
          consignor_id: consignor.id,
          item_number: itemNumber,
          lot_number: itemNumber,
          title: spec.title,
          description: spec.description,
          category: spec.category as any,
          status: 'approved',
          created_by_company: true,
          photos: photoUrls(itemNumber),
          make: (spec as any).make ?? null,
          model: (spec as any).model ?? null,
          year: (spec as any).year ?? null,
          horsepower: (spec as any).horsepower ?? null,
          weight_rating_lbs: (spec as any).weight_rating_lbs ?? null,
          usage_value: (spec as any).usage_value ?? null,
          usage_unit: (spec as any).usage_unit ?? null,
          fuel_type: (spec as any).fuel_type ?? null,
          condition: (spec as any).condition ?? null,
          runs: (spec as any).runs ?? null,
          reserve_price: (spec as any).reserve_price ?? null,
          ends_at: endsAt,
        },
      });
      created++;
    }
    console.log(`Items: ${created} created, ${skipped} already present.`);

    console.log('\nDone.');
    console.log(`  Company:  ${company.id}`);
    console.log(`  Auction:  ${auction.id}  (status: live)`);
    console.log(`  Lot:      ${lot.id}      (sale_mode: individual)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
