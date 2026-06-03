import { Home, Users, ClipboardList, UserCircle, Settings } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'customers', label: '顾客', icon: Users },
  { id: 'orders', label: '订单', icon: ClipboardList },
  { id: 'girls', label: '妹妹', icon: UserCircle },
  { id: 'settings', label: '设置', icon: Settings },
] as const

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="glass border-t border-apple-200/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full touch-feedback",
                  isActive ? "text-apple-blue" : "text-apple-300"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center w-12 h-8 rounded-xl transition-all duration-200",
                  isActive && "bg-apple-blue/10"
                )}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  isActive ? "text-apple-blue" : "text-apple-400"
                )}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}