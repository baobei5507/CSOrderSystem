import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

// 角色图片映射
const characterImages: Record<string, string> = {
  chiikawa: '/images/chiikawa.png',
  hachiware: '/images/hachiware.png',
  usagi: '/images/usagi.png',
  kuri: '/images/kuri.png',
  rakko: '/images/rakko.png',
}

// 吉伊卡哇角色头像组件
interface CharacterAvatarProps {
  character: 'chiikawa' | 'hachiware' | 'usagi' | 'kuri' | 'rakko'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  useImage?: boolean // 是否使用图片素材（默认 true）
}

const characterColors: Record<string, string> = {
  chiikawa: 'bg-chiikawa-pink-light',
  hachiware: 'bg-chiikawa-blue-light',
  usagi: 'bg-chiikawa-yellow-light',
  kuri: 'bg-chiikawa-cream',
  rakko: 'bg-chiikawa-lavender',
}

const sizeClasses = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
  xl: 'w-28 h-28',
}

export function CharacterAvatar({ 
  character, 
  size = 'md', 
  className,
  useImage = true
}: CharacterAvatarProps) {
  // 默认使用图片素材，除非指定不使用
  if (useImage) {
    return (
      <div 
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center',
          'border-2 border-white shadow-md',
          characterColors[character],
          sizeClasses[size],
          className
        )}
      >
        <img 
          src={characterImages[character]} 
          alt={character}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  
  // 不使用图片时使用 SVG
  const svgContent = getFallbackSvg(character)
  
  return (
    <div 
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center',
        'border-2 border-white shadow-md',
        characterColors[character],
        sizeClasses[size],
        className
      )}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

