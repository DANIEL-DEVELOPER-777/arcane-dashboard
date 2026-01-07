import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateAccountRequest, type UpdateAccountRequest } from "@shared/routes";

export function useAccounts() {
  return useQuery({
    queryKey: [api.accounts.list.path],
    queryFn: async () => {
      const res = await fetch(api.accounts.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return api.accounts.list.responses[200].parse(await res.json());
    },
    refetchInterval: 100,
  });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: [api.accounts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.accounts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch account");
      return api.accounts.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 100,
  });
}

export function useAccountHistory(id: number, period: "1D" | "1W" | "1M" | "1Y" | "ALL" = "ALL") {
  return useQuery({
    queryKey: [api.accounts.history.path, id, period],
    queryFn: async () => {
      const url = buildUrl(api.accounts.history.path, { id }) + `?period=${period}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.accounts.history.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 100,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAccountRequest) => {
      const validated = api.accounts.create.input.parse(data);
      const res = await fetch(api.accounts.create.path, {
        method: api.accounts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.accounts.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to create account");
      }
      return api.accounts.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateAccountRequest) => {
      const validated = api.accounts.update.input.parse(updates);
      const url = buildUrl(api.accounts.update.path, { id });
      const res = await fetch(url, {
        method: api.accounts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to update account");
      }
      return api.accounts.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.accounts.get.path, variables.id] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.accounts.delete.path, { id });
      const res = await fetch(url, {
        method: api.accounts.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to delete account");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.accounts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: [api.portfolio.summary.path],
    queryFn: async () => {
      const res = await fetch(api.portfolio.summary.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return api.portfolio.summary.responses[200].parse(await res.json());
    },
    refetchInterval: 100,
  });
}

export function usePortfolioHistory(period: "1D" | "1W" | "1M" | "1Y" | "ALL" = "ALL") {
  return useQuery({
    queryKey: [api.portfolio.history.path, period],
    queryFn: async () => {
      const url = `${api.portfolio.history.path}?period=${period}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch portfolio history");
      return api.portfolio.history.responses[200].parse(await res.json());
    },
    refetchInterval: 100,
  });
}
