import { useState, useCallback } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Upload, CheckCircle, AlertTriangle, ArrowLeft, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// ── Category maps ──────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { id: 'food',      name: 'Food & Ingredients' },
  { id: 'drinks',    name: 'Drinks & Beverages' },
  { id: 'packaging', name: 'Packaging' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'staff',     name: 'Staff' },
  { id: 'equipment', name: 'Equipment' },
  { id: 'rent',      name: 'Rent' },
  { id: 'other',     name: 'Other' },
];

const INCOME_CATEGORIES = ['Food', 'Drinks', 'Meal Preps', 'Catering', 'Other'];

const DEFAULT_EXPENSE_MAP: Record<string, string> = {
  'Food Expense':            'food',
  'Drink Expense':           'drinks',
  'Salary & Staff Advances': 'staff',
  'Staff Food':              'food',
  'Taxi':                    'other',
  'Tip Transfer':            'staff',
  'Ice':                     'food',
  'Cleaning & Supplies':     'utilities',
  'Vouchers':                'other',
  'Office Supplies':         'other',
  'Kitchen Equipment':       'equipment',
  'Gas':                     'utilities',
  'Repairs & Maintenance':   'equipment',
  'Miscellaneous':           'other',
  'Internet':                'utilities',
  'Accounting Services':     'other',
  'Advertising & Promotion': 'other',
  'Fuel & Petrol':           'other',
  'Restaurant Equipment':    'equipment',
  'Newspapers':              'other',
  'Uncategorized Expense':   'other',
  'Water Bill from PEA':     'utilities',
  'Electricity':             'utilities',
  'Subscriptions':           'utilities',
  'Rent Expense':            'rent',
  'Renovation Costs':        'equipment',
  'Mobile Phone':            'utilities',
  'Professional Fees':       'other',
  'Licenses':                'other',
  'Computer - Hardware':     'equipment',
  'Social Security':         'staff',
};

const DEFAULT_INCOME_MAP: Record<string, string> = {
  'Other Incomes':       'Other',
  'Food & Drink Income ': 'Food',
  'Food & Drink Income':  'Food',
};

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

function parseDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function parseAmount(amtStr: string): number {
  return parseFloat(amtStr.replace(/[^\d.]/g, '')) || 0;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedRow {
  amount: number;
  category: string;
  date: string;
  description: string;
  type: 'Expense' | 'Income';
}

interface CategoryStat {
  original: string;
  type: 'Expense' | 'Income';
  count: number;
  total: number;
  mappedTo: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'importing' | 'done';

export default function BulkFinanceImport() {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [expenseMap, setExpenseMap] = useState<Record<string, string>>(DEFAULT_EXPENSE_MAP);
  const [incomeMap, setIncomeMap] = useState<Record<string, string>>(DEFAULT_INCOME_MAP);
  const [progress, setProgress] = useState(0);
  const [imported, setImported] = useState({ expenses: 0, income: 0 });
  const [showAllCats, setShowAllCats] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);

      const parsedRows: ParsedRow[] = parsed.map(r => ({
        amount: parseAmount(r['Amount ฿'] || r['Amount'] || '0'),
        category: r['Category']?.trim() || 'Other',
        date: parseDate(r['Date of Transaction'] || r['Date'] || ''),
        description: r['Description']?.trim() || '',
        type: (r['Expense/Income']?.trim() as 'Expense' | 'Income') || 'Expense',
      })).filter(r => r.amount > 0);

      // Build per-category stats
      const statsMap: Record<string, CategoryStat> = {};
      for (const row of parsedRows) {
        const key = `${row.type}::${row.category}`;
        if (!statsMap[key]) {
          const mappedTo = row.type === 'Expense'
            ? (DEFAULT_EXPENSE_MAP[row.category] || 'other')
            : (DEFAULT_INCOME_MAP[row.category] || DEFAULT_INCOME_MAP[row.category.trim()] || 'Other');
          statsMap[key] = { original: row.category, type: row.type, count: 0, total: 0, mappedTo };
        }
        statsMap[key].count++;
        statsMap[key].total += row.amount;
      }

      const stats = Object.values(statsMap).sort((a, b) => b.total - a.total);
      setRows(parsedRows);
      setCategoryStats(stats);

      // Init maps with any new categories found
      const newExpMap = { ...DEFAULT_EXPENSE_MAP };
      const newIncMap = { ...DEFAULT_INCOME_MAP };
      for (const s of stats) {
        if (s.type === 'Expense' && !(s.original in newExpMap)) newExpMap[s.original] = 'other';
        if (s.type === 'Income' && !(s.original in newIncMap)) newIncMap[s.original] = 'Other';
      }
      setExpenseMap(newExpMap);
      setIncomeMap(newIncMap);
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
    else toast.error('Please drop a .csv file');
  }, [handleFile]);

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);

    const expenseRows = rows.filter(r => r.type === 'Expense');
    const incomeRows  = rows.filter(r => r.type === 'Income');
    const total = rows.length;
    let done = 0;
    let expCount = 0;
    let incCount = 0;

    // Batch write helper
    const BATCH_SIZE = 400;

    // Write expenses
    for (let i = 0; i < expenseRows.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = expenseRows.slice(i, i + BATCH_SIZE);
      for (const row of chunk) {
        const catId   = expenseMap[row.category] || 'other';
        const catName = EXPENSE_CATEGORIES.find(c => c.id === catId)?.name || 'Other';
        batch.set(doc(collection(db, 'finance_expenses')), {
          date:          row.date,
          supplier:      row.description,
          category_id:   catId,
          category_name: catName,
          total:         row.amount,
          currency:      'THB',
          items:         [],
          receipt_url:   '',
          notes:         `Imported from legacy system. Original category: ${row.category}`,
          logged_by:     'csv_import',
          created_at:    new Date().toISOString(),
        });
      }
      await batch.commit();
      done += chunk.length;
      expCount += chunk.length;
      setProgress(Math.round((done / total) * 100));
    }

    // Write income
    for (let i = 0; i < incomeRows.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = incomeRows.slice(i, i + BATCH_SIZE);
      for (const row of chunk) {
        const cat = incomeMap[row.category] || incomeMap[row.category.trim()] || 'Other';
        batch.set(doc(collection(db, 'finance_income')), {
          date:       row.date,
          amount:     row.amount,
          category:   cat,
          notes:      `${row.description} — Imported from legacy system. Original category: ${row.category}`,
          logged_by:  'csv_import',
          created_at: new Date().toISOString(),
        });
      }
      await batch.commit();
      done += chunk.length;
      incCount += chunk.length;
      setProgress(Math.round((done / total) * 100));
    }

    setImported({ expenses: expCount, income: incCount });
    setStep('done');
    toast.success(`Import complete — ${expCount.toLocaleString()} expenses, ${incCount} income records`);
  };

  const expenseStats = categoryStats.filter(s => s.type === 'Expense');
  const incomeStats  = categoryStats.filter(s => s.type === 'Income');
  const totalExpenses = expenseStats.reduce((s, r) => s + r.total, 0);
  const totalIncome   = incomeStats.reduce((s, r) => s + r.total, 0);
  const visibleExpStats = showAllCats ? expenseStats : expenseStats.slice(0, 10);

  const INPUT_CLS = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DA0A8] bg-white w-full';
  const LBL_CLS   = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

  // ── Step: Upload ───────────────────────────────────────────────────────────

  if (step === 'upload') return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link to="/dashboard/finance" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={14} /> Back to Finance
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Import Finance CSV</h1>
      <p className="text-gray-500 text-sm mb-8">Upload your legacy accounting export. We'll map the categories and write everything to Firestore.</p>

      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${isDragging ? 'border-[#1DA0A8] bg-[#1DA0A8]/5' : 'border-gray-200 bg-gray-50'}`}
      >
        <Upload size={40} className="mx-auto mb-4 text-gray-300" />
        <p className="font-semibold text-gray-700 mb-1">Drop your CSV file here</p>
        <p className="text-sm text-gray-400 mb-6">or click to browse</p>
        <label className="cursor-pointer">
          <span className="px-6 py-2.5 bg-[#1DA0A8] text-white rounded-xl font-semibold text-sm hover:bg-[#18919a] transition-colors">
            Choose File
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">Expected format</p>
        <p className="text-blue-600 font-mono text-xs">Amount ฿, Category, Date of Transaction, Description, Expense/Income</p>
      </div>
    </div>
  );

  // ── Step: Mapping ──────────────────────────────────────────────────────────

  if (step === 'mapping') return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/dashboard/finance" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft size={14} /> Back to Finance
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Review Category Mapping</h1>
      <p className="text-gray-500 text-sm mb-6">
        Found <strong>{rows.length.toLocaleString()}</strong> records spanning{' '}
        <strong>{rows[0]?.date}</strong> → <strong>{rows[rows.length - 1]?.date}</strong>.
        Adjust mappings if needed, then import.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-2xl font-bold text-gray-900">{expenseStats.reduce((s, r) => s + r.count, 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500">฿{totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Income</p>
          <p className="text-2xl font-bold text-gray-900">{incomeStats.reduce((s, r) => s + r.count, 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500">฿{totalIncome.toLocaleString()}</p>
        </div>
      </div>

      {/* Expense mapping table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Expense Categories ({expenseStats.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Original Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rows</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total ฿</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Maps to</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpStats.map((stat, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-700">{stat.original}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{stat.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">฿{stat.total.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={expenseMap[stat.original] || 'other'}
                      onChange={e => setExpenseMap(prev => ({ ...prev, [stat.original]: e.target.value }))}
                      className={INPUT_CLS}
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {expenseStats.length > 10 && (
          <button
            onClick={() => setShowAllCats(!showAllCats)}
            className="w-full py-3 text-sm text-[#1DA0A8] font-medium hover:bg-gray-50 flex items-center justify-center gap-1 border-t border-gray-100"
          >
            {showAllCats ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {expenseStats.length} categories</>}
          </button>
        )}
      </div>

      {/* Income mapping table */}
      {incomeStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Income Categories ({incomeStats.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Original Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rows</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total ฿</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Maps to</th>
                </tr>
              </thead>
              <tbody>
                {incomeStats.map((stat, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-700">{stat.original}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{stat.count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">฿{stat.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        value={incomeMap[stat.original] || incomeMap[stat.original.trim()] || 'Other'}
                        onChange={e => setIncomeMap(prev => ({ ...prev, [stat.original]: e.target.value }))}
                        className={INPUT_CLS}
                      >
                        {INCOME_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setStep('upload')}
          className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handleImport}
          className="flex-1 py-3 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-colors text-sm"
        >
          Import {rows.length.toLocaleString()} Records to Firestore
        </button>
      </div>
    </div>
  );

  // ── Step: Importing ────────────────────────────────────────────────────────

  if (step === 'importing') return (
    <div className="p-6 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={48} className="text-[#1DA0A8] animate-spin mb-6" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Importing…</h2>
      <p className="text-gray-500 text-sm mb-6">Writing {rows.length.toLocaleString()} records in batches. Don't close this tab.</p>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 bg-[#1DA0A8] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-400 mt-3">{progress}% complete</p>
    </div>
  );

  // ── Step: Done ─────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <CheckCircle size={56} className="text-green-500 mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete</h2>
      <p className="text-gray-500 mb-6">All records are now in Firestore and will appear in your Finance dashboard.</p>

      <div className="grid grid-cols-2 gap-4 w-full mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-3xl font-bold text-gray-900">{imported.expenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Income</p>
          <p className="text-3xl font-bold text-gray-900">{imported.income.toLocaleString()}</p>
        </div>
      </div>

      <Link
        to="/dashboard/finance"
        className="w-full py-3 bg-[#1DA0A8] text-white rounded-xl font-bold hover:bg-[#18919a] transition-colors text-sm text-center block"
      >
        Go to Finance Dashboard
      </Link>
    </div>
  );
}
