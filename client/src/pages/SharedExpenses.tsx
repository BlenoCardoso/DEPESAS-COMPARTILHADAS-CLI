import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SplitCalculator } from "@/components/SplitCalculator";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import BodyPortal from "@/components/BodyPortal";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryIcon, CategoryOption } from "@/components/CategoryVisual";
import { trpc } from "@/lib/trpc";
import { deleteExpenseAttachment, uploadExpenseAttachment, validateImageFile } from "@/lib/storage";
import { realsToCents, centsToRealsInput } from "@/lib/currency";
import {
  CheckCircle2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Paperclip,
  Clock,
  ArrowUpDown,
  Check,
  X,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  Settings,
  Users,
  Tags,
  Repeat,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { toast } from "sonner";
import { formatCents, userLabel } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation } from "wouter";
type SplitMode = "equal" | "fixed" | "percentage" | "proportional" | "single";
type CustomSplit = { userId: string; value: number };

function ExpenseListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-xl" />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16 rounded-xl" />
                  <Skeleton className="h-3 w-10 rounded-xl" />
                </div>
                <Skeleton className="h-9 w-9 rounded-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExpenseDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
            <Skeleton className="h-3 w-16 rounded-xl" />
            <Skeleton className="h-3 w-20 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-2xl" />
      </div>
    </div>
  );
}

type Panel =
  | null
  | "create"
  | "edit"
  | "detail"
  | "filters"
  | "settings"
  | "categories"
  | "members"
  | "recurring";

type SharedExpensesUiSettings = {
  mode: "simple" | "advanced";
  defaultSplitMode: SplitMode;
  defaultAllowMemberEdits: boolean;
};

