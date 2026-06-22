"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });
}

export function useSessionList() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: api.listSessions,
  });
}
