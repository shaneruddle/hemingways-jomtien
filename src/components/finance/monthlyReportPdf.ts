import { collection, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../../firebase';
import { MonthlySummaryRow } from './types';
import {
  COGS_CATEGORY_IDS,
  COGS_CATEGORY_NAMES,
  DIVIDEND_CATEGORY_ID,
  DIVIDEND_CATEGORY_NAME,
  parseMonthLabel,
  nextMonth,
} from './MonthlySummary';

const TEAL = '#1DA0A8';
const TEAL_DARK = '#136066';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LIGHT_ROW = '#F7FAFA';
const RED = '#DC4C4C';
const GREEN = '#1E8E5A';

const fmt = (n: number) => `${n < 0 ? '-' : ''}THB ${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt0 = (n: number) => `${n < 0 ? '-' : ''}THB ${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type CategoryBreakdown = {
  hasData: boolean;
  incomeByCategory: Map<string, number>;
  cogsByCategory: Map<string, number>;
  operatingByCategory: Map<string, number>;
};

// Pulls per-transaction category detail for the given month directly from
// finance_income / finance_expenses. Historical months (before live logging
// began) have no transaction records — hasData is false in that case, and the
// report falls back to the Monthly Summary row's already-saved totals only.
async function fetchCategoryBreakdown(year: number, month: number): Promise<CategoryBreakdown> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const { year: endYear, month: endMonth } = nextMonth(year, month);
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  const [incomeSnap, expenseSnap] = await Promise.all([
    getDocs(query(collection(db, 'finance_income'), where('date', '>=', startDate), where('date', '<', endDate))),
    getDocs(query(collection(db, 'finance_expenses'), where('date', '>=', startDate), where('date', '<', endDate))),
  ]);

  const incomeByCategory = new Map<string, number>();
  incomeSnap.docs.forEach(d => {
    const e = d.data() as { amount?: number; category?: string };
    const cat = e.category || 'Uncategorized';
    incomeByCategory.set(cat, (incomeByCategory.get(cat) || 0) + (e.amount || 0));
  });

  const cogsByCategory = new Map<string, number>();
  const operatingByCategory = new Map<string, number>();
  expenseSnap.docs.forEach(d => {
    const e = d.data() as { total?: number; category_id?: string; category_name?: string };
    const total = e.total || 0;
    const isDividend = e.category_id === DIVIDEND_CATEGORY_ID || e.category_name === DIVIDEND_CATEGORY_NAME;
    const isCogs = (!!e.category_id && COGS_CATEGORY_IDS.has(e.category_id)) || (!!e.category_name && COGS_CATEGORY_NAMES.has(e.category_name));
    const cat = e.category_name || e.category_id || 'Uncategorized';
    if (isDividend) return; // dividends are shown from the row total, not itemized here
    if (isCogs) cogsByCategory.set(cat, (cogsByCategory.get(cat) || 0) + total);
    else operatingByCategory.set(cat, (operatingByCategory.get(cat) || 0) + total);
  });

  return {
    hasData: incomeSnap.size > 0 || expenseSnap.size > 0,
    incomeByCategory,
    cogsByCategory,
    operatingByCategory,
  };
}

function sortedEntries(map: Map<string, number>): [string, number][] {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  bars: { label: string; value: number; color: string }[]
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text(title, x, y);
  y += 6;

  const maxVal = Math.max(...bars.map(b => Math.abs(b.value)), 1);
  const barHeight = 5.2;
  const gap = 3;
  const labelWidth = 46;
  const barAreaWidth = width - labelWidth - 28;

  bars.forEach(b => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(INK);
    doc.text(b.label, x, y + barHeight - 1.3, { maxWidth: labelWidth - 2 });

    const barW = Math.max((Math.abs(b.value) / maxVal) * barAreaWidth, 1);
    doc.setFillColor(b.color);
    doc.roundedRect(x + labelWidth, y, barW, barHeight, 0.8, 0.8, 'F');

    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    doc.text(fmt0(b.value), x + labelWidth + barW + 2, y + barHeight - 1.3);

    y += barHeight + gap;
  });

  return y;
}

