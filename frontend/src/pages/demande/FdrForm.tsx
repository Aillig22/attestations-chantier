import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { useForm } from 'react-hook-form'
import { AlertTriangle } from 'lucide-react'
import type { DemandeDetail, FDR } from '@/lib/types'
import { useSaveFdr } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'

interface Props {
  demande: DemandeDetail
  readOnly?: boolean
}

export function FdrForm({ demande, readOnly }: Props) {
  const toast = useToast()
  const save = useSaveFdr(demande.id)
  const { register, handleSubmit, watch } = useForm<FDR>({ defaultValues: demande.fdr })

  // Champs surveillés pour l'affichage conditionnel.
  const chantierType = watch('chantier_type')
  const usage = watch('usage')
  const modifStructure = watch('modification_structure')
  const atypique = watch('chantier_atypique')
  const activiteCouverte = watch('activite_couverte')
  const travauxStandards = watch('travaux_standards')

  async function onSubmit(values: FDR) {
    try {
      await save.mutateAsync(values)
      toast('success', 'FDR enregistré.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  const disabled = readOnly

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Assuré */}
      <section className="card-axa card-pad">
        <p className="section-title">L'assuré</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nom / raison sociale">
            <input className="input-axa" disabled={disabled} {...register('assure_nom')} />
          </Field>
          <Field label="Ville">
            <input className="input-axa" disabled={disabled} {...register('assure_ville')} />
          </Field>
          <Field label="Numéro de contrat">
            <input className="input-axa" disabled={disabled} {...register('assure_numero_contrat')} />
          </Field>
        </div>
      </section>

      {/* Chantier */}
      <section className="card-axa card-pad">
        <p className="section-title">Le chantier</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom du chantier">
            <input className="input-axa" disabled={disabled} {...register('chantier_nom')} />
          </Field>
          <Field label="Ville">
            <input className="input-axa" disabled={disabled} {...register('chantier_ville')} />
          </Field>
          <Field label="Type">
            <select className="input-axa" disabled={disabled} {...register('chantier_type')}>
              <option value="">—</option>
              <option value="NEUVE">Construction neuve</option>
              <option value="RENOVATION">Rénovation</option>
            </select>
          </Field>
          {chantierType === 'RENOVATION' && (
            <Field label="Modification de structure ?">
              <Checkbox label="Oui, la structure est modifiée" disabled={disabled} {...register('modification_structure')} />
            </Field>
          )}
        </div>

        {chantierType === 'RENOVATION' && modifStructure && (
          <PiecesHint text="Une rénovation avec modification de structure nécessite des pièces justificatives." />
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Usage">
            <select className="input-axa" disabled={disabled} {...register('usage')}>
              <option value="">—</option>
              <option value="HABITATION">Habitation</option>
              <option value="BUREAU">Bureau</option>
              <option value="COMMERCE">Commerce</option>
              <option value="AUTRE">Autre</option>
            </select>
          </Field>
          {usage === 'AUTRE' && (
            <Field label="Précisez l'usage">
              <input className="input-axa" disabled={disabled} {...register('usage_autre_texte')} />
            </Field>
          )}
        </div>
        {usage === 'AUTRE' && <PiecesHint text='Un usage "Autre" nécessite des pièces justificatives.' />}

        <div className="mt-4">
          <Field label="Complexité">
            <Checkbox label="Chantier atypique" disabled={disabled} {...register('chantier_atypique')} />
          </Field>
          {atypique && <PiecesHint text="Un chantier atypique nécessite des pièces justificatives." />}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Date de début">
            <input type="date" className="input-axa" disabled={disabled} {...register('date_debut')} />
          </Field>
          <Field label="Date de fin">
            <input type="date" className="input-axa" disabled={disabled} {...register('date_fin')} />
          </Field>
          <Field label="Coût total (€)">
            <input type="number" step="0.01" className="input-axa" disabled={disabled} {...register('cout_total')} />
          </Field>
        </div>
        {Number(watch('cout_total')) > 10000000 && (
          <PiecesHint text="Un montant supérieur à 10 M€ nécessite des pièces justificatives." />
        )}
      </section>

      {/* Intervention */}
      <section className="card-axa card-pad">
        <p className="section-title">L'intervention</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Description des travaux">
            <textarea className="input-axa" rows={2} disabled={disabled} {...register('description_travaux')} />
          </Field>
          <Field label="Montant de la prestation (€)">
            <input type="number" step="0.01" className="input-axa" disabled={disabled} {...register('montant_prestation')} />
          </Field>
          <Field label="Type d'intervention">
            <select className="input-axa" disabled={disabled} {...register('type_intervention')}>
              <option value="">—</option>
              <option value="ENTREPRISE_PRINCIPALE">Entreprise principale</option>
              <option value="SOUS_TRAITANT">Sous-traitant</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Activité couverte par le contrat ?">
            <Checkbox label="Oui, l'activité est couverte" disabled={disabled} {...register('activite_couverte')} />
          </Field>
          {!activiteCouverte && (
            <Field label="Précisez (obligatoire)">
              <textarea className="input-axa" rows={2} disabled={disabled} {...register('activite_couverte_texte')} />
            </Field>
          )}
        </div>
        {!activiteCouverte && <PiecesHint text="Une activité hors contrat nécessite des pièces justificatives." />}

        <div className="mt-4">
          <Field label="Travaux standards ?">
            <Checkbox label="Oui, travaux standards" disabled={disabled} {...register('travaux_standards')} />
          </Field>
          {!travauxStandards && <PiecesHint text="Des travaux non standards nécessitent des pièces justificatives." />}
        </div>
      </section>

      {!readOnly && (
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Enregistrement…' : 'Enregistrer le FDR'}
          </button>
        </div>
      )}
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-row mb-0">
      <label className="label-axa">{label}</label>
      {children}
    </div>
  )
}

const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, ...props }, ref) => (
    <label className="flex items-center gap-2 py-2 text-sm">
      <input type="checkbox" ref={ref} className="h-4 w-4 accent-[var(--color-axa-blue)]" {...props} />
      {label}
    </label>
  ),
)
Checkbox.displayName = 'Checkbox'

function PiecesHint({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}
