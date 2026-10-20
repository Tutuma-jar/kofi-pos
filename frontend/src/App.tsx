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
import './shared/styles/fonts.css';
import './shared/styles/tokens.css';
import './shared/styles/global.css';

export function AccessRoutes({ client }: { client: AuthClient }) {
  return (
    <AuthContext value={client}>
      <Routes>
        <Route
          path="/menu"
          element={
            <ProtectedRoute>
              <AuthenticatedAccess title="Administración de Menú">
                <MenuPage />
              </AuthenticatedAccess>
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu/categories"
          element={
            <ProtectedRoute>
              <AuthenticatedAccess title="Categorías">
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
              <AuthenticatedAccess title="Dashboard" bounded>
                <DashboardPage />
              </AuthenticatedAccess>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
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
