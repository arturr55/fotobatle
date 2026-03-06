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

export function useFinishedBattles() {
  return useQuery<Battle[]>({
    queryKey: ['battles-finished'],
    queryFn: () => api.get('/battles/finished').then(r => r.data),
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

function compressImage(file: File, maxWidth = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

export function useEnterBattle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ battleId, photo }: { battleId: number; photo: File }) => {
      const photoData = await compressImage(photo)
      return api.post(`/battles/${battleId}/enter`, { photo: photoData }).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battles'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['user-entries'] })
    }
  })
}
