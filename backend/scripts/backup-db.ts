import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(backupDir, `blockerp-${stamp}.db`);

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = databaseUrl.startsWith('file:')
  ? path.resolve(__dirname, '..', 'prisma', databaseUrl.replace('file:', ''))
  : databaseUrl;

if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  process.exit(1);
}

fs.copyFileSync(dbPath, outFile);
console.log(`Backup saved: ${outFile}`);
