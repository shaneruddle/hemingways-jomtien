import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Expense, Income } from './types';
import TransactionLedger from './TransactionLedger';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_COLORS = ['#C84B31', '#4A5240', '#E8DCC8', '#8B7355', '#6B8F71', '#D4A853'];

export default function FinanceOverview({ financeRole = 'owner' }: { financeRole?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const startDate = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split('-').map(Number);
    const endDate = `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}-01`;

    const expQ = query(collection(db, 'finance_expenses'), where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'desc'));
    const unsubExp = onSnapshot(expQ, snap => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Expense[]));

    const incQ = query(collection(db, 'finance_income'), where('date', '>=', startDate), where('date', '<', endDate), orderBy('date', 'desc'));
    const unsubInc = onSnapshot(incQ, snap => setIncome(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Income[]));

    return () => { unsubExp(); unsubInc(); };
  }, [selectedMonth]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.total, 0), [expenses]);
  const totalIncome = useMemo(() => income.reduce((s, i) => s + i.amount, 0), [income]);
  const net = totalIncome - totalExpenses;
  const showProfit = financeRole === 'owner';

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category_name] = (map[e.category_name] || 0) + e.total; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    income.forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [income]);

  // Last 6 months for bar chart
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map(m => ({
      month: m.slice(5), // MM
      income: income.filter(i => i.date.startsWith(m)).reduce((s, i) => s + i.amount, 0),
      expenses: expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.total, 0),
    }));
  }, [income, expenses]);

  const fmt = (n: number) => `฿${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ val, label });
    }
    return opts;
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Finance Overview</h1>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1DA0A8]">
          {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 gap-4 ${showProfit ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {[
          { label: 'Total Income', value: totalIncome, icon: <TrendingUp size={20} />, color: 'text-green-600', bg: 'bg-green-50', show: true },
          { label: 'Total Expenses', value: totalExpenses, icon: <TrendingDown size={20} />, color: 'text-red-500', bg: 'bg-red-50', show: true },
          { label: 'Net Profit', value: net, icon: net >= 0 ? <DollarSign size={20} /> : <AlertCircle size={20} />, color: net >= 0 ? 'text-green-600' : 'text-red-600', bg: net >= 0 ? 'bg-cream' : 'bg-red-50', show: showProfit },
        ].filter(c => c.show).map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className={`${bg} ${color} p-2 rounded-full`}>{icon}</div>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {expensesByCategory.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-ink mb-4">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, expensesByCategory.slice(0, 10).length * 36)}>
              <BarChart data={expensesByCategory.slice(0, 10).sort((a, b) => b.value - a.value)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {expensesByCategory.slice(0, 10).map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {incomeByCategory.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-ink mb-4">Income by Category</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, incomeByCategory.length * 36)}>
              <BarChart data={incomeByCategory.sort((a, b) => b.value - a.value)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incomeByCategory.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* All-time ledgers */}
      <div className="space-y-6">
        <TransactionLedger kind="expense" financeRole={financeRole} />
        <TransactionLedger kind="income" financeRole={financeRole} />
      </div>
    </div>
  );
}
