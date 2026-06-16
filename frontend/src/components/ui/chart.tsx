import * as React from 'react'
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { cn } from '@/lib/utils'

/* Wrapper graphiques façon shadcn/ui (basé sur Recharts), stylisé aux couleurs AXA.
   Le `config` associe chaque série à un libellé et une couleur ; les couleurs sont
   exposées en variables CSS `--color-<clé>` consommables par les composants Recharts. */

export interface ChartConfigItem {
  label: string
  color?: string
}
export type ChartConfig = Record<string, ChartConfigItem>

const ChartContext = React.createContext<ChartConfig>({})

export function useChartConfig() {
  return React.useContext(ChartContext)
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig
  className?: string
  children: React.ReactElement
}) {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {}
    for (const [key, item] of Object.entries(config)) {
      if (item.color) vars[`--color-${key}`] = item.color
    }
    return vars as React.CSSProperties
  }, [config])

  return (
    <ChartContext.Provider value={config}>
      <div
        className={cn(
          'w-full select-none',
          '[&_.recharts-cartesian-grid_line]:stroke-border/60',
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-axis-tick_text]:text-xs',
          // Supprime les contours/sélections au clic sur les éléments SVG (parts, barres…).
          '[&_.recharts-surface]:outline-none [&_*:focus]:outline-none [&_*:focus-visible]:outline-none',
          '[&_.recharts-sector]:outline-none [&_.recharts-bar-rectangle]:outline-none',
          className,
        )}
        style={style}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

interface TooltipPayloadItem {
  name?: string
  dataKey?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatLabel,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  formatLabel?: (label?: string) => string
}) {
  const config = useChartConfig()
  if (!active || !payload?.length) return null

  return (
    <div className="card-axa min-w-32 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1.5 font-semibold text-foreground">
          {formatLabel ? formatLabel(label) : label}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {payload.map((item, i) => {
          const key = item.dataKey ?? item.name ?? String(i)
          const cfg = config[key as string]
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color ?? cfg?.color }}
                />
                {cfg?.label ?? item.name ?? key}
              </span>
              <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ChartTooltip({
  formatLabel,
  ...props
}: { formatLabel?: (label?: string) => string } & Record<string, unknown>) {
  return (
    <RechartsTooltip
      cursor={{ fill: 'rgba(0,0,128,0.04)' }}
      content={(p) => <ChartTooltipContent {...(p as object)} formatLabel={formatLabel} />}
      {...props}
    />
  )
}
