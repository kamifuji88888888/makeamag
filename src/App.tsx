import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PlanProvider } from './context/PlanContext'
import { useHostContext } from './hooks/useHostContext'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { EditorPage } from './pages/EditorPage'
import { EmbedPage } from './pages/EmbedPage'
import { FlipbookViewScreen } from './pages/FlipbookViewScreen'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { PricingPage } from './pages/PricingPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TermsPage } from './pages/TermsPage'
import { ViewPage } from './pages/ViewPage'
import { LoadingProgress } from './components/LoadingProgress'

function HomeRoute() {
  const { context, loading } = useHostContext()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-apple-bg px-4">
        <LoadingProgress progress={0} fileName="Loading…" />
      </div>
    )
  }

  if (context?.type === 'flipbook' && context.flipbookId) {
    return <FlipbookViewScreen id={context.flipbookId} isCustomDomain />
  }

  return <EditorPage />
}

function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/verify" element={<AuthPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/view/:id" element={<ViewPage />} />
            <Route path="/embed/:id" element={<EmbedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PlanProvider>
    </AuthProvider>
  )
}

export default App
