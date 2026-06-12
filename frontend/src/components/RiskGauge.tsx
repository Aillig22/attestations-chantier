import type { Evaluation } from '@/lib/types'
import { RiskBadge } from './Badges'

const BAR_COLOR: Record<string, string> = {
  FAIBLE: 'bg-success',
  MOYEN: 'bg-warning',
  ELEVE: 'bg-axa-red',
}

export function RiskGauge({ risque }: { risque: Evaluation['risque'] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Score de risque : {risque.score}/100</span>
        <RiskBadge niveau={risque.niveau} />
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${BAR_COLOR[risque.niveau]}`}
          style={{ width: `${risque.score}%` }}
        />
      </div>
      <p className="help-text">{risque.synthese}</p>
      {risque.facteurs.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {risque.facteurs.map((f) => (
            <li key={f} className="badge bg-gray-100 text-gray-700">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
