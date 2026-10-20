import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthContext } from './auth/auth-context';
import { applicationAuthClient } from './auth/api/application-client';
import type { AuthClient } from './auth/api/contract.provisional';
import { LoginPage } from './auth/pages/LoginPage';
import { DashboardPage } from './dashboard/pages/DashboardPage';
import { MenuPage } from './menu/pages/MenuPage';
import { CategoriesPage } from './menu/pages/CategoriesPage';
import { ProtectedRoute } from './auth/components/ProtectedRoute';
import { AuthenticatedAccess } from './auth/components/AuthenticatedAccess';
import { SalesProvider } from './sales/state/SalesProvider';
import { useSales } from './sales/state/sales-context';
import { SalesPage } from './sales/pages/SalesPage';
import './shared/styles/fonts.css';
import './shared/styles/tokens.css';
import './shared/styles/global.css';

function ModuleRoutes() {
  const { beforeLogout } = useSales();
  return (
    <Routes>
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <AuthenticatedAccess
              title="Gestión de ventas"
              bounded
              beforeLogout={beforeLogout}
            >
              <SalesPage />
            </AuthenticatedAccess>
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <AuthenticatedAccess
              title="Administración de Menú"
              beforeLogout={beforeLogout}
            >
              <MenuPage />
            </AuthenticatedAccess>
          </ProtectedRoute>
        }
      />
      <Route
        path="/menu/categories"
        element={
          <ProtectedRoute>
            <AuthenticatedAccess title="Categorías" beforeLogout={beforeLogout}>
              <CategoriesPage />
            </AuthenticatedAccess>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthenticatedAccess
              title="Dashboard"
              bounded
              beforeLogout={beforeLogout}
            >
              <DashboardPage />
            </AuthenticatedAccess>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
export function AccessRoutes({ client }: { client: AuthClient }) {
  return (
    <AuthContext value={client}>
      <SalesProvider>
        <ModuleRoutes />
      </SalesProvider>
    </AuthContext>
  );
}
export function App() {
  return (
    <BrowserRouter>
      <AccessRoutes client={applicationAuthClient} />
    </BrowserRouter>
  );
}
