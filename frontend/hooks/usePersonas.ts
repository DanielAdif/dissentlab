"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Persona } from "@/lib/api";

export function usePersonas() {
  return useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: api.listPersonas,
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string } & Parameters<typeof api.updatePersona>[1]) =>
      api.updatePersona(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; role: string; system_prompt: string }) =>
      api.createPersona(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePersona(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}

export function useRestoreDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.restoreDefaultPersonas,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });
}
