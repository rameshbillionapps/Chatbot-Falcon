import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  username: string;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<{ user: AuthUser }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
  };
}
