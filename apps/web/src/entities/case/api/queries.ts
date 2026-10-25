import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GridQuery } from "@aml/shared";
import {
  addCaseMember,
  addComment,
  createCase,
  deleteComment,
  editComment,
  getCase,
  getCaseBoard,
  getComments,
  getEligibleMembers,
  getNote,
  queryCases,
  removeCaseMember,
  saveNote,
  transitionCase,
  updateCase,
  uploadCaseDocument,
} from "./requests";

export const caseKeys = {
  all: ["cases"] as const,
  list: (q: GridQuery) => [...caseKeys.all, "list", q] as const,
  board: (f: GridQuery["filters"]) => [...caseKeys.all, "board", f] as const,
  detail: (code: string) => [...caseKeys.all, "detail", code] as const,
  comments: (code: string) => [...caseKeys.all, "comments", code] as const,
  note: (code: string) => [...caseKeys.all, "note", code] as const,
  eligible: (code: string) => [...caseKeys.all, "eligible", code] as const,
};

export const casesQueryOptions = (q: GridQuery) => ({
  queryKey: caseKeys.list(q),
  queryFn: () => queryCases(q),
});
export const useCases = (q: GridQuery) => useQuery(casesQueryOptions(q));
export const useCaseBoard = (f: GridQuery["filters"]) =>
  useQuery({ queryKey: caseKeys.board(f), queryFn: () => getCaseBoard(f) });
export const useCase = (code: string) =>
  useQuery({ queryKey: caseKeys.detail(code), queryFn: () => getCase(code) });
export const useComments = (code: string, enabled: boolean) =>
  useQuery({ queryKey: caseKeys.comments(code), queryFn: () => getComments(code), enabled });
export const useNote = (code: string, enabled: boolean) =>
  useQuery({ queryKey: caseKeys.note(code), queryFn: () => getNote(code), enabled });
export const useEligibleMembers = (code: string, enabled: boolean) =>
  useQuery({ queryKey: caseKeys.eligible(code), queryFn: () => getEligibleMembers(code), enabled });

const useCaseMutation = <V extends { code: string }, R>(
  fn: (v: V) => Promise<R>,
  extra: (code: string) => ReadonlyArray<readonly unknown[]> = () => [],
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: caseKeys.detail(v.code) });
      for (const key of extra(v.code)) void qc.invalidateQueries({ queryKey: key });
    },
  });
};

export const useCreateCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: caseKeys.all }),
  });
};
export const useUpdateCase = () => useCaseMutation(updateCase);
export const useTransitionCase = () =>
  useCaseMutation(transitionCase, () => [
    [...caseKeys.all, "list"],
    [...caseKeys.all, "board"],
  ]);
export const useAddCaseMember = () => useCaseMutation(addCaseMember);
export const useRemoveCaseMember = () => useCaseMutation(removeCaseMember);
export const useAddComment = () => useCaseMutation(addComment, (code) => [caseKeys.comments(code)]);
export const useEditComment = () =>
  useCaseMutation(editComment, (code) => [caseKeys.comments(code)]);
export const useDeleteComment = () =>
  useCaseMutation(deleteComment, (code) => [caseKeys.comments(code)]);
export const useSaveNote = () => useCaseMutation(saveNote, (code) => [caseKeys.note(code)]);
export const useUploadDocument = () => useCaseMutation(uploadCaseDocument);
