import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef, useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { AlertTriangle, MessageSquareWarning, Save } from 'lucide-react'
import type { DemandeDetail, FDR } from '@/lib/types'
import { useEvaluation, useSaveFdr } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { apiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FDR_FIELD_LABELS } from '@/lib/constants'
import { FormSelect } from '@/components/FormSelect'

interface Props {
  demande: DemandeDetail
  readOnly?: boolean
}

// Champs obligatoires du FDR (miroir de CHAMPS_FDR_OBLIGATOIRES côté backend).
// Sert à détecter si un brouillon a déjà été commencé.
const CHAMPS_FDR_OBLIGATOIRES: (keyof FDR)[] = [
  'assure_nom',
  'assure_ville',
  'assure_numero_contrat',
  'chantier_nom',
  'chantier_ville',
  'chantier_type',
  'usage',
  'date_debut',
  'date_fin',
  'cout_total',
  'description_travaux',
  'type_intervention',
]

export function FdrForm({ demande, readOnly }: Props) {
  const toast = useToast()
  const save = useSaveFdr(demande.id)
  const { data: evaluation } = useEvaluation(demande.id)
  const { register, control, watch, getValues, formState } = useForm<FDR>({
    defaultValues: demande.fdr,
  })

  const values = watch()
  // Champs surveillés pour l'affichage conditionnel.
  const chantierType = values.chantier_type
  const usage = values.usage
  const modifStructure = values.modification_structure
  const atypique = values.chantier_atypique
  const activiteCouverte = values.activite_couverte
  const travauxStandards = values.travaux_standards

  // On ne signale les champs manquants en rouge que si le formulaire a déjà été
  // commencé puis quitté sans être terminé (visite de retour). Sur un brouillon
  // vierge, on n'affiche rien en rouge tant que l'utilisateur saisit.
  const dejaCommence = useRef(
    CHAMPS_FDR_OBLIGATOIRES.some((c) => Boolean(demande.fdr[c])),
  ).current

  // Champs pointés par le siège dans une demande de compléments.
  const champsComplement = new Set(demande.complement_champs ?? [])

  // Champs obligatoires non renseignés (vérité serveur), affichés en rouge.
  // On masque le rouge dès que la valeur courante est saisie, sans attendre la
  // prochaine sauvegarde.
  const manquants = new Set(evaluation?.champs_fdr_manquants ?? [])
  const invalid = (name: keyof FDR) => {
    if (readOnly) return false
    // Champ signalé par le siège : en rouge tant qu'il n'a pas été retouché.
    if (champsComplement.has(name) && !formState.dirtyFields[name]) return true
    // Champ obligatoire manquant (seulement si le brouillon a déjà été commencé).
    return dejaCommence && manquants.has(name) && !values[name]
  }

  // Sauvegarde automatique : on enregistre dès que l'utilisateur quitte
  // l'écran du formulaire (changement d'onglet ou navigation), si des champs
  // ont été modifiés. Une ref garde les dernières valeurs sans relancer l'effet.
  const latest = useRef({ getValues, isDirty: formState.isDirty, readOnly, save, toast })
  latest.current = { getValues, isDirty: formState.isDirty, readOnly, save, toast }
  useEffect(() => {
    return () => {
      const { getValues, isDirty, readOnly, save, toast } = latest.current
      if (!readOnly && isDirty) {
        save.mutate(getValues(), {
          onError: (err) => toast('error', apiError(err)),
        })
      }
    }
  }, [])

  const disabled = readOnly

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
      {demande.complement_message && (
        <section className="card-axa card-pad border-l-4 border-l-axa-red">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="mt-0.5 shrink-0 text-axa-red" size={20} />
            <div className="flex-1">
              <p className="font-medium text-axa-red">Compléments demandés par le siège</p>
              <p className="mt-1 whitespace-pre-line text-sm">{demande.complement_message}</p>
              {champsComplement.size > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...champsComplement].map((c) => (
                    <span key={c} className="badge bg-axa-red/10 text-axa-red">
                      {FDR_FIELD_LABELS[c] ?? c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Assuré */}
      <section className="card-axa card-pad">
        <p className="section-title">L'assuré</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nom / raison sociale" invalid={invalid('assure_nom')}>
            <input className="input-axa" disabled={disabled} {...register('assure_nom')} />
          </Field>
          <Field label="Ville" invalid={invalid('assure_ville')}>
            <input className="input-axa" disabled={disabled} {...register('assure_ville')} />
          </Field>
          <Field label="Numéro de contrat" invalid={invalid('assure_numero_contrat')}>
            <input className="input-axa" disabled={disabled} {...register('assure_numero_contrat')} />
          </Field>
        </div>
      </section>

      {/* Chantier */}
      <section className="card-axa card-pad">
        <p className="section-title">Le chantier</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom du chantier" invalid={invalid('chantier_nom')}>
            <input className="input-axa" disabled={disabled} {...register('chantier_nom')} />
          </Field>
          <Field label="Ville" invalid={invalid('chantier_ville')}>
            <input className="input-axa" disabled={disabled} {...register('chantier_ville')} />
          </Field>
          <Field label="Type" invalid={invalid('chantier_type')}>
            <Controller
              control={control}
              name="chantier_type"
              render={({ field }) => (
                <FormSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={disabled}
                  options={[
                    { value: 'NEUVE', label: 'Construction neuve' },
                    { value: 'RENOVATION', label: 'Rénovation' },
                  ]}
                />
              )}
            />
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
          <Field label="Usage" invalid={invalid('usage')}>
            <Controller
              control={control}
              name="usage"
              render={({ field }) => (
                <FormSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={disabled}
                  options={[
                    { value: 'HABITATION', label: 'Habitation' },
                    { value: 'BUREAU', label: 'Bureau' },
                    { value: 'COMMERCE', label: 'Commerce' },
                    { value: 'AUTRE', label: 'Autre' },
                  ]}
                />
              )}
            />
          </Field>
          {usage === 'AUTRE' && (
            <Field label="Précisez l'usage" invalid={invalid('usage_autre_texte')}>
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
          <Field label="Date de début" invalid={invalid('date_debut')}>
            <input type="date" className="input-axa" disabled={disabled} {...register('date_debut')} />
          </Field>
          <Field label="Date de fin" invalid={invalid('date_fin')}>
            <input type="date" className="input-axa" disabled={disabled} {...register('date_fin')} />
          </Field>
          <Field label="Coût total (€)" invalid={invalid('cout_total')}>
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
          <Field label="Description des travaux" invalid={invalid('description_travaux')}>
            <textarea className="input-axa" rows={2} disabled={disabled} {...register('description_travaux')} />
          </Field>
          <Field label="Montant de la prestation (€)">
            <input type="number" step="0.01" className="input-axa" disabled={disabled} {...register('montant_prestation')} />
          </Field>
          <Field label="Type d'intervention" invalid={invalid('type_intervention')}>
            <Controller
              control={control}
              name="type_intervention"
              render={({ field }) => (
                <FormSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled={disabled}
                  options={[
                    { value: 'ENTREPRISE_PRINCIPALE', label: 'Entreprise principale' },
                    { value: 'SOUS_TRAITANT', label: 'Sous-traitant' },
                  ]}
                />
              )}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Activité couverte par le contrat ?">
            <Checkbox label="Oui, l'activité est couverte" disabled={disabled} {...register('activite_couverte')} />
          </Field>
          {!activiteCouverte && (
            <Field label="Précisez (obligatoire)" invalid={invalid('activite_couverte_texte')}>
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
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Save size={13} className="shrink-0 text-axa-blue" />
          {save.isPending
            ? 'Enregistrement…'
            : 'Vos modifications sont enregistrées automatiquement lorsque vous quittez le formulaire.'}
        </p>
      )}
    </form>
  )
}

function Field({
  label,
  children,
  invalid,
}: {
  label: string
  children: ReactNode
  invalid?: boolean
}) {
  return (
    <div className={cn('form-row mb-0', invalid && 'field-invalid')}>
      <label className="label-axa flex items-center gap-2">
        {label}
        {invalid && <span className="text-xs font-normal">À renseigner</span>}
      </label>
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
