import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  character?: 'chiikawa' | 'hachiware' | 'usagi' | 'kuri' | 'rakko'
}

const characterImages: Record<string, string> = {
  chiikawa: '/images/chiikawa.png',
  hachiware: '/images/hachiware.png',
  usagi: '/images/usagi.png',
  kuri: '/images/kuri.png',
  rakko: '/images/rakko.png',
}

const characterColors: Record<string, string> = {
  chiikawa: 'bg-chiikawa-pink-light border-chiikawa-pink/30',
  hachiware: 'bg-chiikawa-blue-light border-chiikawa-blue/30',
  usagi: 'bg-chiikawa-yellow-light border-chiikawa-yellow/30',
  kuri: 'bg-chiikawa-cream border-chiikawa-peach/30',
  rakko: 'bg-chiikawa-lavender border-chiikawa-lavender',
}

/**
 * 吉伊卡哇风格空状态组件
 * 支持多个角色：吉伊、小八、乌萨奇、栗子、海獭
 */
export function EmptyState({
  title = '暂无数据',
  description,
  className,
  size = 'md',
  character = 'hachiware',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  }

  const textSizes = {
    sm: { title: 'text-sm', desc: 'text-xs' },
    md: { title: 'text-base', desc: 'text-sm' },
    lg: { title: 'text-lg', desc: 'text-base' },
  }

  const fallbackSvg = getFallbackSvg(character)

  return (
    <div className={cn('flex flex-col items-center justify-center py-8', className)}>
      {/* 角色图片插图 */}
      <div className={cn(
        sizeClasses[size],
        'mb-4 rounded-full overflow-hidden flex items-center justify-center',
        'border-3 shadow-md',
        characterColors[character]
      )}>
        <img
          src={characterImages[character]}
          alt={character}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = fallbackSvg
            }
          }}
        />
      </div>

      {/* 文字内容 */}
      <p className={cn('font-medium text-chiikawa-brown', textSizes[size].title)}>
        {title}
      </p>
      {description && (
        <p className={cn('text-chiikawa-brown/60 mt-1', textSizes[size].desc)}>
          {description}
        </p>
      )}
    </div>
  )
}

// 备用 SVG
function getFallbackSvg(character: string): string {
  const svgs: Record<string, string> = {
    chiikawa: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#FFE4E9"/><ellipse cx="50" cy="58" rx="32" ry="28" fill="white" stroke="#FFB6C1" stroke-width="2"/><ellipse cx="35" cy="38" rx="8" ry="10" fill="white" stroke="#FFB6C1" stroke-width="2"/><ellipse cx="65" cy="38" rx="8" ry="10" fill="white" stroke="#FFB6C1" stroke-width="2"/><circle cx="40" cy="52" r="4" fill="#333"/><circle cx="60" cy="52" r="4" fill="#333"/><ellipse cx="30" cy="58" rx="5" ry="3" fill="#FFB6C1"/><ellipse cx="70" cy="58" rx="5" ry="3" fill="#FFB6C1"/><ellipse cx="50" cy="58" rx="3" ry="2" fill="#333"/><path d="M47 63 Q50 66 53 63" stroke="#333" stroke-width="1.5" fill="none"/></svg>`,
    hachiware: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#E0F4FF"/><path d="M20 35 Q50 20 80 35 Q80 25 70 20 Q60 25 50 25 Q40 25 30 20 Q20 25 20 35" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/><ellipse cx="50" cy="60" rx="30" ry="28" fill="white" stroke="#87CEEB" stroke-width="2"/><path d="M25 32 L20 15 Q23 10 30 15 L35 30" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/><path d="M75 32 L80 15 Q77 10 70 15 L65 30" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/><circle cx="38" cy="50" r="5" fill="#333"/><circle cx="62" cy="50" r="5" fill="#333"/><ellipse cx="28" cy="58" rx="6" ry="4" fill="#FFB6C1"/><ellipse cx="72" cy="58" rx="6" ry="4" fill="#FFB6C1"/><ellipse cx="50" cy="56" rx="3" ry="2" fill="#333"/><path d="M47 62 Q50 66 53 62" stroke="#333" stroke-width="1.5" fill="none"/></svg>`,
    usagi: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#FFF8E7"/><ellipse cx="50" cy="60" rx="30" ry="28" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/><ellipse cx="35" cy="25" rx="6" ry="15" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/><ellipse cx="65" cy="25" rx="6" ry="15" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/><circle cx="40" cy="50" r="4" fill="#333"/><circle cx="60" cy="50" r="4" fill="#333"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="#FF6B6B"/><path d="M46 64 Q50 68 54 64" stroke="#333" stroke-width="1.5" fill="none"/></svg>`,
    kuri: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#FFF9F0"/><ellipse cx="50" cy="60" rx="32" ry="28" fill="#8B7355" stroke="#6B5344" stroke-width="2"/><ellipse cx="50" cy="38" rx="35" ry="18" fill="#FFF9F0" stroke="#8B7355" stroke-width="2"/><circle cx="38" cy="52" r="4" fill="#333"/><circle cx="62" cy="52" r="4" fill="#333"/><ellipse cx="50" cy="58" rx="3" ry="2" fill="#333"/></svg>`,
    rakko: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#E6E6FA"/><ellipse cx="50" cy="60" rx="30" ry="28" fill="#DDA0DD" stroke="#9370DB" stroke-width="2"/><circle cx="40" cy="50" r="4" fill="#333"/><circle cx="60" cy="50" r="4" fill="#333"/><ellipse cx="50" cy="58" rx="4" ry="3" fill="#333"/><path d="M35 70 Q50 75 65 70" stroke="#9370DB" stroke-width="2" fill="none"/></svg>`,
  }
  return svgs[character] || svgs.hachiware
}

