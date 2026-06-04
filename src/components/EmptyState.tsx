import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 吉伊卡哇（小八）风格空状态组件
 * 使用图片作为插图，轻量级不影响专业感
 * 
 * 图片获取方式：
 * 1. 在小红书搜索"小八 chiikawa"保存喜欢的图片
 * 2. 或使用 GitHub 开源素材：https://github.com/topics/chiikawa
 * 3. 放到 public/images/hachiware.png
 */
export function EmptyState({
  title = '暂无数据',
  description,
  className,
  size = 'md',
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

  return (
    <div className={cn('flex flex-col items-center justify-center py-8', className)}>
      {/* 小八图片插图 */}
      <div className={cn(
        sizeClasses[size],
        'mb-4 rounded-full bg-apple-100 overflow-hidden flex items-center justify-center',
        'border-2 border-apple-200'
      )}>
        <img
          src="/images/hachiware.png"
          alt="小八"
          className="w-full h-full object-cover"
          onError={(e) => {
            // 图片加载失败时显示备用SVG
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = HACHIWARE_SVG
            }
          }}
        />
      </div>

      {/* 文字内容 */}
      <p className={cn('font-medium text-apple-500', textSizes[size].title)}>
        {title}
      </p>
      {description && (
        <p className={cn('text-apple-400 mt-1', textSizes[size].desc)}>
          {description}
        </p>
      )}
    </div>
  )
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
 * 订单空状态 - 带有小八插画和订单相关文案
 */
export function EmptyOrdersState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="今天还没有预约哦"
      description="点击右上角按钮创建新订单"
      size="md"
      className={className}
    />
  )
}

/**
 * 顾客空状态
 */
export function EmptyCustomersState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无顾客"
      description="添加您的第一位顾客"
      size="md"
      className={className}
    />
  )
}

/**
 * 妹妹空状态
 */
export function EmptyGirlsState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无妹妹信息"
      description="添加第一位妹妹"
      size="md"
      className={className}
    />
  )
}

/**
 * 数据空状态
 */
export function EmptyDataState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无数据"
      size="sm"
      className={className}
    />
  )
}

/**
 * 标签空状态
 */
export function EmptyTagsState({ className }: { className?: string }) {
  return (
    <EmptyState
      title="暂无标签"
      description="创建您的第一个标签"
      size="sm"
      className={className}
    />
  )
}
