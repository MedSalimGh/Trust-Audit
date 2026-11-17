import React, { Suspense, useState, useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// ─── Layout components (always eagerly loaded — they're the shell) ───────────
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { PageTransition } from './components/layout/PageTransition';

// ─── Auth guards (eagerly loaded — needed for route protection) ──────────────
import { WalletGate, RoleGuard, ChainBanner, SessionLock } from './components/guards/AuthGuards';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// ─── Lazy-loaded page components (code-split) ───────────────────────────────
const LandingPage = React.lazy(() =>
  import('./components/landing/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const Dashboard = React.lazy(() =>
  import('./components/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const ApprovalCenter = React.lazy(() =>
  import('./components/ApprovalCenter').then((m) => ({ default: m.ApprovalCenter }))
);
const TamperLab = React.lazy(() =>
  import('./components/TamperLab').then((m) => ({ default: m.TamperLab }))
);
const CertificatesGallery = React.lazy(() =>
  import('./components/CertificatesGallery').then((m) => ({ default: m.CertificatesGallery }))
);
const SimulatorView = React.lazy(() =>
  import('./components/SimulatorView').then((m) => ({ default: m.SimulatorView }))
);

// ─── Eagerly loaded (small, used at shell level) ────────────────────────────
import { CreateCaseModal } from './components/CreateCaseModal';
import { CaseDetailModal } from './components/CaseDetailModal';

// ─── Route loading fallback ─────────────────────────────────────────────────

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated vault-door spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border border-cyan-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-slate-500 font-mono tracking-wider">Loading…</p>
      </div>
    </div>
  );
}

// ─── AppShell ───────────────────────────────────────────────────────────────

function AppShell() {
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Listen for custom events from page components
  useEffect(() => {
    const handleSelectCase = (e: Event) => {
      setSelectedCaseId((e as CustomEvent).detail);
    };
    const handleOpenCreate = () => {
      setIsCreateModalOpen(true);
    };

    window.addEventListener('trustaudit:select-case', handleSelectCase);
    window.addEventListener('trustaudit:open-create-modal', handleOpenCreate);

    return () => {
      window.removeEventListener('trustaudit:select-case', handleSelectCase);
      window.removeEventListener('trustaudit:open-create-modal', handleOpenCreate);
    };
  }, []);

  return (
    <SessionLock>
      <div className="min-h-screen bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 flex flex-col font-body antialiased selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:bg-cyan-500/30 dark:selection:text-cyan-300 transition-colors duration-200">
        {/* Chain ID mismatch banner */}
        <ChainBanner />

        {/* Glassmorphism Navbar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorBoundary>
            <PageTransition>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Outlet context={{ setSelectedCaseId, setIsCreateModalOpen }} />
              </Suspense>
            </PageTransition>
          </ErrorBoundary>
        </main>

        {/* Modals — stay at shell level so they work across all routes */}
        <CreateCaseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(caseId) => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            setSelectedCaseId(caseId);
          }}
        />

        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
          }}
        />

        {/* Footer */}
        <Footer />
      </div>
    </SessionLock>
  );
}

// ─── Page wrapper components ─────────────────────────────────────────────────

function DashboardPage() {
  return (
    <WalletGate>
      <Dashboard
        onSelectCase={(id) => {
          window.dispatchEvent(new CustomEvent('trustaudit:select-case', { detail: id }));
        }}
        openCreateModal={() => {
          window.dispatchEvent(new CustomEvent('trustaudit:open-create-modal'));
        }}
      />
    </WalletGate>
  );
}

function ApprovalsPage() {
  return (
    <WalletGate>
      <RoleGuard allowedRoles={['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN']}>
        <ApprovalCenter
          onSelectCase={(id) => {
            window.dispatchEvent(new CustomEvent('trustaudit:select-case', { detail: id }));
          }}
        />
      </RoleGuard>
    </WalletGate>
  );
}

function TamperLabPage() {
  return (
    <WalletGate>
      <RoleGuard allowedRoles={['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN']}>
        <TamperLab />
      </RoleGuard>
    </WalletGate>
  );
}

function CertificatesPage() {
  return (
    <WalletGate>
      <RoleGuard allowedRoles={['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN']}>
        <CertificatesGallery
          onSelectCase={(id) => {
            window.dispatchEvent(new CustomEvent('trustaudit:select-case', { detail: id }));
          }}
        />
      </RoleGuard>
    </WalletGate>
  );
}

function SimulatorPage() {
  return (
    <WalletGate>
      <RoleGuard allowedRoles={['OPERATOR', 'ADMIN']}>
        <SimulatorView />
      </RoleGuard>
    </WalletGate>
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-6xl font-display font-bold text-slate-300 mb-4">404</h1>
      <p className="text-xl text-slate-400 mb-8">Page not found</p>
      <a
        href="/dashboard"
        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-midnight-950 font-semibold rounded-lg transition-colors shadow-glow-cyan"
      >
        Go to Dashboard
      </a>
    </div>
  );
}

// ─── Router Configuration ────────────────────────────────────────────────────

const router = createBrowserRouter([
  {
    // Public landing page — no Navbar/Footer/AppShell, lazy-loaded with Three.js
    path: '/',
    element: (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    // Authenticated app shell with Navbar + Footer
    path: '/',
    element: <AppShell />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'approvals',
        element: <ApprovalsPage />,
      },
      {
        path: 'tamper-lab',
        element: <TamperLabPage />,
      },
      {
        path: 'certificates',
        element: <CertificatesPage />,
      },
      {
        path: 'simulator',
        element: <SimulatorPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

/**
 * AppRouter — the root component that provides routing.
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}
