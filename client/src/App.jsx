import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import WarehousePendingListPage from './features/warehouse/WarehousePendingListPage';
import WarehouseInspectionPage from './features/warehouse/WarehouseInspectionPage';
import MaterialRequestDetailPage from './features/warehouse/MaterialRequestDetailPage';
import { ROLES } from './utils/constants';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Unauthorized Page */}
              <Route
                path="/unauthorized"
                element={
                  <ProtectedRoute>
                    <UnauthorizedPage />
                  </ProtectedRoute>
                }
              />

              {/* Warehouse Pending List Page */}
              <Route
                path="/warehouse/pending"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      ROLES.WAREHOUSE_MANAGER,
                      ROLES.CEO,
                      ROLES.CHAIRMAN,
                      ROLES.SITE_MANAGER,
                    ]}
                  >
                    <WarehousePendingListPage />
                  </ProtectedRoute>
                }
              />

              {/* Warehouse Inspection Page */}
              <Route
                path="/warehouse/requests/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      ROLES.WAREHOUSE_MANAGER,
                      ROLES.CEO,
                      ROLES.CHAIRMAN,
                      ROLES.SITE_MANAGER,
                    ]}
                  >
                    <WarehouseInspectionPage />
                  </ProtectedRoute>
                }
              />

              {/* Material Request Detail Page */}
              <Route
                path="/material-requests/:id"
                element={
                  <ProtectedRoute>
                    <MaterialRequestDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Dashboard Route */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
