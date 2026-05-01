const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const departments = [
  { name: 'ICU',        units: ['ICU North', 'ICU South'] },
  { name: 'Emergency',  units: ['ER Bay A', 'ER Bay B', 'Trauma'] },
  { name: 'Surgery',    units: ['OR Suite 1', 'OR Suite 2', 'Pre-Op'] },
  { name: 'Med/Surg',   units: ['4 North', '4 South', '5 North'] },
  { name: 'Pediatrics', units: ['PICU', 'Peds 3 East'] },
];

const staff = [
  { name: 'Sarah Chen',        dept: 'ICU',        unit: 'ICU North' },
  { name: 'Mike Torres',       dept: 'ICU',        unit: 'ICU South' },
  { name: 'Jennifer Walsh',    dept: 'ICU',        unit: 'ICU North' },
  { name: 'Robert Kim',        dept: 'Emergency',  unit: 'ER Bay A' },
  { name: 'Amanda Foster',     dept: 'Emergency',  unit: 'Trauma' },
  { name: 'David Patel',       dept: 'Emergency',  unit: 'ER Bay B' },
  { name: 'Lisa Martinez',     dept: 'Surgery',    unit: 'OR Suite 1' },
  { name: 'James O\'Brien',    dept: 'Surgery',    unit: 'Pre-Op' },
  { name: 'Maria Santos',      dept: 'Surgery',    unit: 'OR Suite 2' },
  { name: 'Kevin Johnson',     dept: 'Med/Surg',   unit: '4 North' },
  { name: 'Rachel Thompson',   dept: 'Med/Surg',   unit: '4 South' },
  { name: 'Carlos Rivera',     dept: 'Med/Surg',   unit: '5 North' },
  { name: 'Emily Clark',       dept: 'Pediatrics', unit: 'PICU' },
  { name: 'Brian Williams',    dept: 'Pediatrics', unit: 'Peds 3 East' },
  { name: 'Stephanie Lee',     dept: 'Pediatrics', unit: 'PICU' },
];

const locations = {
  'ICU':        ['ICU North Sink', 'ICU South Sink', 'ICU Nurses Station Dispenser', 'ICU Hallway Dispenser'],
  'Emergency':  ['ER Triage Sink', 'ER Bay A Dispenser', 'ER Bay B Dispenser', 'Trauma Bay Sink'],
  'Surgery':    ['OR Scrub Sink A', 'OR Scrub Sink B', 'Pre-Op Dispenser', 'Surgical Hallway Dispenser'],
  'Med/Surg':   ['4 North Nurses Station', '4 South Room Sink', '5 North Hallway Dispenser', '5 North Room Sink'],
  'Pediatrics': ['PICU Sink', 'PICU Dispenser', 'Peds 3 East Sink', 'Peds Entry Dispenser'],
};

// Higher compliance rate for some staff, lower for others — makes reporting interesting
const complianceRate = {
  'Sarah Chen':      0.95,
  'Mike Torres':     0.60,
  'Jennifer Walsh':  0.90,
  'Robert Kim':      0.85,
  'Amanda Foster':   0.50,
  'David Patel':     0.80,
  'Lisa Martinez':   0.95,
  'James O\'Brien':  0.70,
  'Maria Santos':    0.88,
  'Kevin Johnson':   0.65,
  'Rachel Thompson': 0.92,
  'Carlos Rivera':   0.55,
  'Emily Clark':     0.90,
  'Brian Williams':  0.75,
  'Stephanie Lee':   0.85,
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shiftHour() {
  // Weighted toward realistic shift times
  const shifts = [
    ...Array(8).fill(null).map(() => randomBetween(7, 14)),   // day shift
    ...Array(6).fill(null).map(() => randomBetween(15, 22)),  // evening shift
    ...Array(2).fill(null).map(() => randomBetween(23, 6)),   // night shift
  ];
  return pick(shifts);
}

async function seed() {
  console.log('Seeding mock data...\n');

  const scans = [];
  const now = new Date();

  for (let daysAgo = 60; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    for (const person of staff) {
      // Fewer scans on weekends, and respect each person's compliance rate
      const scanCount = isWeekend
        ? randomBetween(0, 3)
        : randomBetween(2, 8);

      for (let i = 0; i < scanCount; i++) {
        if (Math.random() > complianceRate[person.name]) continue;

        const scanTime = new Date(date);
        const hour = shiftHour();
        scanTime.setHours(hour, randomBetween(0, 59), randomBetween(0, 59));

        const deptLocations = locations[person.dept];
        scans.push({
          user_name:  person.name,
          department: person.dept,
          unit:       person.unit,
          location:   pick(deptLocations),
          scanned_at: scanTime.toISOString(),
        });
      }
    }
  }

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < scans.length; i += 100) {
    const batch = scans.slice(i, i + 100);
    const values = batch.map((s, j) => {
      const base = j * 5;
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5})`;
    }).join(', ');

    const params = batch.flatMap(s => [s.user_name, s.location, s.department, s.unit, s.scanned_at]);

    await pool.query(
      `INSERT INTO scans (user_name, location, department, unit, scanned_at) VALUES ${values}`,
      params
    );
    inserted += batch.length;
  }

  console.log(`Inserted ${inserted} scans across ${staff.length} staff members`);
  console.log(`Departments: ${departments.map(d => d.name).join(', ')}`);
  console.log('\nDone.');
  await pool.end();
}

seed().catch(err => {
  console.error(err.message);
  process.exit(1);
});
