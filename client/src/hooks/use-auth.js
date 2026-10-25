import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, login, logout, register } from '../services/auth.js';

const ME = ['me'];

// Who is signed in lives in TanStack Query (it is server data), never in a second copy.
// `data` is the user, `null` for a guest, and `undefined` while it is still loading.
export const useMe = () => useQuery({ queryKey: ME, queryFn: getMe, staleTime: 60 * 1000 });

// Signing in or registering puts the user straight into the cache, so the header changes at once.
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: login, onSuccess: (user) => queryClient.setQueryData(ME, user) });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: register, onSuccess: (user) => queryClient.setQueryData(ME, user) });
}

// Signed out whatever the answer is: if the session was already over (a 401), the user is a guest anyway.
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: logout, onSettled: () => queryClient.setQueryData(ME, null) });
}
