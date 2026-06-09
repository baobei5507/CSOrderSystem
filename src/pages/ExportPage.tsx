import { useState } from 'react'
import { Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CuteCard } from '@/components/ChiikawaTheme'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApi } from '@/hooks/useApi'
import { useAppStore } from '@/stores/appStore'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'all'

const statusMap: Record<string, { label: string }> = {
  pending: { label: '待完成' },
  completed: { label: '已完成' },
  cancelled: { label: '已取消' },
  all: { label: '全部' },
}

export function ExportPage() {
  const { currentStore } = useAppStore()
  const { exportOrders } = useApi()
  
  // 日期范围
  const today = new Date()
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'))
  const [status, setStatus] = useState<OrderStatus>('all')
  const [isExporting, setIsExporting] = useState(false)

  // 导出订单数据
  const handleExport = async () => {
    if (!currentStore) {
      alert('请先选择店铺')
      return
    }

    setIsExporting(true)
    try {
      const orders = await exportOrders({
        storeId: currentStore.id,
        startDate,
        endDate,
        status: status === 'all' ? undefined : status,
      })
      
      if (orders.length === 0) {
        alert('没有找到符合条件的订单')
        return
      }

      // 准备 Excel 数据
      const excelData = orders.map((order: any, index: number) => {
        // 计算结束时间
        let endTime = '-'
        if (order.appointmentTime && order.hours) {
          const start = new Date(order.appointmentTime)
          const end = new Date(start.getTime() + order.hours * 60 * 60 * 1000)
          endTime = format(end, 'HH:mm')
        }

        // 格式化预约时间
        const appointmentTimeStr = order.appointmentTime 
          ? format(new Date(order.appointmentTime), 'HH:mm')
          : '-'

        // 格式化日期
        const orderDate = order.createdAt 
          ? format(new Date(order.createdAt), 'yyyyMMdd')
          : '-'

        // 会员等级显示
        const memberLevel = order.customerMemberLevel
        const memberLevelStr = memberLevel && memberLevel > 0 ? `LV${memberLevel}` : '-'

        return {
          '序号': index + 1,
          '订单号': order.orderNo,
          '日期': orderDate,
          '助教': order.girlName || '-',
          '跟单': order.serviceStaffName || '-',
          '顾客': order.customerName || '-',
          '会员': memberLevelStr,
          '预约时间': appointmentTimeStr,
          '结束时间': endTime,
          '课程': order.packageName || '-',
          '课时': order.hours || 1,
          '单价': order.originalPrice ? (order.originalPrice / 100).toFixed(2) : '0.00',
          '优惠券来源': order.couponSource || '-',
          '优惠总计': order.discountAmount ? (order.discountAmount / 100).toFixed(2) : '0.00',
          '实收': order.finalPrice ? (order.finalPrice / 100).toFixed(2) : '0.00',
          '会员余额(下单时)': order.balanceAtOrder ? (order.balanceAtOrder / 100).toFixed(2) : '0.00',
          '状态': statusMap[order.status]?.label || order.status,
          '备注': order.remark || '-',
        }
      })

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // 设置列宽
      const colWidths = [
        { wch: 6 },   // 序号
        { wch: 20 },  // 订单号
        { wch: 10 },  // 日期
        { wch: 10 },  // 助教
        { wch: 10 },  // 跟单
        { wch: 12 },  // 顾客
        { wch: 8 },   // 会员
        { wch: 10 },  // 预约时间
        { wch: 10 },  // 结束时间
        { wch: 12 },  // 课程
        { wch: 6 },   // 课时
        { wch: 10 },  // 单价
        { wch: 15 },  // 优惠券来源
        { wch: 10 },  // 优惠总计
        { wch: 10 },  // 实收
        { wch: 15 },  // 会员余额
        { wch: 8 },   // 状态
        { wch: 20 },  // 备注
      ]
      ws['!cols'] = colWidths

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '订单数据')

      // 生成文件名
      const fileName = `订单导出_${startDate}_${endDate}.xlsx`

      // 下载文件
      XLSX.writeFile(wb, fileName)

      alert(`成功导出 ${orders.length} 条订单数据`)
    } catch (error: any) {
      console.error('Export error:', error)
      alert(`导出失败: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-chiikawa-cream pb-20">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-apple-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-chiikawa-brown" />
            <h1 className="text-lg font-bold text-chiikawa-brown">订单导出</h1>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-4">
          {/* 筛选条件 */}
          <CuteCard className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-chiikawa-brown" />
              <h2 className="font-bold text-chiikawa-brown">筛选条件</h2>
            </div>

            <div className="space-y-4">
              {/* 日期范围 */}
              <div className="space-y-2">
                <Label className="text-sm text-apple-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  日期范围
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-apple-400">至</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* 状态筛选 */}
              <div className="space-y-2">
                <Label className="text-sm text-apple-500">订单状态</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待完成</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CuteCard>

          {/* 导出预览 */}
          <CuteCard variant="yellow" className="p-4">
            <h3 className="font-bold text-chiikawa-brown mb-2">导出字段说明</h3>
            <div className="text-sm text-apple-600 space-y-1">
              <p>• 结束时间：根据预约时间自动计算（预约时间+课时）</p>
              <p>• 优惠券来源：显示订单中记录的优惠券来源信息</p>
              <p>• 会员余额：下单时顾客的余额（从余额流水记录获取）</p>
              <p>• 导出格式：Excel (.xlsx)</p>
            </div>
          </CuteCard>

          {/* 导出按钮 */}
          <Button
            onClick={handleExport}
            disabled={isExporting || !currentStore}
            className="w-full h-12 bg-chiikawa-blue hover:bg-chiikawa-blue/90 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                导出 Excel
              </>
            )}
          </Button>

          {!currentStore && (
            <p className="text-center text-sm text-red-500">
              请先选择店铺
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
