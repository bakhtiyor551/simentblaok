import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(backupDir, `blockerp-${stamp}.sql`);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

try {
  execSync(`pg_dump "${databaseUrl}" -f "${outFile}"`, { stdio: 'inherit' });
  console.log(`Backup saved: ${outFile}`);
} catch (error) {
  console.error('Backup failed. Ensure PostgreSQL client tools (pg_dump) are installed.');
  console.error(error);
  process.exit(1);
}
