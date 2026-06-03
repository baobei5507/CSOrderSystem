import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 格式化金额
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// 格式化日期
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 格式化时间
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 格式化日期时间
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取今日开始时间戳
export function getTodayStart(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

// 获取本月开始时间戳
export function getMonthStart(): number {
  const now = new Date()
  now.setDate(1)
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

// 计算提成
export function calculateCommission(
  price: number,
  commissionType: 'percent' | 'fixed',
  commissionValue: number
): number {
  if (commissionType === 'percent') {
    return Math.round(price * commissionValue / 100)
  }
  return commissionValue
}

// 生成订单号
export function generateOrderNo(): string {
  const date = new Date()
  const prefix = date.getFullYear().toString().slice(2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `O${prefix}${random}`
}