export default function SharedExpenses() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [panel, setPanel] = useState<Panel>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsExpense, setActionsExpense] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(""); // Em reais (ex: "25,99" ou "25.99")
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [allowMemberEdits, setAllowMemberEdits] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([]);
  const [paidBy, setPaidBy] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentRemoved, setAttachmentRemoved] = useState(false);
  // filtros
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  // edição
  const [editing, setEditing] = useState<any | null>(null);
  // detalhes
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailAllowMemberEdits, setDetailAllowMemberEdits] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const settingsKey = useMemo(() => (groupId ? `sharedExpenses:${groupId}:settings` : null), [groupId]);
  const [uiSettings, setUiSettings] = useState<SharedExpensesUiSettings>({
    mode: "simple",
    defaultSplitMode: "equal",
    defaultAllowMemberEdits: false,
  });

  const prevGroupIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!groupId) {
      prevGroupIdRef.current = groupId;
      return;
    }

    const prev = prevGroupIdRef.current;
    if (prev && prev !== groupId) {
      // Ao trocar de grupo, evite filtros/painéis do grupo anterior mascararem os dados.
      setPanel(null);
      setDetailId(null);
      setFilterText("");
      setFilterCategory("");
      setFilterStatus("");
      setFilterStart("");
      setFilterEnd("");
    }

    prevGroupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SharedExpensesUiSettings>;
      setUiSettings((prev) => ({
        mode: parsed.mode === "advanced" ? "advanced" : "simple",
        defaultSplitMode: (parsed.defaultSplitMode as SplitMode) || prev.defaultSplitMode,
        defaultAllowMemberEdits: typeof parsed.defaultAllowMemberEdits === "boolean" ? parsed.defaultAllowMemberEdits : prev.defaultAllowMemberEdits,
      }));
    } catch {
      // ignore
    }
  }, [settingsKey]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      localStorage.setItem(settingsKey, JSON.stringify(uiSettings));
    } catch {
      // ignore
    }
  }, [settingsKey, uiSettings]);

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  // Seleciona automaticamente primeiro grupo
  useEffect(() => {
    if (!groupId && groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupsList, groupId, setCurrentGroupId]);

  const selectedMonthRange = useMemo(() => {
    if (!selectedMonth) return null;
    const [yy, mm] = selectedMonth.split("-").map((n) => parseInt(n, 10));
    if (!yy || !mm) return null;
    const from = new Date(yy, mm - 1, 1);
    const to = new Date(yy, mm, 0, 23, 59, 59, 999);
    return { from, to };
  }, [selectedMonth]);

  const { data: expenses, isLoading, refetch, error: expensesError } = trpc.sharedExpenses.list.useQuery(
    {
      groupId: groupId!,
      from: selectedMonthRange?.from,
      to: selectedMonthRange?.to,
    },
    {
      enabled: !!groupId && isAuthenticated,
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (expensesError) toast.error(expensesError.message);
  }, [expensesError]);
  const detailQuery = trpc.sharedExpenses.getById.useQuery(
    { id: detailId! },
    { enabled: !!detailId && panel === "detail" }
  );


  const membersQuery = trpc.groups.getMembers.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const categoriesQuery = trpc.expenseCategories.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const categoryIconByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of (categoriesQuery.data || []) as any[]) {
      if (!c?.name) continue;
      map.set(String(c.name), String(c.icon || ""));
    }
    return map;
  }, [categoriesQuery.data]);

  const markSplitPaidMutation = trpc.sharedExpenses.markSplitPaid.useMutation({
    onSuccess: () => {
      toast.success("Cota marcada como quitada");
      detailQuery.refetch();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const templatesQuery = trpc.expenseTemplates.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const createMutation = trpc.sharedExpenses.create.useMutation({
    onSuccess: () => {
      toast.success("Despesa criada");
      setPanel(null);
      setTitle("");
      setAmount("");
      setCategory("");
      setAllowMemberEdits(false);
      setSplitMode("equal");
      setCustomSplits([]);
      setPaidBy("");
      setAttachmentFile(null);
      setAttachmentPreview(null);
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.sharedExpenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Despesa removida");
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.sharedExpenses.update.useMutation({
    onSuccess: () => { toast.success("Despesa atualizada"); setPanel(null); setEditing(null); refetch(); },
    onError: e => toast.error(e.message),
  });

  const permissionMutation = trpc.sharedExpenses.update.useMutation({
    onSuccess: () => {
      toast.success("Preferência atualizada");
      detailQuery.refetch();
      refetch();
    },
    onError: e => toast.error(e.message),
  });

  const validateMutation = trpc.sharedExpenses.validate.useMutation({
    onSuccess: () => { toast.success("Validada"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const createCategoryMutation = trpc.expenseCategories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada");
      categoriesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCategoryMutation = trpc.expenseCategories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada");
      categoriesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategoryMutation = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria removida");
      categoriesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const inviteMutation = trpc.invitations.create.useMutation({
    onSuccess: () => toast.success("Convite enviado"),
    onError: () => toast.error("Não foi possível enviar o convite"),
  });

  const updateFinancialMutation = trpc.groupMembers.updateFinancialProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil financeiro atualizado");
      membersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const createTemplateMutation = trpc.expenseTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Recorrente criada");
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTemplateMutation = trpc.expenseTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Recorrente atualizada");
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplateMutation = trpc.expenseTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Recorrente removida");
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const splits = useMemo(() => {
    if (!membersQuery.data || !amount) return [];
    const total = realsToCents(amount);
    if (!Number.isFinite(total) || total <= 0) return [];
    const each = Math.floor(total / membersQuery.data.length);
    // Distribui resto nos primeiros membros
    let remainder = total - each * membersQuery.data.length;
    return membersQuery.data.map(m => ({
      userId: m.user.id,
      amount: each + (remainder-- > 0 ? 1 : 0),
    }));
  }, [membersQuery.data, amount]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setAttachmentFile(file);
    setAttachmentRemoved(false);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setAttachmentRemoved(panel === "edit");
  };

  const handleCreate = async () => {
    if (!groupId) return;
    const amt = realsToCents(amount);
    if (!title.trim() || !amt) {
      toast.error("Título e valor são obrigatórios");
      return;
    }
    if (!splits.length) {
      toast.error("Não foi possível gerar splits");
      return;
    }

    const selectedFile = attachmentFile;

    try {
      setUploadingAttachment(Boolean(selectedFile));

      const created = await createMutation.mutateAsync({
        groupId,
        title,
        amount: amt,
        date: new Date(date + "T00:00:00"),
        currency: "BRL",
        category: category || undefined,
        allowMemberEdits,
        splitMode,
        customSplits: customSplits.length > 0 ? customSplits : undefined,
        paidBy: paidBy || undefined,
        // description omitida para evitar envio de undefined
        splits,
      });

      if (selectedFile) {
        const newUrl = await uploadExpenseAttachment(groupId, created.expenseId, selectedFile, user?.id || "");
        try {
          await updateMutation.mutateAsync({ id: created.expenseId, attachmentUrl: newUrl });
        } catch (e) {
          // Evita órfão caso o update falhe
          void deleteExpenseAttachment(newUrl);
          throw e;
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao salvar despesa");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDelete = (id: string, attachmentUrl?: string | null) => {
    if (!confirm("Remover despesa?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          if (attachmentUrl) {
            void deleteExpenseAttachment(attachmentUrl);
          }
        },
      }
    );
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setTitle(row.expense.title);
    setAmount(centsToRealsInput(row.expense.amount));
    setCategory(row.expense.category || "");
    setDate(new Date(row.expense.date).toISOString().substring(0,10));
    setAllowMemberEdits(Boolean(row.expense.allowMemberEdits));
    setAttachmentFile(null);
    setAttachmentRemoved(false);
    setAttachmentPreview(row.expense.attachmentUrl || null);
    setPanel("edit");
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const amt = realsToCents(amount);
    const oldAttachmentUrl: string | null | undefined = editing?.expense?.attachmentUrl;
    const payload: any = {
      id: editing.expense.id,
      title: title || undefined,
      amount: isNaN(amt) ? undefined : amt,
      category: category || undefined,
      date: new Date(date + "T00:00:00"),
    };
    if (editing.expense.createdBy === user?.id) {
      payload.allowMemberEdits = allowMemberEdits;
    }

    try {
      // Remove comprovante existente
      if (attachmentRemoved) {
        payload.attachmentUrl = null;
        await updateMutation.mutateAsync(payload);
        if (oldAttachmentUrl) {
          void deleteExpenseAttachment(oldAttachmentUrl);
        }
        setAttachmentRemoved(false);
        return;
      }

      // Substitui / adiciona comprovante
      if (attachmentFile && groupId) {
        setUploadingAttachment(true);
        const newUrl = await uploadExpenseAttachment(groupId, editing.expense.id, attachmentFile, user?.id || "");
        payload.attachmentUrl = newUrl;
        try {
          await updateMutation.mutateAsync(payload);
        } catch (e) {
          // Evita órfão caso o update falhe
          void deleteExpenseAttachment(newUrl);
          throw e;
        }
        if (oldAttachmentUrl && oldAttachmentUrl !== newUrl) {
          void deleteExpenseAttachment(oldAttachmentUrl);
        }
        return;
      }

      await updateMutation.mutateAsync(payload);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const openDetail = (row: any) => {
    setDetailId(row.expense.id);
    setPanel("detail");
  };

  const filteredExpenses = useMemo(() => {
    let list = expenses || [];

    // Filtro principal: mês selecionado
    if (selectedMonth) {
      const [yy, mm] = selectedMonth.split("-").map((n) => parseInt(n, 10));
      if (yy && mm) {
        const start = new Date(yy, mm - 1, 1);
        const end = new Date(yy, mm, 0, 23, 59, 59, 999);
        list = list.filter((e) => {
          const d = new Date(e.expense.date);
          return d >= start && d <= end;
        });
      }
    }

    if (filterText) list = list.filter(e => e.expense.title.toLowerCase().includes(filterText.toLowerCase()));
    if (filterCategory) list = list.filter(e => (e.expense.category || '').toLowerCase() === filterCategory.toLowerCase());
    if (filterStatus) list = list.filter(e => e.expense.status === filterStatus);
    if (filterStart) list = list.filter(e => new Date(e.expense.date) >= new Date(filterStart));
    if (filterEnd) list = list.filter(e => new Date(e.expense.date) <= new Date(filterEnd));
    return list;
  }, [expenses, selectedMonth, filterText, filterCategory, filterStatus, filterStart, filterEnd]);

  useEffect(() => {
    if (detailQuery.data) {
      setDetailAllowMemberEdits(Boolean(detailQuery.data.expense.allowMemberEdits));
    }
  }, [detailQuery.data]);

  const expensesList = useMemo(() => {
    const list = (filteredExpenses ?? []).slice();
    list.sort((a, b) => {
      const at = new Date(a.expense.date).getTime();
      const bt = new Date(b.expense.date).getTime();
      return sortOrder === "asc" ? at - bt : bt - at;
    });
    return list;
  }, [filteredExpenses, sortOrder]);
  const totalAmount = expensesList.reduce((sum, item) => sum + (item.expense.amount || 0), 0);
  const pendingCount = expensesList.filter((item) => item.expense.status === "pending").length;

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "";
    const [yy, mm] = selectedMonth.split("-").map((n) => parseInt(n, 10));
    if (!yy || !mm) return selectedMonth;
    const d = new Date(yy, mm - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  }, [selectedMonth]);

  const canUseIncomeSplit = useMemo(() => {
    return (membersQuery.data || []).some((m) => typeof (m.member as any)?.monthlyIncome === "number" && (m.member as any).monthlyIncome > 0);
  }, [membersQuery.data]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateAmount, setTemplateAmount] = useState("");
  const [templateFrequency, setTemplateFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [templateNextDue, setTemplateNextDue] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const usedCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of expensesList) {
      const name = String(row?.expense?.category || "").trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        icon: categoryIconByName.get(name) || undefined,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [expensesList, categoryIconByName]);

  const getInitials = (name?: string | null, email?: string | null) => {
    const base = (name || "").trim() || (email || "").split("@")[0] || "";
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
    return `${first}${last}`.toUpperCase();
  };

  const closeDetail = () => {
    setPanel(null);
    setDetailId(null);
  };

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().substring(0, 10));
    setAllowMemberEdits(uiSettings.defaultAllowMemberEdits);
    setSplitMode(uiSettings.defaultSplitMode);
    setCustomSplits([]);
    setPaidBy("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setPanel("create");
  };

  useEffect(() => {
    if (!location || !location.includes("create=1")) return;
    openCreate();
    const clean = (location.split("?")[0] || "/shared-expenses").split("#")[0] || "/shared-expenses";
    if (clean !== location) navigate(clean);
  }, [location]);

  useEffect(() => {
    if (!location || !location.includes("?")) return;
    const query = location.split("?")[1] || "";
    if (!query) return;
    const params = new URLSearchParams(query);
    const month = params.get("month");
    const categoryParam = params.get("category");

    let changed = false;
    if (month && /^\d{4}-\d{2}$/.test(month) && month !== selectedMonth) {
      setSelectedMonth(month);
      changed = true;
    }
    if (categoryParam) {
      const decoded = String(categoryParam);
      if (decoded !== filterCategory) {
        setFilterCategory(decoded);
        changed = true;
      }
    }
    if (changed) {
      setPanel(null);
    }

    if (params.has("month") || params.has("category")) {
      const clean = (location.split("?")[0] || "/shared-expenses").split("#")[0] || "/shared-expenses";
      if (clean !== location) navigate(clean);
    }
  }, [location]);

  useEffect(() => {
    if (!location || !location.includes("recurring=1")) return;
    setPanel("recurring");
    const clean = (location.split("?")[0] || "/shared-expenses").split("#")[0] || "/shared-expenses";
    if (clean !== location) navigate(clean);
  }, [location]);

  const showSharedCreateFab = Boolean(groupId) && panel === null;

  return (
    <div className="relative space-y-3 sm:space-y-4 animate-fade-in">
      {showSharedCreateFab ? (
        <BodyPortal>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="fixed bottom-[calc(5rem+var(--safe-area-bottom)+0.75rem)] right-4 z-[60] h-12 w-12 rounded-2xl p-0 shadow-md"
            aria-label="Adicionar despesa compartilhada"
            onClick={openCreate}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </BodyPortal>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup type="single" value="shared" className="w-full" variant="outline">
          <ToggleGroupItem
            value="shared"
            className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
          >
            Compartilhadas
          </ToggleGroupItem>
          <ToggleGroupItem
            value="personal"
            className="flex-1 rounded-xl"
            onClick={() => navigate("/personal-expenses")}
          >
            Pessoais
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-primary text-primary-foreground shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm/5 text-primary-foreground/85 truncate">
                {currentGroup ? `Despesas  ${currentGroup.name}` : "Despesas"}
              </p>
              <p className="font-display mt-1 text-2xl font-semibold tracking-tight leading-tight">Despesas</p>
              <p className="mt-1 text-xs text-primary-foreground/80 truncate">
                {monthLabel ? monthLabel : "Selecione um ms"}
                {currentGroup ? "  " + currentGroup.name : ""}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
              <p className="text-[11px] text-primary-foreground/75">Total do perodo</p>
              <p className="font-display tabular-nums mt-1 text-lg font-semibold tracking-tight">{formatCents(totalAmount)}</p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
              <p className="text-[11px] text-primary-foreground/75">Pendentes</p>
              <p className="font-display tabular-nums mt-1 text-lg font-semibold tracking-tight">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Topo limpo */}
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Select value={groupId || ""} onValueChange={(v) => setCurrentGroupId(v || null)}>
              <SelectTrigger className="h-9 rounded-2xl">
                <SelectValue placeholder="Selecionar grupo" />
              </SelectTrigger>
              <SelectContent>
                {groupsList.map((g) => (
                  <SelectItem key={g.group.id} value={g.group.id}>
                    {g.group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-[140px] rounded-2xl"
              aria-label="Selecionar mês"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">{currentGroup ? currentGroup.name : "Selecione um grupo"} • {monthLabel}</p>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" aria-label="Ordenar">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortOrder("desc")}>
                <span className="flex items-center gap-2">
                  {sortOrder === "desc" ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  Mais recentes
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("asc")}>
                <span className="flex items-center gap-2">
                  {sortOrder === "asc" ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  Mais antigas
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => setPanel("filters")} aria-label="Filtros">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => setPanel("settings")} aria-label="Configurações">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Faixa de resumo curta */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Itens</p>
            <p className="font-display tabular-nums mt-1 text-sm font-semibold tracking-tight">{expensesList.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="font-display tabular-nums mt-1 truncate text-sm font-semibold tracking-tight">{formatCents(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Pendentes</p>
            <p className="font-display tabular-nums mt-1 text-sm font-semibold tracking-tight">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chips compactos */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full gap-2" disabled={!groupId} onClick={() => setPanel("recurring")}> 
          <Repeat className="h-4 w-4" /> Recorrentes
        </Button>
        <Button size="sm" variant="outline" className="rounded-full gap-2" disabled={!groupId} onClick={() => setPanel("categories")}>
          <Tags className="h-4 w-4" /> Categorias
        </Button>
        {(uiSettings.mode === "advanced" || !isMobile) && (
          <Button size="sm" variant="outline" className="rounded-full gap-2" disabled={!groupId} onClick={() => setPanel("members")}> 
            <Users className="h-4 w-4" /> Membros
          </Button>
        )}
      </div>

      {/* Lista (o foco) */}
      {isLoading ? (
        <ExpenseListSkeleton />
      ) : expensesList.length === 0 ? (
        <Card className="rounded-2xl border border-border/60 bg-card/80">
          <CardContent className="p-4">
            <EmptyState
              title="Nenhuma despesa ainda"
              description="Toque no + para adicionar a primeira despesa do perodo."
              icon={<ReceiptText className="h-10 w-10" />}
              cta={
                <Button onClick={openCreate} disabled={!groupId} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar despesa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expensesList.map((e, idx) => {
            const isOwner = e.expense.createdBy === user?.id;
            const canEdit = isOwner || (!!e.expense.allowMemberEdits && !!user?.id);
            const isPaid = e.expense.status === "validated";
            const isPaidByMe = Boolean(user?.id) && String(e.expense.paidBy) === String(user?.id);
            const amountTone = !isPaid ? "text-muted-foreground" : isPaidByMe ? "text-success" : "text-foreground";
            const categoryName = String(e.expense.category || "Sem categoria").trim() || "Sem categoria";
            const categoryIcon = e.expense.category ? (categoryIconByName.get(e.expense.category) || undefined) : undefined;

            const dayKey = new Date(e.expense.date).toISOString().slice(0, 10);
            const prev = idx > 0 ? expensesList[idx - 1] : null;
            const prevDayKey = prev ? new Date(prev.expense.date).toISOString().slice(0, 10) : null;
            const showDayHeader = dayKey !== prevDayKey;

            return (
              <div key={e.expense.id} className="space-y-2">
                {showDayHeader ? (
                  <div className="pt-2">
                    <p className="px-1 text-xs font-semibold text-muted-foreground">
                      {new Date(e.expense.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(".", "")}
                    </p>
                  </div>
                ) : null}

                <Card className="interactive-card rounded-2xl border bg-card shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <CategoryIcon name={categoryName} icon={categoryIcon} size="sm" className="mt-0.5" />
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openDetail(e)}>
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{e.expense.title}</p>
                            {e.expense.attachmentUrl ? <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{new Date(e.expense.date).toLocaleDateString("pt-BR")}</span>
                            {e.expense.category ? <span className="text-[11px] text-muted-foreground">{e.expense.category}</span> : null}
                            <Badge
                              variant="outline"
                              className={`rounded-full text-[11px] border ${
                                isPaid
                                  ? "bg-success/15 text-success border-success/25"
                                  : "bg-warning/15 text-warning border-warning/25"
                              }`}
                            >
                              {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {isPaid ? "Paga" : "Pendente"}
                            </Badge>
                          </div>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-display tabular-nums text-sm font-semibold tracking-tight ${amountTone}`}>{formatCents(e.expense.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">valor</p>
                        </div>
                        {isMobile ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-2xl"
                            aria-label="Mais opções"
                            onClick={() => {
                              setActionsExpense({ e, canEdit, isOwner });
                              setActionsOpen(true);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" aria-label="Mais opções">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => startEdit(e)}>
                                  <span className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Editar</span>
                                </DropdownMenuItem>
                              )}
                              {e.expense.status === "pending" && (
                                <DropdownMenuItem onClick={() => validateMutation.mutate({ id: e.expense.id })}>
                                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Marcar paga</span>
                                </DropdownMenuItem>
                              )}
                              {isOwner && (
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(e.expense.id, e.expense.attachmentUrl)}>
                                  <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ações da despesa</DrawerTitle>
            <DrawerDescription className="text-base">
              {actionsExpense?.e?.expense?.title ? actionsExpense.e.expense.title : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <div className="grid gap-2">
              {actionsExpense?.canEdit ? (
                <Button
                  className="justify-start gap-2 rounded-2xl"
                  onClick={() => {
                    setActionsOpen(false);
                    if (!actionsExpense?.e) return;
                    startEdit(actionsExpense.e);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              ) : null}

              {actionsExpense?.e?.expense?.status === "pending" ? (
                <Button
                  variant="secondary"
                  className="justify-start gap-2 rounded-2xl"
                  onClick={() => {
                    setActionsOpen(false);
                    const id = actionsExpense?.e?.expense?.id;
                    if (!id) return;
                    validateMutation.mutate({ id });
                  }}
                  disabled={validateMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Marcar como paga
                </Button>
              ) : null}

              {actionsExpense?.isOwner ? (
                <Button
                  variant="destructive"
                  className="justify-start gap-2 rounded-2xl"
                  onClick={() => {
                    setActionsOpen(false);
                    const id = actionsExpense?.e?.expense?.id;
                    if (!id) return;
                    handleDelete(id, actionsExpense?.e?.expense?.attachmentUrl);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              ) : null}
            </div>
          </div>

          <DrawerFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setActionsOpen(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Filtros/Busca */}
      <Drawer open={panel === "filters"} onOpenChange={(open) => setPanel(open ? "filters" : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Buscar e filtrar</DrawerTitle>
            <DrawerDescription>Deixe a lista enxuta sem perder controle.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Buscar</Label>
              <Input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Título" className="rounded-2xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={filterCategory || "all"} onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(categoriesQuery.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.name}>
                      <CategoryOption name={c.name} icon={c.icon || undefined} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="validated">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uiSettings.mode === "advanced" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Início</Label>
                  <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="rounded-2xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fim</Label>
                  <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="rounded-2xl" />
                </div>
              </div>
            )}
          </div>
          <DrawerFooter>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setFilterText("");
                setFilterCategory("");
                setFilterStatus("");
                setFilterStart("");
                setFilterEnd("");
              }}
            >
              Limpar
            </Button>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Config */}
      <Drawer open={panel === "settings"} onOpenChange={(open) => setPanel(open ? "settings" : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Configurações</DrawerTitle>
            <DrawerDescription>Preferências da lista.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Modo avançado</p>
                <p className="text-xs text-muted-foreground">Mostra mais chips e opções.</p>
              </div>
              <Switch
                checked={uiSettings.mode === "advanced"}
                onCheckedChange={(checked) => setUiSettings((s) => ({ ...s, mode: checked ? "advanced" : "simple" }))}
              />
            </div>

            <div className="grid gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Divisão padrão</Label>
                <Select
                  value={uiSettings.defaultSplitMode}
                  onValueChange={(v) => setUiSettings((s) => ({ ...s, defaultSplitMode: v as SplitMode }))}
                >
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Igual</SelectItem>
                    <SelectItem value="fixed">Valor fixo</SelectItem>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    {canUseIncomeSplit ? <SelectItem value="proportional">Por renda</SelectItem> : null}
                    <SelectItem value="single">Uma pessoa paga tudo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">Permitir membros editar (padrão)</p>
                  <p className="text-xs text-muted-foreground">Aplicado ao criar nova despesa.</p>
                </div>
                <Switch
                  checked={uiSettings.defaultAllowMemberEdits}
                  onCheckedChange={(checked) => setUiSettings((s) => ({ ...s, defaultAllowMemberEdits: checked }))}
                />
              </div>

              {!canUseIncomeSplit && (
                <Button variant="outline" className="rounded-2xl" onClick={() => setPanel("members")}>
                  Definir renda dos membros
                </Button>
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Categorias */}
      <Drawer open={panel === "categories"} onOpenChange={(open) => setPanel(open ? "categories" : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Categorias</DrawerTitle>
            <DrawerDescription>Veja categorias usadas e gerencie o grupo.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            {usedCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Categorias nas despesas</p>
                <div className="grid grid-cols-2 gap-2">
                  {usedCategories.map((c) => (
                    <div key={c.name} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.icon ? `${c.icon} ` : ""}{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.count} item(ns)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {(categoriesQuery.data || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.icon ? `${c.icon} ` : ""}{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">Editar no lápis.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-2xl"
                      onClick={() => {
                        const name = prompt("Novo nome da categoria", c.name);
                        if (!name) return;
                        updateCategoryMutation.mutate({ id: c.id, name: name.trim() });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-9 w-9 rounded-2xl"
                      onClick={() => {
                        if (!confirm("Remover categoria?")) return;
                        deleteCategoryMutation.mutate({ id: c.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Criar nova</p>
              <div className="grid grid-cols-3 gap-2">
                <Input value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} placeholder="😀" className="rounded-2xl" />
                <div className="col-span-2">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome" className="rounded-2xl" />
                </div>
              </div>
              <Button
                className="rounded-2xl"
                disabled={!groupId || !newCategoryName.trim() || createCategoryMutation.isPending}
                onClick={() => {
                  if (!groupId) return;
                  createCategoryMutation.mutate({ groupId, name: newCategoryName.trim(), icon: newCategoryIcon.trim() || undefined });
                  setNewCategoryName("");
                  setNewCategoryIcon("");
                }}
              >
                {createCategoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                + Nova categoria
              </Button>
            </div>
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Membros */}
      <Drawer open={panel === "members"} onOpenChange={(open) => setPanel(open ? "members" : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Membros</DrawerTitle>
            <DrawerDescription>Convites e renda.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Convidar por e-mail</Label>
              <div className="flex gap-2">
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" className="rounded-2xl" />
                <Button
                  className="rounded-2xl"
                  disabled={!groupId || !inviteEmail.trim() || inviteMutation.isPending}
                  onClick={() => {
                    if (!groupId) return;
                    inviteMutation.mutate({ groupId, invitedEmail: inviteEmail.trim() });
                    setInviteEmail("");
                  }}
                >
                  Enviar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {(membersQuery.data || []).map((m: any) => {
                const currentIncomeCents = (m.member as any)?.monthlyIncome as number | undefined;
                const currentIncomeInput = typeof currentIncomeCents === "number" ? centsToRealsInput(currentIncomeCents) : "";
                return (
                  <div key={m.user.id} className="rounded-2xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{userLabel(m.user, user || undefined)}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.user.email || ""}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full">{m.member.role}</Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 items-end">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Renda mensal (R$)</Label>
                        <Input
                          defaultValue={currentIncomeInput}
                          inputMode="decimal"
                          className="rounded-2xl"
                          placeholder="Ex: 2500,00"
                          onBlur={(e) => {
                            if (!groupId) return;
                            const cents = realsToCents(e.target.value || "");
                            if (!Number.isFinite(cents) || cents < 0) return;
                            updateFinancialMutation.mutate({ groupId, userId: m.user.id, monthlyIncome: cents });
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        disabled={!groupId || updateFinancialMutation.isPending}
                        onClick={() => {
                          if (!groupId) return;
                          updateFinancialMutation.mutate({ groupId, userId: m.user.id, incomeVisible: true });
                        }}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Recorrentes */}
      <Drawer open={panel === "recurring"} onOpenChange={(open) => setPanel(open ? "recurring" : null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Recorrentes</DrawerTitle>
            <DrawerDescription>Crie, edite e ative/desative recorrentes.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">{editingTemplateId ? "Editar recorrente" : "Nova recorrente"}</Label>
              <Input value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Título" className="rounded-2xl" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={templateAmount} onChange={(e) => setTemplateAmount(e.target.value)} placeholder="Valor (R$)" inputMode="decimal" className="rounded-2xl" />
                <Select value={templateFrequency} onValueChange={(v) => setTemplateFrequency(v as any)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="date" value={templateNextDue} onChange={(e) => setTemplateNextDue(e.target.value)} className="rounded-2xl" />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="rounded-2xl"
                  disabled={!groupId || !user?.id || !templateTitle.trim() || !templateAmount.trim() || createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  onClick={() => {
                    if (!groupId || !user?.id) return;
                    const amt = realsToCents(templateAmount);
                    if (!Number.isFinite(amt) || amt <= 0) {
                      toast.error("Informe um valor válido");
                      return;
                    }

                    if (editingTemplateId) {
                      updateTemplateMutation.mutate({
                        id: editingTemplateId,
                        title: templateTitle.trim(),
                        amount: amt,
                        frequency: templateFrequency,
                        nextDueDate: new Date(templateNextDue + "T00:00:00"),
                      } as any);
                    } else {
                      createTemplateMutation.mutate({
                        groupId,
                        title: templateTitle.trim(),
                        amount: amt,
                        currency: "BRL",
                        category: undefined,
                        paidBy: user.id,
                        splitMode: uiSettings.defaultSplitMode,
                        frequency: templateFrequency,
                        nextDueDate: new Date(templateNextDue + "T00:00:00"),
                      });
                    }

                    setEditingTemplateId(null);
                    setTemplateTitle("");
                    setTemplateAmount("");
                    setTemplateFrequency("monthly");
                    setTemplateNextDue(new Date().toISOString().substring(0, 10));
                  }}
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingTemplateId ? "Salvar" : "+ Criar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  disabled={!editingTemplateId}
                  onClick={() => {
                    setEditingTemplateId(null);
                    setTemplateTitle("");
                    setTemplateAmount("");
                    setTemplateFrequency("monthly");
                    setTemplateNextDue(new Date().toISOString().substring(0, 10));
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {(templatesQuery.data || []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatCents(t.amount)} • {t.frequency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-2xl"
                      onClick={() => {
                        setEditingTemplateId(String(t.id));
                        setTemplateTitle(String(t.title || ""));
                        setTemplateAmount(centsToRealsInput(Number(t.amount || 0)));
                        setTemplateFrequency((t.frequency || "monthly") as any);
                        const dueRaw = (t as any).nextDueDate;
                        const due = dueRaw ? new Date(dueRaw) : null;
                        setTemplateNextDue(due && Number.isFinite(due.getTime()) ? due.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
                      }}
                      aria-label="Editar recorrente"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={!!t.isActive}
                      onCheckedChange={(checked) => updateTemplateMutation.mutate({ id: t.id, isActive: checked })}
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-9 w-9 rounded-2xl"
                      onClick={() => {
                        if (!confirm("Remover recorrente?")) return;
                        deleteTemplateMutation.mutate({ id: t.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Criar/Editar */}
      <Drawer
        open={panel === "create" || panel === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            setPanel(null);
            setEditing(null);
          }
        }}
      >
        <DrawerContent className="min-h-0 overflow-hidden">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>{panel === "edit" ? "Editar despesa" : "Adicionar despesa"}</DrawerTitle>
            <DrawerDescription>{panel === "edit" ? "Atualize os campos e salve." : "Preencha o básico; o resto fica escondido."}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3 flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 25,99" inputMode="decimal" className="rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mercado" className="rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={category || "none"} onValueChange={(v) => setCategory(v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Sem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem</SelectItem>
                    {(categoriesQuery.data || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>
                        <CategoryOption name={c.name} icon={c.icon || undefined} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl" />
              </div>
            </div>

            <Accordion type="single" collapsible defaultValue={uiSettings.mode === "advanced" ? "more" : undefined}>
              <AccordionItem value="more" className="border-none">
                <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-semibold">Mais opções</span>
                    <span className="text-xs text-muted-foreground">Divisão, quem pagou, anexo</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pago por</Label>
                    <Select value={paidBy || "me"} onValueChange={(v) => setPaidBy(v === "me" ? "" : v)}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="me">Eu</SelectItem>
                        {(membersQuery.data || []).map((m: any) => (
                          <SelectItem key={m.user.id} value={m.user.id}>{userLabel(m.user, user || undefined)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                    <div>
                      <Label className="text-xs">Permitir edição</Label>
                      <p className="text-[11px] text-muted-foreground">Membros podem colaborar</p>
                    </div>
                    <Switch checked={allowMemberEdits} onCheckedChange={setAllowMemberEdits} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Divisão</Label>
                    <Select value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Igual</SelectItem>
                        <SelectItem value="fixed">Valor fixo</SelectItem>
                        <SelectItem value="percentage">Percentual</SelectItem>
                        {canUseIncomeSplit ? <SelectItem value="proportional">Por renda</SelectItem> : null}
                        <SelectItem value="single">Uma pessoa paga tudo</SelectItem>
                      </SelectContent>
                    </Select>

                    {!canUseIncomeSplit && splitMode === "proportional" ? (
                      <Button variant="outline" className="rounded-2xl" onClick={() => setPanel("members")}>
                        Definir renda dos membros
                      </Button>
                    ) : null}
                  </div>

                  <SplitCalculator
                    members={membersQuery.data || []}
                    totalAmount={realsToCents(amount) || 0}
                    splitMode={splitMode}
                    customSplits={customSplits}
                    onSplitModeChange={setSplitMode}
                    onCustomSplitsChange={setCustomSplits}
                    paidBy={paidBy}
                    onPaidByChange={setPaidBy}
                  />

                  {/* Anexo */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5" />
                      Comprovante (opcional)
                    </Label>
                    {attachmentPreview ? (
                      <div className="relative rounded-2xl border border-border overflow-hidden">
                        <img src={attachmentPreview} alt="Preview" className="w-full h-48 object-cover" />
                        <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-8 w-8" onClick={handleRemoveAttachment}>
                          <X className="h-4 w-4" />
                        </Button>
                        {panel === "edit" && !attachmentFile && !attachmentRemoved ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="absolute bottom-2 right-2 h-8 rounded-full"
                            onClick={() => window.open(attachmentPreview, "_blank")}
                          >
                            Abrir
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <input type="file" id="attachment-input" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        <Button type="button" variant="outline" className="w-full h-24 border-dashed rounded-2xl" onClick={() => document.getElementById("attachment-input")?.click()}>
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-xs">Adicionar foto</span>
                            <span className="text-[10px]">JPG, PNG ou WebP (máx 10MB)</span>
                          </div>
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <DrawerFooter className="mt-0 shrink-0">
            <Button variant="outline" className="rounded-2xl" onClick={() => setPanel(null)}>Cancelar</Button>
            {panel === "edit" ? (
              <Button className="rounded-2xl" onClick={handleUpdate} disabled={updateMutation.isPending || uploadingAttachment}>
                {(updateMutation.isPending || uploadingAttachment) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            ) : (
              <Button className="rounded-2xl" onClick={handleCreate} disabled={createMutation.isPending || uploadingAttachment}>
                {(createMutation.isPending || uploadingAttachment) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {uploadingAttachment ? "Enviando..." : "Criar"}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Drawer: Detalhes */}
      <Drawer
        open={panel === "detail"}
        onOpenChange={(open) => {
          if (!open) {
            closeDetail();
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <DrawerTitle>Detalhes</DrawerTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={closeDetail} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-2">
            {detailQuery.isLoading ? (
              <ExpenseDetailSkeleton />
            ) : detailQuery.data ? (
              (() => {
                const expense = detailQuery.data.expense as any;
                const splits = (detailQuery.data.splits as any[]) || [];
                const isOwner = expense.createdBy === user?.id;
                const canEdit = isOwner || (!!expense.allowMemberEdits && !!user?.id);
                const isPaid = expense.status === "validated";

                const payerUser = splits.find((s) => String(s?.split?.userId) === String(expense.paidBy))?.user;
                const payerLabel = payerUser ? userLabel(payerUser, user || undefined) : "—";

                return (
                  <div className="space-y-4">
                    <Card className="rounded-2xl border bg-card shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{expense.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString("pt-BR")}</span>
                              {expense.category ? <span className="text-xs text-muted-foreground">{expense.category}</span> : null}
                              <Badge
                                variant="outline"
                                className={`rounded-full text-[11px] border ${
                                  isPaid
                                    ? "bg-success/15 text-success border-success/25"
                                    : "bg-warning/15 text-warning border-warning/25"
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {isPaid ? "Liquidada" : "Pendente"}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-display tabular-nums text-lg font-semibold leading-none tracking-tight">{formatCents(expense.amount)}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">total</p>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {canEdit ? (
                            <Button
                              variant="outline"
                              className="rounded-2xl justify-start gap-2"
                              onClick={() => {
                                startEdit({ expense });
                                closeDetail();
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                          ) : null}

                          {!isPaid ? (
                            <Button
                              className="rounded-2xl justify-start gap-2"
                              onClick={() => validateMutation.mutate({ id: expense.id })}
                              disabled={validateMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Marcar paga
                            </Button>
                          ) : null}

                          {isOwner ? (
                            <Button
                              variant="destructive"
                              className="rounded-2xl justify-start gap-2"
                              onClick={() => handleDelete(expense.id, expense.attachmentUrl)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border bg-card shadow-sm">
                      <CardContent className="p-3">
                        <p className="text-sm font-semibold">Pagador</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{payerLabel}</p>
                            <p className="text-xs text-muted-foreground">Quem desembolsou</p>
                          </div>
                          <div className="text-right">
                            <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{formatCents(expense.amount)}</p>
                            <p className="text-[11px] text-muted-foreground">valor</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border bg-card shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Divisão</p>
                          <p className="text-xs text-muted-foreground">
                            {isPaid
                              ? "Quitado por todos"
                              : `${splits.filter((s) => Boolean(s?.split?.paid)).length} de ${splits.length} quitadas`}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {splits.map((s: any) => {
                            const u = s.user;
                            const paid = Boolean(s?.split?.paid) || isPaid;
                            const label = userLabel(u, user || undefined);
                            const canMarkThisSplit = !paid && (s?.split?.userId === user?.id || isOwner);
                            return (
                              <div key={s.split.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-8 w-8">
                                    {(u as any)?.avatarUrl ? <AvatarImage src={(u as any).avatarUrl} alt={label} /> : null}
                                    <AvatarFallback className="text-[11px]">{getInitials(u?.name, u?.email)}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{label}</p>
                                    <div className="flex items-center gap-1">
                                      {paid ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-success">
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Quitou
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                                          <Clock className="h-3.5 w-3.5" /> Deve
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="font-display tabular-nums text-sm font-semibold tracking-tight">{formatCents(s.split.amount)}</p>
                                  <p className="text-[11px] text-muted-foreground">cota</p>
                                  {canMarkThisSplit ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 h-8 rounded-xl px-2"
                                      onClick={() => markSplitPaidMutation.mutate({ splitId: s.split.id })}
                                      disabled={markSplitPaidMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Marcar quitado
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                      <div>
                        <p className="text-sm font-medium">Edição por membros</p>
                        <p className="text-xs text-muted-foreground">Permitir que outros editem.</p>
                      </div>
                      {isOwner ? (
                        <Switch
                          checked={detailAllowMemberEdits}
                          disabled={permissionMutation.isPending}
                          onCheckedChange={(next) => {
                            const previous = detailAllowMemberEdits;
                            setDetailAllowMemberEdits(next);
                            if (!detailId) return;
                            permissionMutation.mutate({ id: detailId, allowMemberEdits: next }, { onError: () => setDetailAllowMemberEdits(previous) });
                          }}
                        />
                      ) : (
                        <span className="text-xs font-semibold">{detailAllowMemberEdits ? "Liberada" : "Restrita"}</span>
                      )}
                    </div>

                    {expense.attachmentUrl ? (
                      <Card className="rounded-2xl border bg-card shadow-sm">
                        <CardContent className="p-3 space-y-2">
                          <Label className="text-xs flex items-center gap-2"><Paperclip className="h-3.5 w-3.5" /> Comprovante</Label>
                          <div className="rounded-2xl border overflow-hidden">
                            <img src={expense.attachmentUrl} alt="Comprovante" className="w-full max-h-72 object-contain bg-muted" />
                          </div>
                          <Button variant="outline" className="rounded-2xl" onClick={() => window.open(expense.attachmentUrl, "_blank")}>
                            <ImageIcon className="h-4 w-4 mr-2" /> Abrir
                          </Button>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              <p className="text-muted-foreground text-sm">Sem dados</p>
            )}
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={closeDetail}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
