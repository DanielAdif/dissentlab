"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: api.listProviders,
  });
}

export function useSetApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      api.setApiKey(provider, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.deleteApiKey(provider),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export function useTestProvider() {
  return useMutation({
    mutationFn: (provider: string) => api.testProvider(provider),
  });
}
