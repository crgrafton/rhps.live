import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../../docs/data/casts.json');
const casts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

let sql = `-- Seed script generated from docs/data/casts.json (${casts.length} casts)\n\n`;

for (const cast of casts) {
  const id = cast.id || cast.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const name = (cast.name || '').replace(/'/g, "''");
  const city = (cast.city || '').replace(/'/g, "''");
  const state = (cast.state || '').replace(/'/g, "''");
  const country = (cast.country || 'USA').replace(/'/g, "''");
  const venueName = (cast.venue?.name || '').replace(/'/g, "''");
  const venueAddress = (cast.venue?.address || '').replace(/'/g, "''");
  const lat = cast.venue?.coordinates?.lat || 0.0;
  const lng = cast.venue?.coordinates?.lng || 0.0;
  const freq = (cast.schedule?.frequency || '').replace(/'/g, "''");
  const details = (cast.schedule?.details || '').replace(/'/g, "''");
  const showtime = (cast.schedule?.showtime || '').replace(/'/g, "''");
  const website = (cast.links?.website || '').replace(/'/g, "''");
  const tickets = (cast.links?.tickets || '').replace(/'/g, "''");
  const facebook = (cast.links?.facebook || '').replace(/'/g, "''");
  const bio = (cast.bio || '').replace(/'/g, "''");
  const featured = cast.featured ? 1 : 0;

  sql += `INSERT OR REPLACE INTO casts (
  id, name, city, state, country, venue_name, venue_address,
  latitude, longitude, schedule_frequency, schedule_details,
  schedule_showtime, website_url, tickets_url, facebook_url, bio, featured, is_active
) VALUES (
  '${id}', '${name}', '${city}', '${state}', '${country}', '${venueName}', '${venueAddress}',
  ${lat}, ${lng}, '${freq}', '${details}', '${showtime}', '${website}', '${tickets}', '${facebook}', '${bio}', ${featured}, 1
);\n`;
}

const outputPath = path.resolve(__dirname, '../seed_casts.sql');
fs.writeFileSync(outputPath, sql);
console.log(`Successfully generated ${outputPath} with ${casts.length} records.`);
