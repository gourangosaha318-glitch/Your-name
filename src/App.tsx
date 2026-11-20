import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { DailyAccountsPage } from './pages/DailyAccountsPage';
import { WheatPurchasePage } from './pages/WheatPurchasePage';
import { ProductionPage } from './pages/ProductionPage';
import { ExpenseVoucherPage } from './pages/ExpenseVoucherPage';
import { BankManagementPage } from './pages/BankManagementPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProductProvider } from './context/ProductContext';
import { SalesProvider } from './context/SalesContext';
import { UserRole } from './types/mill';
import { Bell } from 'lucide-react';

// Protected Route Guard with session restore waiting
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf7ee] text-[#0d381e] font-bold text-sm">
        সেশন যাচাই করা হচ্ছে...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Role-Based Route Guard
const RoleRoute: React.FC<{ allowedRoles: UserRole[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'TESTER' ? '/sales' : '/'} replace />;
  }
  return <>{children}</>;
};

const DefaultFallback: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'TESTER' ? '/sales' : '/'} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <SalesProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Mill Management Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* 1. ড্যাশবোর্ড */}
                <Route
                  index
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <DashboardPage />
                    </RoleRoute>
                  }
                />

                {/* 2. দৈনিক হিসাব ও স্টক খাতা */}
                <Route
                  path="daily-accounts"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <DailyAccountsPage />
                    </RoleRoute>
                  }
                />

                {/* 3. গম ক্রয় */}
                <Route
                  path="wheat-purchase"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <WheatPurchasePage />
                    </RoleRoute>
                  }
                />

                {/* 4. গম ভাঙানো ও উৎপাদন */}
                <Route
                  path="production"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <ProductionPage />
                    </RoleRoute>
                  }
                />

                {/* 5. গুদাম ও স্টক ইতিহাস */}
                <Route
                  path="inventory"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <InventoryPage />
                    </RoleRoute>
                  }
                />

                {/* 6. বিক্রয় মেমো ও গেট পাস (Owner, Manager, Tester) */}
                <Route
                  path="sales"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER', 'TESTER']}>
                      <SalesPage />
                    </RoleRoute>
                  }
                />

                {/* 7. ক্রেতা খাতা ও লেজার */}
                <Route
                  path="customers"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <CustomersPage />
                    </RoleRoute>
                  }
                />

                {/* 8. সরবরাহকারী ও ধরন */}
                <Route
                  path="suppliers"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <SuppliersPage />
                    </RoleRoute>
                  }
                />

                {/* 9. কর্মচারী লেনদেন */}
                <Route
                  path="employees"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <EmployeesPage />
                    </RoleRoute>
                  }
                />

                {/* 10. খরচের ভাউচার */}
                <Route
                  path="income-expense"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <ExpenseVoucherPage />
                    </RoleRoute>
                  }
                />

                {/* 11. ক্যাশ ও ব্যাংক (পিন সুরক্ষিত) */}
                <Route
                  path="cash-bank"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <BankManagementPage />
                    </RoleRoute>
                  }
                />

                {/* 12. দৈনিক পূর্ণাঙ্গ রিপোর্ট */}
                <Route
                  path="reports"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <ReportsPage />
                    </RoleRoute>
                  }
                />

                {/* 13. নোটিফিকেশন */}
                <Route
                  path="notifications"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <PlaceholderPage
                        title="সিস্টেম নোটিফিকেশন ও অ্যালার্ট"
                        subtitle="স্টক সতর্কতা, বকেয়া পরিশোধ নোটিশ ও অনুমোদন সংক্রান্ত তাৎক্ষণিক বার্তা"
                        icon={Bell}
                        sampleColumns={['বার্তার ধরন', 'বিস্তারিত নোটিফিকেশন', 'সময়', 'স্ট্যাটাস']}
                        sampleData={[
                          { type: 'স্টক অ্যালার্ট ⚠️', desc: 'গুদামে গমের স্টক পুনরায় ক্রয় স্তরে নজর রাখুন', time: 'আজ', status: 'সক্রিয়' },
                        ]}
                      />
                    </RoleRoute>
                  }
                />

                {/* 14. ইউজার ও পারমিশন (Owner Only) */}
                <Route
                  path="users"
                  element={
                    <RoleRoute allowedRoles={['OWNER']}>
                      <UsersPage />
                    </RoleRoute>
                  }
                />

                {/* 15. অডিট লগ (Owner Only) */}
                <Route
                  path="audit-logs"
                  element={
                    <RoleRoute allowedRoles={['OWNER']}>
                      <AuditLogsPage />
                    </RoleRoute>
                  }
                />

                {/* 16. সেটিংস */}
                <Route
                  path="settings"
                  element={
                    <RoleRoute allowedRoles={['OWNER', 'MANAGER']}>
                      <SettingsPage />
                    </RoleRoute>
                  }
                />

                {/* 17. ডাটাবেস ব্যাকআপ (Owner Only) */}
                <Route
                  path="backup"
                  element={
                    <RoleRoute allowedRoles={['OWNER']}>
                      <SettingsPage />
                    </RoleRoute>
                  }
                />

                {/* Fallback redirect based on role */}
                <Route path="*" element={<DefaultFallback />} />
              </Route>
              <Route path="*" element={<DefaultFallback />} />
            </Routes>
          </BrowserRouter>
        </SalesProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
