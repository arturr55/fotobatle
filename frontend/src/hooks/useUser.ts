import { useQuery } from '@tanstack/react-query'
import api, { User } from '../api/client'

export function useUser() {
  return useQuery<User>({
    queryKey: ['user'],
    queryFn: () => api.get('/users/me').then(r => r.data),
  })
}
