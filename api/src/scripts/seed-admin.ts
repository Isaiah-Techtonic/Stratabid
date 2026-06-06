// One-time seed: create the Techtonic master admin account.
// Run inside the api container:
//   node dist/scripts/seed-admin.js "you@email.com" "Full Name" "yourpassword"
// Password is bcrypt-hashed before storage.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const [email, fullName, password] = process.argv.slice(2);
  if (!email || !fullName || !password) {
    console.error('Usage: seed-admin <email> <fullName> <password>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      console.error(`A user with email ${email} already exists. Aborting.`);
      process.exit(1);
    }
    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.users.create({
      data: { email, full_name: fullName, role: 'admin', password_hash },
      select: { id: true, email: true, role: true },
    });
    console.log('Created master admin:', user);
  } finally {
    await prisma.$disconnect();
  }
}

main();
