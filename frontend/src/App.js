import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProjectProvider } from '@/lib/projects';
import Login from '@/pages/Login';
import Marketing from '@/pages/Marketing';
import Shell from '@/components/Shell';
import Dashboard from '@/pages/Dashboard';
import EquipmentCosting from '@/pages/EquipmentCosting';
import Settings from '@/pages/Settings';
import Quotation from '@/pages/Quotation';
import Reports from '@/pages/Reports';
import Users from '@/pages/Users';
import Library from '@/pages/Library';
import ComponentViewer from '@/pages/ComponentViewer';
import SupplierPrices from '@/pages/SupplierPrices';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Marketing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/component-viewer" element={<ComponentViewer />} />
          <Route path="/parts-catalogue" element={<ComponentViewer />} />
          <Route
            path="/app"
            element={<Protected><ProjectProvider><Shell /></ProjectProvider></Protected>}
          >
            <Route index element={<Dashboard />} />
            <Route path="costing" element={<EquipmentCosting />} />
            <Route path="settings" element={<Settings />} />
            <Route path="quotation" element={<Quotation />} />
            <Route path="reports" element={<Reports />} />
            <Route path="component-viewer" element={<Navigate to="/app/parts-catalogue" replace />} />
            <Route path="parts-catalogue" element={<ComponentViewer inApp />} />
            <Route path="library" element={<Library />} />
            <Route path="supplier-prices" element={<SupplierPrices />} />
            <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
