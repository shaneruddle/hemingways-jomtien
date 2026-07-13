import { useState } from 'react';
import FinanceOverview from './FinanceOverview';
import LogExpense from './LogExpense';
import LogIncome from './LogIncome';
import Ingredients from './Ingredients';
import RecipeCosting from './RecipeCosting';
import FinanceReports from './FinanceReports';
import FinanceSuppliers from './FinanceSuppliers';
import { LayoutDashboard, Receipt, TrendingUp, Scale, FileBarChart, ChefHat, Upload, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

type FinanceRole = 'owner' | 'manager' | 'cashier';

function getFinanceRole(user: any): FinanceRole {
  if (!user) return 'cashier';
  // Only super_admin sees net profit
  if (user.role === 'super_admin') return 'owner';
  // admin (including info@), manager see income + expenses but not profit
  if (user.role === 'admin' || user.role === 'manager' || user.email?.toLowerCase() === 'info@hemingwaysjomtien.com') return 'manager';
  return 'cashier';
}

const ALL_TABS = [
  { id: 'overview',     label: 'Overview',        icon: <LayoutDashboard size={16} />, roles: ['owner', 'manager'] },
  { id: 'expense',      label: 'Log Expense',      icon: <Receipt size={16} />,         roles: ['owner', 'manager', 'cashier'] },
  { id: 'income',       label: 'Log Income',       icon: <TrendingUp size={16} />,      roles: ['owner', 'manager', 'cashier'] },
  { id: 'suppliers',    label: 'Suppliers',        icon: <Truck size={16} />,           roles: ['owner', 'manager'] },
  { id: 'ingredients',  label: 'Ingredients',      icon: <Scale size={16} />,           roles: ['owner', 'manager'] },
  { id: 'recipes',      label: 'Recipe Costing',   icon: <ChefHat size={16} />,         roles: ['owner', 'manager'] },
  { id: 'reports',      label: 'Reports',          icon: <FileBarChart size={16} />,    roles: ['owner'] },
];

export default function FinanceDashboard({ user }: { user: any }) {
  const financeRole = getFinanceRole(user);
  const tabs = ALL_TABS.filter(t => t.roles.includes(financeRole));
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'expense');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab nav */}
      <div className="bg-white border-b border-gray-100 px-6 sticky top-0 z-10">
        <div className="flex gap-1 overflow-x-auto items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#1DA0A8] text-[#1DA0A8]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          {financeRole === 'owner' && (
            <Link
              to="/dashboard/finance/import"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#1DA0A8] whitespace-nowrap border border-gray-200 rounded-lg hover:border-[#1DA0A8] transition-colors my-auto mr-1"
            >
              <Upload size={12} /> Import CSV
            </Link>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'    && <FinanceOverview financeRole={financeRole} />}
        {activeTab === 'expense'     && <LogExpense user={user} financeRole={financeRole} />}
        {activeTab === 'income'      && <LogIncome user={user} financeRole={financeRole} />}
        {activeTab === 'suppliers'   && <FinanceSuppliers user={user} />}
        {activeTab === 'ingredients' && <Ingredients />}
        {activeTab === 'recipes'     && <RecipeCosting />}
        {activeTab === 'reports'     && <FinanceReports />}
      </div>
    </div>
  );
}
