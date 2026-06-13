/**
 * Switch AXA — le parallélogramme rouge emblématique (un « / » plein) issu du logo.
 * Angle officiel : 52° (le bord oblique monte de 100 sur un déport de 78 → atan(100/78) ≈ 52°).
 * On conserve le ratio (preserveAspectRatio par défaut = meet) pour ne jamais déformer l'angle.
 */
export function AxaSwitch({
  className,
  color = '#ff1821',
  fillOpacity = 1,
}: {
  className?: string
  color?: string
  fillOpacity?: number
}) {
  return (
    <svg viewBox="0 0 118 100" className={className} aria-hidden="true">
      <path d="M0 100 L40 100 L118 0 L78 0 Z" fill={color} fillOpacity={fillOpacity} />
    </svg>
  )
}
