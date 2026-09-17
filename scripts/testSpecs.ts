import fs from 'fs';
import { REFRESHED_FUEL_RECORDS } from '../src/data/refreshedFuelRecords';
import { normalizeRegNo } from '../src/utils/normalize';

const existingSeed = fs.readFileSync('./src/data/seedFleetData.ts', 'utf-8');

// Extract current RAW_SEED_SPECS
const rawSeedMatches = existingSeed.match(/const RAW_SEED_SPECS: SeedCarSpec\[\] = \[([\s\S]*?)\];/);
if (!rawSeedMatches) {
  console.error("Could not find RAW_SEED_SPECS in seedFleetData.ts");
  process.exit(1);
}

// Find existing specs
const existingSpecs = new Map<string, { reg: string; type: string; fuel: string; gpsKm: number }>();
const specRegex = /\{\s*reg:\s*['"]([^'"]+)['"],\s*type:\s*['"]([^'"]+)['"],\s*fuel:\s*['"]([^'"]+)['"],\s*gpsKm:\s*([0-9.]+)\s*\}/g;
let match;
while ((match = specRegex.exec(rawSeedMatches[1])) !== null) {
  const norm = normalizeRegNo(match[1]);
  existingSpecs.set(norm, {
    reg: match[1],
    type: match[2],
    fuel: match[3],
    gpsKm: parseFloat(match[4])
  });
}

console.log("Existing known specs:", existingSpecs.size);

// Vehicle type infer function
function inferType(reg: string, fuel: string): string {
  const norm = reg.toUpperCase();
  if (norm.startsWith('HR55AU')) return 'Ashok Leyland 12M Coach';
  if (norm.startsWith('DL10DB6751') || norm.includes('EV')) return 'TATA NEXON EV';
  if (norm.startsWith('HR38AE')) return 'XL6';
  if (norm.startsWith('HR38AF7937') || norm.startsWith('UP16EX5858') || norm.startsWith('DL1CAH8501')) return 'Hycross';
  if (norm.startsWith('DL9CBF2174') || norm.startsWith('HR38AK0010') || norm.startsWith('PB01G4168')) return 'Invicto';
  if (norm.startsWith('HR55AV') || norm.startsWith('DL1CAJ6424')) return 'Fortuner';
  if (norm.startsWith('UP16EE1348')) return 'KIA CARENS';
  if (norm.startsWith('HR38AL1197') || norm.startsWith('HR38AL8569')) return 'Mahindra Bolero B6';
  if (norm.startsWith('HR38AH3106') || norm.startsWith('DL6CT3248')) return 'Honda City';
  if (fuel === 'Diesel') return 'Innova';
  if (norm.includes('RUMION') || norm.startsWith('HR51CW4167') || norm.startsWith('HR51CX3506') || norm.startsWith('HR51CY4080') || norm.startsWith('DL8CBL0438') || norm.startsWith('UP161FP6503') || norm.startsWith('DL1CAJ4123') || norm.startsWith('HR38AG0003')) {
    return 'Toyota Rumion';
  }
  if (norm.includes('ERTIGA') || norm.startsWith('DL8CBL0442') || norm.startsWith('HR67E7614')) return 'Ertiga';
  if (norm.includes('VERNA') || norm.startsWith('DL1CAK4402') || norm.startsWith('HR47H1209')) return 'Verna';
  if (norm.startsWith('HR51CX') || norm.startsWith('HR51CW')) return 'Ciaz';
  if (norm.startsWith('DL11CG') || norm.startsWith('DL1CAK') || norm.startsWith('DL1ZD') || norm.startsWith('HR38AJ') || norm.startsWith('HR73C')) {
    return 'Dzire';
  }
  return 'Ciaz';
}

// Add vehicles from REFRESHED_FUEL_RECORDS
REFRESHED_FUEL_RECORDS.forEach(r => {
  const norm = normalizeRegNo(r.registration_number);
  if (!existingSpecs.has(norm)) {
    const vType = inferType(r.registration_number, r.fuel_type);
    // Estimated GPS distance based on refueling frequency & fuel quantity
    const targetKm = Math.round((r.quantity * 16.5 + 400) * 10) / 10;
    existingSpecs.set(norm, {
      reg: r.registration_number,
      type: vType,
      fuel: r.fuel_type,
      gpsKm: targetKm
    });
  }
});

console.log("Total unique specs after integrating fuel sheet:", existingSpecs.size);

// Format new RAW_SEED_SPECS array
const specLines = Array.from(existingSpecs.values()).map(s => {
  return `  { reg: '${s.reg}', type: '${s.type}', fuel: '${s.fuel}', gpsKm: ${s.gpsKm} },`;
});

console.log("Generated spec lines count:", specLines.length);
