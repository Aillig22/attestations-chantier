import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  className?: string
}

/* Radix interdit la valeur "" pour un item : on mappe l'option « tout » sur un sentinel. */
const ALL = '__all__'

/**
 * Dropdown de filtre basé sur le Select shadcn/Radix, stylisé AXA.
 * Expose une API simple value/onChange/options (la valeur '' = « tout »).
 */
export function FilterSelect({ value, onChange, options, className }: FilterSelectProps) {
  return (
    <Select
      value={value === '' ? ALL : value}
      onValueChange={(v) => onChange(v === ALL ? '' : v)}
    >
      <SelectTrigger className={className} aria-label="Filtre">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || ALL} value={o.value === '' ? ALL : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
