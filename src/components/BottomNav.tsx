import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { CharacterAvatar } from './ChiikawaTheme'

// 吉伊卡哇风格底部导航 - 使用角色头像作为图标
const tabs = [
  { id: 'home', label: '首页', character: 'chiikawa' as const },
  { id: 'daily', label: '日报', character: 'hachiware' as const },
  { id: 'customers', label: '顾客', character: 'kuri' as const },
  { id: 'analysis', label: '分析', character: 'rakko' as const },
  { id: 'orders', label: '订单', character: 'usagi' as const },
  { id: 'girls', label: '妹妹', character: 'chiikawa' as const },
  { id: 'tags', label: '标签', character: 'hachiware' as const },
  { id: 'settings', label: '设置', character: 'usagi' as const },
] as const

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="bg-chiikawa-cream/95 backdrop-blur-md border-t-2 border-chiikawa-peach/30">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full touch-feedback",
                  isActive ? "scale-110" : "opacity-60"
                )}
              >
                <div className={cn(
                  "relative transition-all duration-200",
                  isActive && "drop-shadow-md"
                )}>
                  <CharacterAvatar 
                    character={tab.character} 
                    size="xs"
                    className={cn(
                      "transition-all duration-200",
                      isActive && "ring-2 ring-chiikawa-pink ring-offset-2"
                    )}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 text-xs">✨</span>
                  )}
                </div>
                <span className={cn(
                  "text-[9px] font-medium mt-1 transition-all duration-200",
                  isActive ? "text-chiikawa-brown" : "text-chiikawa-brown/50"
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