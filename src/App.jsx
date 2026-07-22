import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppShell from '@/components/AppShell';
import Dashboard from '@/pages/Dashboard';
import Impressoras from '@/pages/Impressoras';
import ImpressoraDetail from '@/pages/ImpressoraDetail';
import Toners from '@/pages/Toners';
import TonerDetail from '@/pages/TonerDetail';
import Cilindros from '@/pages/Cilindros';
import Leituras from '@/pages/Leituras';
import TrocasToner from '@/pages/TrocasToner';
import TrocasCilindro from '@/pages/TrocasCilindro';
import Estoque from '@/pages/Estoque';
import Relatorios from '@/pages/Relatorios';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/impressoras" element={<Impressoras />} />
        <Route path="/impressoras/:id" element={<ImpressoraDetail />} />
        <Route path="/toners" element={<Toners />} />
        <Route path="/toners/:id" element={<TonerDetail />} />
        <Route path="/cilindros" element={<Cilindros />} />
        <Route path="/leituras" element={<Leituras />} />
        <Route path="/trocas-toner" element={<TrocasToner />} />
        <Route path="/trocas-cilindro" element={<TrocasCilindro />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/relatorios" element={<Relatorios />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App