import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  AnalyseIA,
  Attestation,
  DemandeDetail,
  DemandeListItem,
  Evaluation,
  FDR,
  Notification,
} from './types'

export interface DemandeFilters {
  statut?: string
  decision?: string
}

export function useDemandes(filters: DemandeFilters) {
  return useQuery({
    queryKey: ['demandes', filters],
    queryFn: async () => {
      const { data } = await api.get('/demandes/', { params: filters })
      return (data.results ?? data) as DemandeListItem[]
    },
  })
}

export function useDemande(id: number | string) {
  return useQuery({
    queryKey: ['demande', String(id)],
    queryFn: async () => (await api.get<DemandeDetail>(`/demandes/${id}/`)).data,
  })
}

export function useEvaluation(id: number | string) {
  return useQuery({
    queryKey: ['evaluation', String(id)],
    queryFn: async () => (await api.get<Evaluation>(`/demandes/${id}/evaluation/`)).data,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/')
      return (data.results ?? data) as Notification[]
    },
    refetchInterval: 30000,
  })
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.post(`/notifications/${id}/lue/`, {})))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useCreateDemande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<DemandeDetail>('/demandes/', {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandes'] }),
  })
}

export function useRelanceDemande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number | string) =>
      (await api.post(`/demandes/${id}/relance/`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandes'] }),
  })
}

export function useDeleteDemande() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number | string) => (await api.delete(`/demandes/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandes'] }),
  })
}

export function useSaveFdr(id: number | string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fdr: FDR) => (await api.put(`/demandes/${id}/fdr/`, fdr)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demande', String(id)] })
      qc.invalidateQueries({ queryKey: ['evaluation', String(id)] })
    },
  })
}

export function useDemandeAction(id: number | string) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['demande', String(id)] })
    qc.invalidateQueries({ queryKey: ['demandes'] })
    qc.invalidateQueries({ queryKey: ['evaluation', String(id)] })
  }
  return {
    submit: useMutation({
      mutationFn: async () => (await api.post(`/demandes/${id}/submit/`, {})).data,
      onSuccess: invalidate,
    }),
    decision: useMutation({
      mutationFn: async (payload: { decision: string; motif_refus?: string }) =>
        (await api.post(`/demandes/${id}/decision/`, payload)).data,
      onSuccess: invalidate,
    }),
    relance: useMutation({
      mutationFn: async () => (await api.post(`/demandes/${id}/relance/`, {})).data,
      onSuccess: invalidate,
    }),
    complements: useMutation({
      mutationFn: async (payload: { texte: string; champs?: string[] }) =>
        (await api.post(`/demandes/${id}/demander-complements/`, payload)).data,
      onSuccess: invalidate,
    }),
    comment: useMutation({
      mutationFn: async (texte: string) =>
        (await api.post(`/demandes/${id}/commentaires/`, { texte })).data,
      onSuccess: invalidate,
    }),
  }
}

export function usePieces(id: number | string) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['demande', String(id)] })
    qc.invalidateQueries({ queryKey: ['evaluation', String(id)] })
  }
  return {
    upload: useMutation({
      mutationFn: async ({ file, type_requis }: { file: File; type_requis: string }) => {
        const fd = new FormData()
        fd.append('fichier', file)
        fd.append('type_requis', type_requis)
        return (await api.post(`/demandes/${id}/pieces/`, fd)).data
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (pieceId: number) =>
        (await api.delete(`/demandes/${id}/pieces/${pieceId}/`)).data,
      onSuccess: invalidate,
    }),
  }
}

export function useAttestation(id: number | string) {
  const qc = useQueryClient()
  return {
    query: useQuery({
      queryKey: ['attestation', String(id)],
      queryFn: async () => (await api.get<Attestation>(`/demandes/${id}/attestation/`)).data,
    }),
    save: useMutation({
      mutationFn: async (payload: { contenu: string; type?: string }) =>
        (await api.put(`/demandes/${id}/attestation/`, payload)).data,
      onSuccess: () => qc.invalidateQueries({ queryKey: ['attestation', String(id)] }),
    }),
    valider: useMutation({
      mutationFn: async () => (await api.post(`/demandes/${id}/attestation/valider/`, {})).data,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['attestation', String(id)] })
        qc.invalidateQueries({ queryKey: ['demande', String(id)] })
        qc.invalidateQueries({ queryKey: ['notifications'] })
      },
    }),
    analyse: useMutation({
      mutationFn: async () =>
        (await api.post<AnalyseIA>(`/demandes/${id}/analyse-ia/`, {})).data,
      onSuccess: () => qc.invalidateQueries({ queryKey: ['demande', String(id)] }),
    }),
  }
}
