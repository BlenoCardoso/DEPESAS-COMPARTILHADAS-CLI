import { createContext, useContext, useMemo, useState, useCallback, PropsWithChildren, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type CurrentGroup = {
  id: string;
  name: string;
};

type Ctx = {
  currentGroup: CurrentGroup | null;
  setCurrentGroupId: (id: string | null) => void;
};

const CurrentGroupContext = createContext<Ctx | null>(null);

export function CurrentGroupProvider({ children }: PropsWithChildren) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const groupsQuery = trpc.groups.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });

  // auto-select first group if none
  useEffect(() => {
    if (!isAuthenticated) {
      setGroupId(null);
      return;
    }

    if (!groupId && groupsQuery.data && groupsQuery.data.length > 0) {
      setGroupId(groupsQuery.data[0].group.id);
    }
  }, [groupId, groupsQuery.data, isAuthenticated]);

  const currentGroup = useMemo<CurrentGroup | null>(() => {
    if (!isAuthenticated) return null;
    const g = groupsQuery.data?.find(x => x.group.id === groupId)?.group;
    return g ? { id: g.id, name: g.name } : null;
  }, [groupId, groupsQuery.data, isAuthenticated]);

  const setCurrentGroupId = useCallback((id: string | null) => {
    setGroupId(id);
  }, []);

  const value = useMemo<Ctx>(() => ({ currentGroup, setCurrentGroupId }), [currentGroup, setCurrentGroupId]);
  return <CurrentGroupContext.Provider value={value}>{children}</CurrentGroupContext.Provider>;
}

export function useCurrentGroup() {
  const ctx = useContext(CurrentGroupContext);
  if (!ctx) throw new Error("useCurrentGroup must be used within CurrentGroupProvider");
  return ctx;
}
