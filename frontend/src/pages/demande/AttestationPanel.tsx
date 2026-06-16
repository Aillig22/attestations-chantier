import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Bot,
  CheckCircle2,
  Download,
  Eye,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Minus,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Wand2,
} from 'lucide-react'
import type { Attestation, DemandeDetail } from '@/lib/types'
import { useAttestation } from '@/lib/queries'
import { useToast } from '@/components/Toast'
import { downloadAttestationPdf } from '@/lib/pdf'
import { apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { AttestationPreview } from './AttestationPreview'

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

// Variables du FDR insérables à la position du curseur.
function fdrVariables(d: DemandeDetail): { label: string; value: string }[] {
  const f = d.fdr
  return [
    { label: 'Nom de l’assuré', value: f.assure_nom || '' },
    { label: 'Ville de l’assuré', value: f.assure_ville || '' },
    { label: 'N° de contrat', value: f.assure_numero_contrat || '' },
    { label: 'Nom du chantier', value: f.chantier_nom || '' },
    { label: 'Ville du chantier', value: f.chantier_ville || '' },
    { label: 'Description des travaux', value: f.description_travaux || '' },
    { label: 'Date de début', value: formatDate(f.date_debut) },
    { label: 'Date de fin', value: formatDate(f.date_fin) },
  ]
}

export function AttestationPanel({ demande }: { demande: DemandeDetail }) {
  const toast = useToast()
  const { query, save, valider, analyse } = useAttestation(demande.id)
  const [preview, setPreview] = useState(false)
  // HTML figé au moment du basculement en aperçu : fiable même si l'éditeur
  // vient juste d'être (re)monté.
  const [previewHtml, setPreviewHtml] = useState('')
  const [type, setType] = useState<Attestation['type']>('PROJET')

  // L'attestation n'est générée qu'une fois la demande acceptée.
  const accepted = demande.decision === 'ACCEPTEE'

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editorProps: { attributes: { class: 'prose-axa min-h-80 p-4 focus:outline-none' } },
  })

  // Charge le contenu existant une fois récupéré.
  useEffect(() => {
    if (editor && query.data) {
      editor.commands.setContent(query.data.contenu || '')
      setType(query.data.type || 'PROJET')
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
      await save.mutateAsync({ contenu: editor!.getHTML(), type })
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

  function setLink() {
    const previous = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien (laisser vide pour retirer le lien)', previous ?? '')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  function setHeading(value: string) {
    const chain = editor!.chain().focus()
    if (value === 'p') chain.setParagraph().run()
    else chain.toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run()
  }

  function insertVariable(value: string) {
    if (value) editor!.chain().focus().insertContent(value).run()
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
  const currentHeading = editor.isActive('heading', { level: 1 })
    ? '1'
    : editor.isActive('heading', { level: 2 })
      ? '2'
      : editor.isActive('heading', { level: 3 })
        ? '3'
        : 'p'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Éditeur */}
      <section className="card-axa">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo2 size={16} />
          </ToolbarBtn>
          <Divider />

          <select
            value={currentHeading}
            onChange={(e) => setHeading(e.target.value)}
            className="rounded border border-border bg-surface px-1.5 py-1 text-sm"
            title="Style de paragraphe"
          >
            <option value="p">Normal</option>
            <option value="1">Titre 1</option>
            <option value="2">Titre 2</option>
            <option value="3">Titre 3</option>
          </select>
          <Divider />

          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon size={16} />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={16} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={16} />
          </ToolbarBtn>
          <Divider />

          <ToolbarBtn
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </ToolbarBtn>
          <Divider />

          <ToolbarBtn
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight size={16} />
          </ToolbarBtn>
          <Divider />

          <label
            className="flex cursor-pointer items-center rounded p-1.5 hover:bg-background"
            title="Couleur du texte"
          >
            <span
              className="h-4 w-4 rounded border border-border"
              style={{ backgroundColor: (editor.getAttributes('textStyle').color as string) || '#333333' }}
            />
            <input
              type="color"
              className="sr-only"
              value={(editor.getAttributes('textStyle').color as string) || '#333333'}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
          <ToolbarBtn
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fff06c' }).run()}
          >
            <Highlighter size={16} />
          </ToolbarBtn>
          <Divider />

          <ToolbarBtn active={editor.isActive('link')} onClick={setLink}>
            <Link2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <TableIcon size={16} />
          </ToolbarBtn>
          <Divider />

          <select
            value=""
            onChange={(e) => {
              insertVariable(e.target.value)
              e.target.value = ''
            }}
            className="rounded border border-border bg-surface px-1.5 py-1 text-sm"
            title="Insérer une variable du FDR"
          >
            <option value="">+ Variable FDR…</option>
            {fdrVariables(demande).map((v) => (
              <option key={v.label} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1">
            <button className="btn-ghost btn-sm" onClick={prefill}>
              <Wand2 size={14} /> Pré-remplir depuis le FDR
            </button>
            <button className="btn-ghost btn-sm" onClick={togglePreview}>
              <Eye size={14} /> {preview ? 'Éditer' : 'Prévisualiser'}
            </button>
          </div>
        </div>

        {preview ? (
          <AttestationPreview
            html={previewHtml}
            demande={demande}
            type={type}
            validee={query.data?.validee ?? false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          <label className="flex items-center gap-1.5 text-sm text-muted">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Attestation['type'])}
              className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
            >
              <option value="PROJET">Provisoire</option>
              <option value="DEFINITIVE">Définitive</option>
            </select>
          </label>
          <div className="mx-1 h-5 w-px bg-border" />
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

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />
}

function ToolbarBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 hover:bg-background disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-axa-blue text-white hover:bg-axa-blue' : ''
      }`}
    >
      {children}
    </button>
  )
}
