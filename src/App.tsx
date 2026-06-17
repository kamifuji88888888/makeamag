import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PlanProvider } from './context/PlanContext'
import { useHostContext } from './hooks/useHostContext'
import { EditorPage } from './pages/EditorPage'
import { EmbedPage } from './pages/EmbedPage'
import { FlipbookViewScreen } from './pages/FlipbookViewScreen'
import { PricingPage } from './pages/PricingPage'
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
    <PlanProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/view/:id" element={<ViewPage />} />
          <Route path="/embed/:id" element={<EmbedPage />} />
        </Routes>
      </BrowserRouter>
    </PlanProvider>
  )
}

export default App
