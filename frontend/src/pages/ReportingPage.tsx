import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Percent,
  Timer,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { useReporting } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import type { ReportingData } from '@/lib/types'

/* Couleurs issues de la data palette AXA (cf. index.css). */
const STATUT_COLORS: Record<string, string> = {
  BROUILLON: '#74bde8', // data-sky
  EN_COURS: '#614fe8', // data-grape
  TRAITE: '#0f717f', // data-teal
}
const DECISION_COLORS: Record<string, string> = {
  ACCEPTEE: '#188138', // success
  REFUSEE: '#e60000', // axa-red
  EN_ATTENTE: '#c84d14', // warning
}
const RISQUE_COLORS: Record<string, string> = {
  FAIBLE: '#188138',
  MOYEN: '#c84d14',
  ELEVE: '#a30245', // data-cherry
}

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
function moisLabel(iso: string) {
  const [y, m] = iso.split('-')
  return `${MOIS_COURTS[Number(m) - 1]} ${y.slice(2)}`
}

export function ReportingPage() {
  const { user } = useAuth()
  const { data, isLoading } = useReporting()
  const isSiege = user?.role === 'SIEGE'

  return (
    <div className="page space-y-6">
      <header>
        <h1>Reporting</h1>
        <p className="help-text mt-1">
          {isSiege
            ? "Vue d'ensemble de l'activité — toutes demandes confondues."
            : 'Synthèse de votre activité de demandes d’attestation.'}
        </p>
      </header>

      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <>
          <KpiBand data={data} isSiege={isSiege} />

          <div className="grid gap-6 lg:grid-cols-2">
            <StatutDonut data={data} />
            <DecisionBars data={data} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RisqueBars data={data} />
            <EvolutionChart data={data} />
          </div>

          {isSiege && (
            <div className="grid gap-6 lg:grid-cols-2">
              <TopMotifs data={data} />
              <ParDistributeur data={data} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* KPIs                                                                      */
/* ----------------------------------------------------------------------- */
function KpiBand({ data, isSiege }: { data: ReportingData; isSiege: boolean }) {
  const k = data.kpis
  const cards = [
    { label: 'Total demandes', value: k.total, icon: FileText, color: 'text-axa-blue' },
    { label: 'En cours', value: k.en_cours, icon: Clock, color: 'text-data-grape' },
    { label: 'Traitées', value: k.traite, icon: CheckCircle2, color: 'text-data-teal' },
    {
      label: "Taux d'acceptation",
      value: k.taux_acceptation === null ? '—' : `${k.taux_acceptation}%`,
      icon: Percent,
      color: 'text-success',
    },
    {
      label: isSiege ? 'Délai moyen traitement' : 'Vos brouillons',
      value: isSiege
        ? k.delai_moyen_traitement_jours === null
          ? '—'
          : `${k.delai_moyen_traitement_jours} j`
        : k.brouillon,
      icon: isSiege ? Timer : ClipboardList,
      color: 'text-foreground',
    },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted">{c.label}</span>
            <c.icon className="h-4 w-4 text-muted" />
          </div>
          <span className={`text-3xl font-bold ${c.color}`}>{c.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------------- */
/* Graphiques                                                               */
/* ----------------------------------------------------------------------- */
function ChartCard({
  title,
  children,
  empty,
}: {
  title: string
  children: React.ReactNode
  empty?: boolean
}) {
  return (
    <section className="card-axa card-pad">
      <h2 className="section-title">{title}</h2>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted">
          Aucune donnée à afficher.
        </div>
      ) : (
        children
      )}
    </section>
  )
}

function StatutDonut({ data }: { data: ReportingData }) {
  const rows = data.par_statut.filter((r) => r.count > 0)
  const config: ChartConfig = Object.fromEntries(
    data.par_statut.map((r) => [r.statut, { label: r.label, color: STATUT_COLORS[r.statut] }]),
  )
  return (
    <ChartCard title="Répartition par statut" empty={rows.length === 0}>
      <ChartContainer config={config} className="h-64">
        <PieChart>
          <ChartTooltip />
          <Pie
            data={rows}
            dataKey="count"
            nameKey="statut"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={2}
          >
            {rows.map((r) => (
              <Cell key={r.statut} fill={STATUT_COLORS[r.statut]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <Legend rows={rows.map((r) => ({ label: r.label, color: STATUT_COLORS[r.statut], value: r.count }))} />
    </ChartCard>
  )
}

function DecisionBars({ data }: { data: ReportingData }) {
  const rows = data.par_decision
  const total = rows.reduce((s, r) => s + r.count, 0)
  const config: ChartConfig = { count: { label: 'Demandes' } }
  return (
    <ChartCard title="Décisions" empty={total === 0}>
      <ChartContainer config={config} className="h-64">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {rows.map((r) => (
              <Cell key={r.decision} fill={DECISION_COLORS[r.decision]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

function RisqueBars({ data }: { data: ReportingData }) {
  const rows = data.par_risque
  const total = rows.reduce((s, r) => s + r.count, 0)
  const config: ChartConfig = { count: { label: 'Dossiers' } }
  return (
    <ChartCard title="Niveaux de risque (dossiers saisis)" empty={total === 0}>
      <ChartContainer config={config} className="h-64">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={56} />
          <ChartTooltip />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={40}>
            {rows.map((r) => (
              <Cell key={r.niveau} fill={RISQUE_COLORS[r.niveau]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

function EvolutionChart({ data }: { data: ReportingData }) {
  const rows = data.evolution
  const empty = rows.every((r) => r.creees === 0 && r.traitees === 0)
  const config: ChartConfig = {
    creees: { label: 'Créées', color: '#00008f' },
    traitees: { label: 'Traitées', color: '#0f717f' },
  }
  return (
    <ChartCard title="Évolution sur 6 mois" empty={empty}>
      <ChartContainer config={config} className="h-64">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fillCreees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00008f" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00008f" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillTraitees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f717f" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0f717f" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="mois"
            tickFormatter={moisLabel}
            tickLine={false}
            axisLine={false}
            minTickGap={8}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip formatLabel={(l) => (l ? moisLabel(l) : '')} />
          <Area
            type="monotone"
            dataKey="creees"
            stroke="#00008f"
            strokeWidth={2}
            fill="url(#fillCreees)"
          />
          <Area
            type="monotone"
            dataKey="traitees"
            stroke="#0f717f"
            strokeWidth={2}
            fill="url(#fillTraitees)"
          />
        </AreaChart>
      </ChartContainer>
      <Legend
        rows={[
          { label: 'Créées', color: '#00008f' },
          { label: 'Traitées', color: '#0f717f' },
        ]}
      />
    </ChartCard>
  )
}

/* ----------------------------------------------------------------------- */
/* Sections siège                                                           */
/* ----------------------------------------------------------------------- */
function TopMotifs({ data }: { data: ReportingData }) {
  const rows = data.top_motifs_refus ?? []
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ChartCard title="Top motifs de refus" empty={rows.length === 0}>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.motif} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="line-clamp-1 text-foreground" title={r.motif}>
                {r.motif}
              </span>
              <span className="font-semibold tabular-nums text-axa-red">{r.count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-axa-red/80"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}

function ParDistributeur({ data }: { data: ReportingData }) {
  const rows = data.par_distributeur ?? []
  return (
    <ChartCard title="Activité par distributeur" empty={rows.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="pb-2 font-medium">Distributeur</th>
              <th className="pb-2 text-right font-medium">Demandes</th>
              <th className="pb-2 text-right font-medium">Acceptées</th>
              <th className="pb-2 text-right font-medium">Taux</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const taux = r.total ? Math.round((r.acceptees / r.total) * 100) : 0
              return (
                <tr key={r.nom} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-foreground">{r.nom}</td>
                  <td className="py-2 text-right tabular-nums">{r.total}</td>
                  <td className="py-2 text-right tabular-nums text-success">{r.acceptees}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{taux}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

/* ----------------------------------------------------------------------- */
/* Briques communes                                                         */
/* ----------------------------------------------------------------------- */
function Legend({ rows }: { rows: { label: string; color: string; value?: number }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
          {r.label}
          {r.value !== undefined && (
            <span className="font-semibold text-foreground">({r.value})</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stat-card h-24 animate-pulse">
            <div className="h-3 w-20 rounded bg-gray-100" />
            <div className="mt-3 h-8 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card-axa card-pad h-72 animate-pulse">
            <div className="h-3 w-40 rounded bg-gray-100" />
            <div className="mt-6 h-48 rounded bg-gray-50" />
          </div>
        ))}
      </div>
    </div>
  )
}
