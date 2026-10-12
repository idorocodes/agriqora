import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireRole } from './components/RequireRole';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import LandingPage from './pages/Landing';
import Marketplace from './pages/Marketplace';
import { NotFound } from './pages/Placeholder';

// The marketplace loads first; the other pages load on demand to keep the first visit fast.
const ProduceDetail = lazy(() => import('./pages/ProduceDetail'));
const Trace = lazy(() => import('./pages/Trace'));
const Learn = lazy(() => import('./pages/Learn'));
const SignIn = lazy(() => import('./pages/SignIn'));
const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'));
const Join = lazy(() => import('./pages/Join'));
const FarmerDashboard = lazy(() => import('./pages/farmer/FarmerDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));


export default function App() {
  return (
    <Suspense
      fallback={
        <div className="wrap">
          <Spinner />
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="produce/:id" element={<ProduceDetail />} />
          <Route path="trace" element={<Trace />} />
          <Route path="trace/:batchId" element={<Trace />} />
          <Route path="learn" element={<Learn />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="admin/login" element={<SignIn admin />} />
          <Route
            path="buyer"
            element={
              <RequireRole role="buyer">
                <BuyerDashboard />
              </RequireRole>
            }
          />
          <Route
            path="admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route path="join" element={<Join />} />
          <Route
            path="farmer"
            element={
              <RequireRole role="farmer">
                <FarmerDashboard />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
