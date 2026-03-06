import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Battle, BattleEntry } from '../api/client'

export function useBattles() {
  return useQuery<Battle[]>({
    queryKey: ['battles'],
    queryFn: () => api.get('/battles').then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useBattle(id: number) {
  return useQuery<Battle>({
    queryKey: ['battle', id],
    queryFn: () => api.get(`/battles/${id}`).then(r => r.data),
  })
}

export function useVoteEntry(battleId: number) {
  return useQuery<BattleEntry | null>({
    queryKey: ['vote-entry', battleId],
    queryFn: () => api.get(`/battles/${battleId}/vote-entry`).then(r => r.data),
  })
}

export function useVote(battleId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ entryId, reaction }: { entryId: number; reaction: string }) =>
      api.post(`/battles/entries/${entryId}/vote`, { reaction }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-entry', battleId] })
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] })
    }
  })
}

export function useEnterBattle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ battleId, photo }: { battleId: number; photo: File }) => {
      const form = new FormData()
      form.append('photo', photo)
      return api.post(`/battles/${battleId}/enter`, form).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['user-entries'] })
    }
  })
}
