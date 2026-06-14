import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Select de formulaire basé sur le même composant Radix que les filtres du
 * dashboard, mais au gabarit « champ » : pleine largeur, coins arrondis AXA,
 * pour rester cohérent avec les `input-axa`. La valeur '' représente « aucune
 * sélection » (affiche le placeholder).
 */
export function FormSelect({
  value,
  onChange,
  options,
  placeholder = '—',
  disabled,
  className,
}: FormSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'w-full rounded-[var(--radius-axa)] px-3 py-2 font-normal',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
