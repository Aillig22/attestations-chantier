import { api } from './api'

/**
 * Récupère un PDF (blob) et déclenche son téléchargement via un lien temporaire.
 * On évite `window.open(blobUrl)`, fréquemment bloqué par les bloqueurs de pop-up
 * (notamment quand l'appel n'est pas immédiatement consécutif à un clic).
 */
async function downloadBlobFromApi(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Laisse le temps au navigateur d'initier le téléchargement avant de révoquer.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
}

export function downloadAttestationPdf(demandeId: number | string, reference: string) {
  return downloadBlobFromApi(
    `/demandes/${demandeId}/attestation/pdf/`,
    `attestation-${reference}.pdf`,
  )
}

export function downloadFdrPdf(demandeId: number | string, reference: string) {
  return downloadBlobFromApi(`/demandes/${demandeId}/fdr/pdf/`, `fdr-${reference}.pdf`)
}
