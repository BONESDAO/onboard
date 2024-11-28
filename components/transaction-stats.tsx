"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { addDays, format, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks, subYears } from "date-fns"

interface TransactionStats {
  totalLAT: number
  totalUSDT: number
  periodLabel: string
}

interface ChartData {
  date: string
  LAT: number
  USDT: number
}

export function TransactionStats({ transactions }: { transactions: any[] }) {
  const [timeRange, setTimeRange] = useState("day")
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  })


  const getStats = (): TransactionStats => {
    const start = startOfDay(dateRange.from || new Date())
    const end = startOfDay(dateRange.to || new Date())

    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transaction_time)
      return txDate >= start && txDate <= end
    })

    const latTotal = filteredTransactions
      .filter(tx => tx.transaction_type === 'LAT')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

    const usdtTotal = filteredTransactions
      .filter(tx => tx.transaction_type === 'USDT')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

    return {
      totalLAT: latTotal,
      totalUSDT: usdtTotal,
      periodLabel: `${format(start, 'PP')} - ${format(end, 'PP')}`
    }
  }

  // Generate chart data
  const getChartData = (): ChartData[] => {
    const data: ChartData[] = []
    let start = dateRange.from || subDays(new Date(), 7)
    const end = dateRange.to || new Date()

    while (start <= end) {
      const dayStart = startOfDay(start)
      const dayEnd = addDays(dayStart, 1)
      
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transaction_time)
        return txDate >= dayStart && txDate < dayEnd
      })

      const latAmount = dayTransactions
        .filter(tx => tx.transaction_type === 'LAT')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

      const usdtAmount = dayTransactions
        .filter(tx => tx.transaction_type === 'USDT')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

      data.push({
        date: format(start, 'MM-dd'),
        LAT: latAmount,
        USDT: usdtAmount
      })

      start = addDays(start, 1)
    }

    return data
  }

  const stats = getStats()
  const chartData = getChartData()

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">日</SelectItem>
            <SelectItem value="week">周</SelectItem>
            <SelectItem value="month">月</SelectItem>
            <SelectItem value="year">年</SelectItem>
          </SelectContent>
        </Select>
        <DatePickerWithRange 
          date={dateRange}
          onDateChange={(date) => {
            if (date) {
              setDateRange({
                from: date.from || new Date(),
                to: date.to || new Date()
              });
            }
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LAT 总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLAT.toFixed(2)} LAT</div>
            <p className="text-xs text-muted-foreground">{stats.periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USDT 总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUSDT.toFixed(2)} USDT</div>
            <p className="text-xs text-muted-foreground">{stats.periodLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>交易趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              LAT: {
                label: "LAT",
                color: "hsl(var(--chart-1))",
              },
              USDT: {
                label: "USDT",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Line type="monotone" dataKey="LAT" stroke="var(--color-LAT)" />
                <Line type="monotone" dataKey="USDT" stroke="var(--color-USDT)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