// 备用SVG - 简单的小八轮廓
const HACHIWARE_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景圆 -->
  <circle cx="50" cy="50" r="45" fill="#DBEAFE"/>
  <!-- 身体 -->
  <ellipse cx="50" cy="60" rx="30" ry="28" fill="white" stroke="#60A5FA" stroke-width="2"/>
  <!-- 头顶蓝色 -->
  <path d="M20 35 Q50 20 80 35 Q80 25 70 20 Q60 25 50 25 Q40 25 30 20 Q20 25 20 35" fill="#60A5FA" stroke="#3B82F6" stroke-width="2"/>
  <!-- 左耳 -->
  <path d="M25 32 L20 15 Q23 10 30 15 L35 30" fill="#60A5FA" stroke="#3B82F6" stroke-width="2"/>
  <!-- 右耳 -->
  <path d="M75 32 L80 15 Q77 10 70 15 L65 30" fill="#60A5FA" stroke="#3B82F6" stroke-width="2"/>
  <!-- 左眼 -->
  <circle cx="38" cy="50" r="5" fill="#1F2937"/>
  <circle cx="40" cy="48" r="2" fill="white"/>
  <!-- 右眼 -->
  <circle cx="62" cy="50" r="5" fill="#1F2937"/>
  <circle cx="64" cy="48" r="2" fill="white"/>
  <!-- 粉色腮红 -->
  <ellipse cx="28" cy="58" rx="6" ry="4" fill="#FBCFE8"/>
  <ellipse cx="72" cy="58" rx="6" ry="4" fill="#FBCFE8"/>
  <!-- 鼻子 -->
  <ellipse cx="50" cy="56" rx="3" ry="2" fill="#1F2937"/>
  <!-- 嘴巴 -->
  <path d="M45 62 Q50 66 55 62" stroke="#1F2937" stroke-width="1.5" fill="none" stroke-linecap="round"/>
</svg>`

/**
 * 订单空状态 - 小八 + 订单相关文案
 */
export function EmptyOrdersState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="今天还没有预约哦"
      description="点击右上角按钮创建新订单"
      size="md"
      character="hachiware"
      className={className}
    />
  )
}

/**
 * 顾客空状态 - 吉伊
 */
export function EmptyCustomersState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无顾客"
      description="添加您的第一位顾客"
      size="md"
      character="chiikawa"
      className={className}
    />
  )
}

/**
 * 妹妹空状态 - 海獭师傅
 */
export function EmptyGirlsState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无妹妹信息"
      description="添加第一位妹妹"
      size="md"
      character="rakko"
      className={className}
    />
  )
}

/**
 * 数据空状态 - 乌萨奇
 */
export function EmptyDataState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无数据"
      size="sm"
      character="usagi"
      className={className}
    />
  )
}

/**
 * 标签空状态 - 栗子
 */
export function EmptyTagsState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无标签"
      description="创建您的第一个标签"
      size="sm"
      character="kuri"
      className={className}
    />
  )
}
