import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthContext } from './auth/auth-context';
import { demoClient } from './auth/api/demo-client';
import type { AuthClient } from './auth/api/contract.provisional';
import { LoginPage } from './auth/pages/LoginPage';
import { DashboardDestination } from './auth/pages/DashboardDestination';
import { ProtectedRoute } from './auth/components/ProtectedRoute';
import { AuthenticatedAccess } from './auth/components/AuthenticatedAccess';
import './shared/styles/fonts.css';
import './shared/styles/tokens.css';
import './shared/styles/global.css';

export function AccessRoutes({ client }: { client: AuthClient }) {
  return (
    <AuthContext value={client}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthenticatedAccess title="Dashboard">
                <DashboardDestination />
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
      <AccessRoutes client={demoClient} />
    </BrowserRouter>
  );
}