export async function generateMonthlyReportPdf(row: MonthlySummaryRow, allRows: MonthlySummaryRow[]): Promise<void> {
  const parsed = parseMonthLabel(row.label);
  const breakdown: CategoryBreakdown = parsed
    ? await fetchCategoryBreakdown(parsed.year, parsed.month)
    : { hasData: false, incomeByCategory: new Map(), cogsByCategory: new Map(), operatingByCategory: new Map() };

  const income = row.income;
  const expense = row.cogsExpense + row.operatingExpense;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 15;

  const footer = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      doc.text('Hemingways Jomtien — Confidential, for partner distribution', marginX, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
  };

  // ---- Page 1: header + executive summary -------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(INK);
  doc.text('Hemingways Jomtien', marginX, 20);

  doc.setFontSize(12);
  doc.setTextColor(TEAL_DARK);
  doc.text(`Monthly Financial Report — ${row.label}`, marginX, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  const generatedOn = new Date().toISOString().slice(0, 10);
  doc.text(`Prepared for the partners  ·  Generated ${generatedOn}  ·  Figures from the Monthly Summary record`, marginX, 34);

  doc.setDrawColor(TEAL);
  doc.setLineWidth(0.8);
  doc.line(marginX, 38, pageW - marginX, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text('Executive Summary', marginX, 48);

  const summaryRows: [string, string][] = [
    ['Income', fmt0(income)],
    ['COGS Expense (Food / Drink / Ice)', fmt(row.cogsExpense)],
    ['Operating Expense', fmt(row.operatingExpense)],
    ['Total Expense', fmt(expense)],
    ['Profit', fmt(row.profit)],
    ['Dividends Paid', fmt(row.dividends)],
    ['Starting Balance', fmt0(row.balance)],
    ['New Balance', fmt(row.newBalance)],
  ];

  autoTable(doc, {
    startY: 53,
    margin: { left: marginX },
    tableWidth: 95,
    body: summaryRows,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, textColor: INK, cellPadding: { top: 2.2, bottom: 2.2, left: 0, right: 4 } },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 3 || data.row.index === 4 || data.row.index === 7) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.index === 3) data.cell.styles.fillColor = false as unknown as undefined;
      }
      if (data.row.index === 4 && data.column.index === 1) {
        data.cell.styles.textColor = row.profit >= 0 ? GREEN : RED;
      }
    },
  });

  if (breakdown.hasData) {
    const barBottom = drawBarChart(doc, marginX + 105, 48, pageW - marginX - (marginX + 105), `Income to Profit — ${row.label}`, [
      { label: 'Income', value: income, color: TEAL },
      { label: 'COGS', value: -row.cogsExpense, color: RED },
      { label: 'Operating', value: -row.operatingExpense, color: '#E8A33D' },
      { label: 'Profit', value: row.profit, color: GREEN },
    ]);
    void barBottom;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text('Detailed category breakdown is not available for this month —', marginX + 105, 55);
    doc.text('no itemized transactions are on record (pre-dates live logging).', marginX + 105, 60);
  }

  // ---- Income breakdown ---------------------------------------------------
  if (breakdown.hasData && breakdown.incomeByCategory.size > 0) {
    const incomeEntries = sortedEntries(breakdown.incomeByCategory);
    const incomeTotal = incomeEntries.reduce((s, [, v]) => s + v, 0);
    const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(INK);
    doc.text('Income Breakdown', marginX, startY - 4);
    autoTable(doc, {
      startY,
      margin: { left: marginX },
      tableWidth: 120,
      head: [['Category', 'Amount', '% of Income']],
      body: [
        ...incomeEntries.map(([name, amt]) => [name, fmt0(amt), `${((amt / incomeTotal) * 100).toFixed(1)}%`]),
        ['Total', fmt0(incomeTotal), '100.0%'],
      ],
      headStyles: { fillColor: '#EAF6F6', textColor: INK, fontStyle: 'bold', fontSize: 9.5 },
      styles: { font: 'helvetica', fontSize: 9.5, textColor: INK },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === incomeEntries.length) data.cell.styles.fontStyle = 'bold';
      },
    });
  }

  // ---- Expense breakdown (new page) ---------------------------------------
  if (breakdown.hasData && (breakdown.cogsByCategory.size > 0 || breakdown.operatingByCategory.size > 0)) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(INK);
    doc.text(`Expense Breakdown — ${row.label}`, marginX, 18);

    const combined = [
      ...sortedEntries(breakdown.cogsByCategory).map(([n, v]) => ({ label: `${n} (COGS)`, value: v, color: TEAL })),
      ...sortedEntries(breakdown.operatingByCategory).map(([n, v]) => ({ label: n, value: v, color: '#7BC6CA' })),
    ].sort((a, b) => b.value - a.value).slice(0, 12);
    drawBarChart(doc, marginX, 26, pageW - marginX * 2, 'Top Expense Categories', combined);

    const cogsEntries = sortedEntries(breakdown.cogsByCategory);
    const operatingEntries = sortedEntries(breakdown.operatingByCategory);
    const chartBottom = 26 + 6 + combined.length * 8.2 + 10;

    if (cogsEntries.length > 0) {
      autoTable(doc, {
        startY: chartBottom,
        margin: { left: marginX },
        tableWidth: (pageW - marginX * 2 - 6) / 2,
        head: [['COGS Category', 'Amount', '% of Total']],
        body: [
          ...cogsEntries.map(([n, v]) => [n, fmt(v), `${((v / expense) * 100).toFixed(1)}%`]),
          ['Subtotal', fmt(row.cogsExpense), `${((row.cogsExpense / expense) * 100).toFixed(1)}%`],
        ],
        headStyles: { fillColor: '#F3F4F6', textColor: INK, fontStyle: 'bold', fontSize: 8.5 },
        styles: { font: 'helvetica', fontSize: 8.5, textColor: INK },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.row.index === cogsEntries.length) data.cell.styles.fontStyle = 'bold';
        },
      });
    }
    if (operatingEntries.length > 0) {
      autoTable(doc, {
        startY: chartBottom,
        margin: { left: marginX + (pageW - marginX * 2 - 6) / 2 + 6 },
        tableWidth: (pageW - marginX * 2 - 6) / 2,
        head: [['Operating Category', 'Amount', '% of Total']],
        body: [
          ...operatingEntries.map(([n, v]) => [n, fmt(v), `${((v / expense) * 100).toFixed(1)}%`]),
          ['Subtotal', fmt(row.operatingExpense), `${((row.operatingExpense / expense) * 100).toFixed(1)}%`],
        ],
        headStyles: { fillColor: '#F3F4F6', textColor: INK, fontStyle: 'bold', fontSize: 8.5 },
        styles: { font: 'helvetica', fontSize: 8.5, textColor: INK },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.row.index === operatingEntries.length) data.cell.styles.fontStyle = 'bold';
        },
      });
    }
  }

  // ---- Monthly Summary sheet (new page) -----------------------------------
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK);
  doc.text('Monthly Summary Sheet', marginX, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text('Running balance, income, expenses, profit and dividends by month.', marginX, 24);

  const historyRows = allRows.filter(r => r.order > 0).slice().reverse();
  autoTable(doc, {
    startY: 29,
    margin: { left: marginX, right: marginX },
    head: [['Month', 'Balance', 'Income', 'COGS', 'Operating', 'Profit', 'Dividends', 'New Balance']],
    body: historyRows.map(r => [
      r.label, fmt0(r.balance), fmt0(r.income), fmt0(r.cogsExpense), fmt0(r.operatingExpense),
      fmt0(r.profit), fmt0(r.dividends), fmt0(r.newBalance),
    ]),
    headStyles: { fillColor: TEAL_DARK, textColor: '#FFFFFF', fontStyle: 'bold', fontSize: 8 },
    styles: { font: 'helvetica', fontSize: 7.6, textColor: INK, cellPadding: 2.2 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    alternateRowStyles: { fillColor: LIGHT_ROW },
    didParseCell: (data) => {
      if (data.row.section === 'body' && historyRows[data.row.index]?.label === row.label) {
        data.cell.styles.fillColor = '#DFF3F3';
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  footer();
  doc.save(`Hemingways_Jomtien_Monthly_Report_${row.label.replace(/\s+/g, '_')}.pdf`);
}