// 备用 SVG
function getFallbackSvg(character: string): string {
  const svgs: Record<string, string> = {
    chiikawa: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#FFE4E9"/>
      <ellipse cx="50" cy="58" rx="32" ry="28" fill="white" stroke="#FFB6C1" stroke-width="2"/>
      <ellipse cx="35" cy="38" rx="8" ry="10" fill="white" stroke="#FFB6C1" stroke-width="2"/>
      <ellipse cx="65" cy="38" rx="8" ry="10" fill="white" stroke="#FFB6C1" stroke-width="2"/>
      <circle cx="40" cy="52" r="4" fill="#333"/>
      <circle cx="60" cy="52" r="4" fill="#333"/>
      <ellipse cx="30" cy="58" rx="5" ry="3" fill="#FFB6C1"/>
      <ellipse cx="70" cy="58" rx="5" ry="3" fill="#FFB6C1"/>
      <ellipse cx="50" cy="58" rx="3" ry="2" fill="#333"/>
      <path d="M47 63 Q50 66 53 63" stroke="#333" stroke-width="1.5" fill="none"/>
    </svg>`,
    hachiware: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#E0F4FF"/>
      <path d="M20 35 Q50 20 80 35 Q80 25 70 20 Q60 25 50 25 Q40 25 30 20 Q20 25 20 35" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/>
      <ellipse cx="50" cy="60" rx="30" ry="28" fill="white" stroke="#87CEEB" stroke-width="2"/>
      <path d="M25 32 L20 15 Q23 10 30 15 L35 30" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/>
      <path d="M75 32 L80 15 Q77 10 70 15 L65 30" fill="#87CEEB" stroke="#5DADE2" stroke-width="2"/>
      <circle cx="38" cy="50" r="5" fill="#333"/>
      <circle cx="62" cy="50" r="5" fill="#333"/>
      <ellipse cx="28" cy="58" rx="6" ry="4" fill="#FFB6C1"/>
      <ellipse cx="72" cy="58" rx="6" ry="4" fill="#FFB6C1"/>
      <ellipse cx="50" cy="56" rx="3" ry="2" fill="#333"/>
      <path d="M47 62 Q50 66 53 62" stroke="#333" stroke-width="1.5" fill="none"/>
    </svg>`,
    usagi: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#FFF8E7"/>
      <ellipse cx="50" cy="60" rx="30" ry="28" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/>
      <ellipse cx="35" cy="25" rx="6" ry="15" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/>
      <ellipse cx="65" cy="25" rx="6" ry="15" fill="#FFE4A1" stroke="#FFD700" stroke-width="2"/>
      <circle cx="40" cy="50" r="4" fill="#333"/>
      <circle cx="60" cy="50" r="4" fill="#333"/>
      <ellipse cx="50" cy="58" rx="4" ry="3" fill="#FF6B6B"/>
      <path d="M46 64 Q50 68 54 64" stroke="#333" stroke-width="1.5" fill="none"/>
    </svg>`,
    kuri: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#FFF9F0"/>
      <ellipse cx="50" cy="60" rx="32" ry="28" fill="#8B7355" stroke="#6B5344" stroke-width="2"/>
      <ellipse cx="50" cy="38" rx="35" ry="18" fill="#FFF9F0" stroke="#8B7355" stroke-width="2"/>
      <circle cx="38" cy="52" r="4" fill="#333"/>
      <circle cx="62" cy="52" r="4" fill="#333"/>
      <ellipse cx="50" cy="58" rx="3" ry="2" fill="#333"/>
    </svg>`,
    rakko: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#E6E6FA"/>
      <ellipse cx="50" cy="60" rx="30" ry="28" fill="#DDA0DD" stroke="#9370DB" stroke-width="2"/>
      <circle cx="40" cy="50" r="4" fill="#333"/>
      <circle cx="60" cy="50" r="4" fill="#333"/>
      <ellipse cx="50" cy="58" rx="4" ry="3" fill="#333"/>
      <path d="M35 70 Q50 75 65 70" stroke="#9370DB" stroke-width="2" fill="none"/>
    </svg>`,
  }
  return svgs[character] || svgs.chiikawa
}

// 可爱卡片组件
interface CuteCardProps {
  children: ReactNode
  className?: string
  variant?: 'cream' | 'pink' | 'blue' | 'yellow' | 'mint'
  onClick?: () => void
}

const variantClasses = {
  cream: 'bg-chiikawa-cream border-chiikawa-peach/30',
  pink: 'bg-chiikawa-pink-light border-chiikawa-pink/30',
  blue: 'bg-chiikawa-blue-light border-chiikawa-blue/30',
  yellow: 'bg-chiikawa-yellow-light border-chiikawa-yellow/30',
  mint: 'bg-chiikawa-mint/30 border-chiikawa-mint',
}

export function CuteCard({ children, className, variant = 'cream', onClick }: CuteCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'rounded-3xl border-2 shadow-sm overflow-hidden',
        'transition-all duration-200 hover:shadow-md',
        onClick && 'cursor-pointer',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </div>
  )
}

// 欢迎区域组件
interface WelcomeHeaderProps {
  title: string
  subtitle?: string
  character?: 'chiikawa' | 'hachiware' | 'usagi'
}

export function WelcomeHeader({ title, subtitle, character = 'chiikawa' }: WelcomeHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-chiikawa-cream to-chiikawa-pink-light p-6 mb-6">
      {/* 装饰性圆点 */}
      <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/40" />
      <div className="absolute bottom-2 right-20 w-8 h-8 rounded-full bg-chiikawa-pink/30" />
      <div className="absolute top-10 right-24 w-4 h-4 rounded-full bg-chiikawa-blue/30" />
      
      <div className="flex items-center gap-4">
        <CharacterAvatar character={character} size="lg" />
        <div>
          <h2 className="text-xl font-bold text-chiikawa-brown">{title}</h2>
          {subtitle && (
            <p className="text-sm text-chiikawa-brown/70 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 加载动画组件
export function ChiikawaLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <CharacterAvatar character="usagi" size="xl" />
        <div className="absolute -bottom-2 -right-2 animate-bounce">
          <span className="text-2xl">✨</span>
        </div>
      </div>
      <p className="mt-4 text-chiikawa-brown font-medium animate-pulse">
        加载中...
      </p>
    </div>
  )
}

// 统计数据卡片（可爱版）
interface CuteStatCardProps {
  title: string
  value: string | number
  subtitle?: string
  character?: 'chiikawa' | 'hachiware' | 'usagi' | 'kuri' | 'rakko'
  trend?: string
  variant?: 'cream' | 'pink' | 'blue' | 'yellow'
}

export function CuteStatCard({ 
  title, 
  value, 
  subtitle, 
  character = 'chiikawa',
  trend,
  variant = 'cream'
}: CuteStatCardProps) {
  return (
    <CuteCard variant={variant} className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-chiikawa-brown/70 font-medium">{title}</p>
          <p className="text-2xl font-bold text-chiikawa-brown mt-1">{value}</p>
          {subtitle && <p className="text-xs text-chiikawa-brown/50 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-green-600 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <CharacterAvatar character={character} size="sm" />
      </div>
    </CuteCard>
  )
}
