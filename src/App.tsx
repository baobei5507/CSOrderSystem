import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from './stores/appStore'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { DailyReportPage } from './pages/DailyReportPage'
import { CustomersPage } from './pages/CustomersPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { OrdersPage } from './pages/OrdersPage'
import { GirlsPage } from './pages/GirlsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TagsPage } from './pages/TagsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      retry: 2,
    },
  },
})

function App() {
  const { activeTab } = useAppStore()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-apple-50">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'daily' && <DailyReportPage />}
        {activeTab === 'customers' && <CustomersPage />}
        {activeTab === 'analysis' && <AnalysisPage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'girls' && <GirlsPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'tags' && <TagsPage />}
        <BottomNav />
      </div>
    </QueryClientProvider>
  )
}

export default App