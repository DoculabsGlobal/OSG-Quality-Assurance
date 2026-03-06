import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import { CollectionProvider } from './context/CollectionContext';
import { DocViewerProvider } from './context/DocViewerContext';
import AlertModal from './components/shared/AlertModal';
import DocViewerModal from './components/modals/DocViewerModal';
import LoginScreen from './features/auth/LoginScreen';
import WorkspaceShell from './components/layout/WorkspaceShell';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>OSG</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>Connecting...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return (
    <CollectionProvider>
      <DocViewerProvider>
        <WorkspaceShell />
        <DocViewerModal />
      </DocViewerProvider>
    </CollectionProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AuthGate />
        <AlertModal />
      </DialogProvider>
    </AuthProvider>
  );
}
