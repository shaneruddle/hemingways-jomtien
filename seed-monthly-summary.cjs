#!/usr/bin/env node
/**
 * seed-monthly-summary.cjs
 * One-time seed of historical rows into the finance_monthly_summary
 * Firestore collection, using firebase-admin ADC (Application Default
 * Credentials) — same approach as deploy-rules.js.
 *
 * Run from Cloud Shell: node seed-monthly-summary.cjs
 *
 * Safe to re-run: skips any label that already exists in the collection,
 * so running it twice will not create duplicates.
 */

const admin = require('firebase-admin');

const PROJECT_ID = 'hemingways-jomtien-website';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const db = admin.firestore();

// Opening balance carried in from before the ledger below starts.
const OPENING_BALANCE = 474152.00;

// [label, income, cogsExpense, operatingExpense, dividends]
// Balance / Profit / New Balance are derived below by chaining forward,
// exactly as the source spreadsheet's formulas do:
//   profit     = income - cogsExpense - operatingExpense
//   newBalance = balance + profit - dividends
//   next month's balance = this month's newBalance
const MONTHS = [
  ['December 2023',  4953212.00, 2283928.00, 1079447.00, 1600000.00],
  ['January 2024',   5095369.00, 2328218.00, 1242970.00, 1600000.00],
  ['February 2024',  4517619.00, 2127797.00, 1228957.00, 1200000.00],
  ['March 2024',     4330818.00, 2027520.00, 1134972.00, 1200000.00],
  ['April 2024',     3973451.00, 1887229.00, 1266645.00, 800000.00],
  ['May 2024',       3845694.00, 1989463.00, 1173955.00, 600000.00],
  ['June 2024',      3439248.00, 1602459.00, 1070658.00, 600000.00],
  ['July 2024',      3858743.00, 1880486.00, 1080744.00, 1000000.00],
  ['August 2024',    3714556.00, 1880970.00, 1094226.00, 1000000.00],
  ['September 2024', 3377354.00, 1553708.00, 990779.00,  800000.00],
  ['October 2024',   3935039.00, 1877416.00, 1146648.00, 800000.00],
  ['November 2024',  4288101.00, 2017772.00, 1302891.00, 1200000.00],
  ['December 2024',  5408896.00, 2502199.66, 1317164.00, 1400000.00],
  ['January 2025',   5431807.00, 2546612.00, 1416786.00, 1600000.00],
  ['February 2025',  4801336.00, 2322274.00, 1012119.00, 1600000.00],
  ['March 2025',      5079677.00, 2398486.00, 1174702.00, 1400000.00],
  ['April 2025',      4217517.00, 2125043.00, 1107924.00, 1000000.00],
  ['May 2025',        3977774.00, 1994264.00, 1123660.00, 800000.00],
  ['June 2025',       3911842.00, 1983980.00, 1170730.00, 800000.00],
  ['July 2025',        4070247.00, 2061853.00, 1254388.00, 800000.00],
  ['August 2025',      3922821.00, 1922316.00, 1238948.00, 800000.00],
  ['September 2025',   3667124.00, 1690644.00, 1051285.00, 800000.00],
  ['October 2025',     4044312.00, 2099031.00, 1186661.00, 800000.00],
  ['November 2025',    4745032.00, 2306281.00, 1443494.00, 1000000.00],
  ['December 2025',    5822514.00, 2871629.00, 1459174.00, 1600000.00],
  ['January 2026',     5917427.00, 2815430.00, 1431962.00, 1600000.00],
  ['February 2026',    5163021.00, 2427041.00, 1317347.00, 1400000.00],
  ['March 2026',       5358711.00, 2459236.00, 1371574.00, 1400000.00],
  ['April 2026',       4323378.00, 2242091.00, 1312232.00, 800000.00],
  ['May 2026',         4262964.00, 1910077.00, 1270635.00, 1000000.00],
  ['June 2026',        3750748.00, 1920143.00, 1292909.00, 400000.00],
];

async function seed() {
  const nowIso = new Date().toISOString();

  console.log('Checking for existing rows...');
  const existingSnap = await db.collection('finance_monthly_summary').get();
  const existingLabels = new Set(existingSnap.docs.map(d => d.data().label));

  const rows = [];
  rows.push({
    order: 0,
    label: 'Balance from old Accounts',
    balance: 0,
    income: 0,
    cogsExpense: 0,
    operatingExpense: 0,
    dividends: 0,
    profit: 0,
    newBalance: OPENING_BALANCE,
  });

  let runningBalance = OPENING_BALANCE;
  MONTHS.forEach(([label, income, cogsExpense, operatingExpense, dividends], i) => {
    const profit = income - cogsExpense - operatingExpense;
    const newBalance = runningBalance + profit - dividends;
    rows.push({
      order: i + 1,
      label,
      balance: runningBalance,
      income,
      cogsExpense,
      operatingExpense,
      dividends,
      profit,
      newBalance,
    });
    runningBalance = newBalance;
  });

  let written = 0;
  let skipped = 0;
  for (const row of rows) {
    if (existingLabels.has(row.label)) {
      console.log(`Skipping "${row.label}" — already exists`);
      skipped++;
      continue;
    }
    await db.collection('finance_monthly_summary').add({
      ...row,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: 'seed-script',
    });
    console.log(`Wrote "${row.label}" — New Balance ${row.newBalance.toFixed(2)}`);
    written++;
  }

  console.log(`\n✓ Done. ${written} written, ${skipped} skipped (already present).`);
  console.log(`  Final balance (June 2026): ${runningBalance.toFixed(2)}`);
}

seed().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
