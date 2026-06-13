import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Bot,
  CheckCircle2,
  Download,
  Eye,
  Heading2,
  Italic,
  List,
  Lock,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { DemandeDetail } from '@/lib/types'
import { useAttestation } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { downloadAttestationPdf } from '@/lib/pdf'
import { apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'

function buildPrefill(d: DemandeDetail): string {
  const f = d.fdr
  return `
    <h2>Attestation de chantier</h2>
    <p>La société <strong>AXA Assurances</strong> atteste que <strong>${f.assure_nom || '[Assuré]'}</strong>,
    domicilié(e) à ${f.assure_ville || '[Ville]'} (contrat n° ${f.assure_numero_contrat || '[N° contrat]'}),
    bénéficie d'une couverture pour le chantier <strong>${f.chantier_nom || '[Chantier]'}</strong>
    situé à ${f.chantier_ville || '[Ville chantier]'}.</p>
    <p><strong>Nature des travaux :</strong> ${f.description_travaux || '[Travaux]'}</p>
    <p><strong>Période couverte :</strong> du ${formatDate(f.date_debut)} au ${formatDate(f.date_fin)}.</p>
    <p>Fait pour servir et valoir ce que de droit.</p>
  `.trim()
}

export function AttestationPanel({ demande }: { demande: DemandeDetail }) {
  const toast = useToast()
  const { query, save, valider, analyse } = useAttestation(demande.id)
  const [preview, setPreview] = useState(false)
  // HTML figé au moment du basculement en aperçu : fiable même si l'éditeur
  // vient juste d'être (re)monté.
  const [previewHtml, setPreviewHtml] = useState('')

  // L'attestation n'est générée qu'une fois la demande acceptée.
  const accepted = demande.decision === 'ACCEPTEE'

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: { attributes: { class: 'prose-axa min-h-80 p-4 focus:outline-none' } },
  })

  // Charge le contenu existant une fois récupéré.
  useEffect(() => {
    if (editor && query.data) {
      editor.commands.setContent(query.data.contenu || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, query.data?.id])

  if (!editor) return null

  if (!accepted) {
    return (
      <section className="card-axa card-pad flex flex-col items-center gap-3 text-center">
        <Lock size={28} className="text-muted" />
        <p className="font-medium">Attestation indisponible</p>
        <p className="help-text max-w-md">
          L'attestation et l'analyse de cohérence IA sont générées par le siège une fois la
          demande <strong>acceptée</strong>.
        </p>
      </section>
    )
  }

  async function onSave() {
    try {
      await save.mutateAsync({ contenu: editor!.getHTML() })
      toast('success', 'Attestation enregistrée.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  function togglePreview() {
    setPreview((p) => {
      if (!p) setPreviewHtml(editor!.getHTML())
      return !p
    })
  }

  function prefill() {
    editor!.commands.setContent(buildPrefill(demande))
    toast('info', 'Données du FDR injectées.')
  }

  async function onValidate() {
    try {
      await onSave()
      await valider.mutateAsync()
      toast('success', 'Attestation validée.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  async function exportPdf() {
    try {
      await onSave()
      await downloadAttestationPdf(demande.id, demande.reference)
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  async function runAnalyse() {
    try {
      await onSave()
      await analyse.mutateAsync()
      toast('info', 'Analyse de cohérence terminée.')
    } catch (err) {
      toast('error', apiError(err))
    }
  }

  const analyseResult = analyse.data ?? demande.analyse_ia

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Éditeur */}
      <section className="card-axa">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </ToolbarBtn>
          <div className="mx-1 h-5 w-px bg-border" />
          <button className="btn-ghost btn-sm" onClick={prefill}>
            <Wand2 size={14} /> Pré-remplir depuis le FDR
          </button>
          <button className="btn-ghost btn-sm" onClick={togglePreview}>
            <Eye size={14} /> {preview ? 'Éditer' : 'Prévisualiser'}
          </button>
        </div>

        {preview ? (
          <div
            className="prose-axa min-h-80 p-4"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          <button className="btn-primary btn-sm" onClick={() => onSave()} disabled={save.isPending}>
            <Save size={14} /> Sauvegarder
          </button>
          <button className="btn-ghost btn-sm" onClick={exportPdf}>
            <Download size={14} /> Export PDF
          </button>
          <button className="btn-success btn-sm" onClick={onValidate} disabled={valider.isPending}>
            <CheckCircle2 size={14} /> Valider l'attestation
          </button>
          {query.data?.validee && (
            <span className="badge bg-green-100 text-green-800 ml-auto">Validée</span>
          )}
        </div>
      </section>

      {/* Analyse IA */}
      <section className="card-axa card-pad h-fit">
        <p className="section-title flex items-center gap-2">
          <Sparkles size={14} /> Analyse de cohérence IA
        </p>
        <p className="help-text mb-3">
          Vérifie la cohérence entre le FDR et le contenu de l'attestation.
        </p>
        <button className="btn-primary w-full" onClick={runAnalyse} disabled={analyse.isPending}>
          <Bot size={16} /> {analyse.isPending ? 'Analyse…' : 'Analyser avec IA'}
        </button>

        {analyseResult && (
          <div className="mt-4">
            {analyseResult.statut === 'COHERENT' ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 size={16} /> Document cohérent avec le FDR.
              </div>
            ) : (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <p className="font-medium">
                  {analyseResult.incoherences.length} incohérence(s) détectée(s) :
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {analyseResult.incoherences.map((inc, i) => (
                    <li key={i} className="rounded border border-red-200 bg-white p-2">
                      <p className="font-medium">{inc.message}</p>
                      {inc.attendu && (
                        <p className="text-xs text-muted">
                          Attendu : <mark className="bg-amber-200">{inc.attendu}</mark>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function ToolbarBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded p-1.5 hover:bg-background ${active ? 'bg-axa-blue text-white hover:bg-axa-blue' : ''}`}
    >
      {children}
    </button>
  )
}
