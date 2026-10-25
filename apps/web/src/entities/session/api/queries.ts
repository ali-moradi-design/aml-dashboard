import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Permission } from "@aml/shared";
import { getMe, getSessions, login, logout, revokeOtherSessions, revokeSession } from "./requests";

export const sessionKeys = {
  all: ["session"] as const,
  me: () => [...sessionKeys.all, "me"] as const,
  list: () => [...sessionKeys.all, "list"] as const,
};

/** The signed-in user. Not retried: a 401 means "go to the login page". */
export const useMe = () =>
  useQuery({ queryKey: sessionKeys.me(), queryFn: getMe, retry: false, staleTime: 5 * 60_000 });

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (me) => {
      qc.clear();
      qc.setQueryData(sessionKeys.me(), me);
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: logout, onSettled: () => qc.clear() });
};

export const useSessions = () => useQuery({ queryKey: sessionKeys.list(), queryFn: getSessions });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.list() }),
  });
};

export const useRevokeOtherSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.list() }),
  });
};

/** Permission check for showing or hiding UI. The API checks again on every request. */
export const useCan = () => {
  const { data } = useMe();
  return (permission: Permission) => Boolean(data?.permissions.includes(permission));
};
