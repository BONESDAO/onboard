"use client"

import * as React from "react"
import { TooltipProps } from "recharts"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartConfig | null>(null)

function ChartContainer({ config, children, ...props }: ChartProps) {
  const [colors, setColors] = React.useState<string[]>([])

  React.useEffect(() => {
    const root = document.documentElement
    const computedStyles = getComputedStyle(root)

    setColors(
      Object.entries(config).map(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value.color)
        return value.color
      })
    )
  }, [config])

  return (
    <ChartContext.Provider value={config}>
      <div {...props}>{children}</div>
    </ChartContext.Provider>
  )
}

function ChartTooltip({
    active,
    payload,
    label,
    hideLabel,
  }: TooltipProps<any, string> & { hideLabel?: boolean }) {
    const config = React.useContext(ChartContext)
  
    if (!active || !payload?.length || !config) {
      return null
    }
  
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        {!hideLabel && <div className="text-xs text-muted-foreground">{label}</div>}
        <div className="flex flex-col gap-0.5">
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-2 w-2 rounded-full" style={{ background: item.color }} />
              <span className="text-xs font-medium">
                {config[item.dataKey]?.label}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

export { ChartContainer, ChartTooltip }