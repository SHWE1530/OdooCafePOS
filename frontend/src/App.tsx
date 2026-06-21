import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import KitchenPage from './pages/KitchenPage';
import TablesPage from './pages/TablesPage';
import ProductsPage from './pages/admin/ProductsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import CouponsPage from './pages/admin/CouponsPage';
import PromotionsPage from './pages/admin/PromotionsPage';
import CustomersPage from './pages/admin/CustomersPage';
import FloorsPage from './pages/admin/FloorsPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/admin/UsersPage';
import CustomerDisplayPage from './pages/CustomerDisplayPage';
import SelfOrderPage from './pages/SelfOrderPage';
import PaymentMethodsPage from './pages/admin/PaymentMethodsPage';
import SelfOrderConfigPage from './pages/admin/SelfOrderConfigPage';
import SelfOrderRedirect from './components/SelfOrderRedirect';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/customer-display" element={<CustomerDisplayPage />} />
              <Route path="/self-order" element={<SelfOrderPage />} />
              <Route path="/s/:token" element={<SelfOrderRedirect />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="pos" element={<POSPage />} />
                <Route path="kitchen" element={<KitchenPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="admin/products" element={<ProductsPage />} />
                <Route path="admin/categories" element={<CategoriesPage />} />
                <Route path="admin/coupons" element={<CouponsPage />} />
                <Route path="admin/promotions" element={<PromotionsPage />} />
                <Route path="admin/customers" element={<CustomersPage />} />
                <Route path="admin/floors" element={<FloorsPage />} />
                <Route path="admin/payment-methods" element={<ProtectedRoute allowedRoles={['admin']}><PaymentMethodsPage /></ProtectedRoute>} />
                <Route path="admin/self-order-config" element={<ProtectedRoute allowedRoles={['admin']}><SelfOrderConfigPage /></ProtectedRoute>} />
                <Route path="admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
