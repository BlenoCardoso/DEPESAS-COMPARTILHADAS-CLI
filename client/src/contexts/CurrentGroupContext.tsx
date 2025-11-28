import { createContext, useContext, useMemo, useState, useCallback, PropsWithChildren, useEffect } from "react";
import { trpc } from "@/lib/trpc";

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

  const groupsQuery = trpc.groups.list.useQuery(undefined, { refetchOnWindowFocus: false });

  // auto-select first group if none
  useEffect(() => {
    if (!groupId && groupsQuery.data && groupsQuery.data.length > 0) {
      setGroupId(groupsQuery.data[0].group.id);
    }
  }, [groupId, groupsQuery.data]);

  const currentGroup = useMemo<CurrentGroup | null>(() => {
    const g = groupsQuery.data?.find(x => x.group.id === groupId)?.group;
    return g ? { id: g.id, name: g.name } : null;
  }, [groupId, groupsQuery.data]);

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
