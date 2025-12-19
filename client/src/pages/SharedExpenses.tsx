import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SplitCalculator } from "@/components/SplitCalculator";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { uploadExpenseAttachment, validateImageFile } from "@/lib/storage";
import { realsToCents, centsToRealsInput } from "@/lib/currency";
import {
  CheckCircle2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Paperclip,
  X,
  Image as ImageIcon,
  Search,
  SlidersHorizontal,
  Settings,
  Users,
  Tags,
  Repeat,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { toast } from "sonner";
import { formatCents, userLabel } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
import { useLocation } from "wouter";
type SplitMode = "equal" | "fixed" | "percentage" | "proportional" | "single";
type CustomSplit = { userId: string; value: number };

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
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<Panel>(null);
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
  // filtros
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  // edição
  const [editing, setEditing] = useState<any | null>(null);
  // detalhes
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailAllowMemberEdits, setDetailAllowMemberEdits] = useState(false);
  const isMobile = useIsMobile();

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

  const { data: expenses, isLoading, refetch } = trpc.sharedExpenses.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );
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
    onError: (e) => toast.error(e.message),
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

    try {
      let attachmentUrl: string | undefined;
      
      // Upload de anexo se houver
      if (attachmentFile && groupId) {
        setUploadingAttachment(true);
        const tempId = `temp_${Date.now()}`; // ID temporário até criar despesa
        attachmentUrl = await uploadExpenseAttachment(groupId, tempId, attachmentFile, user?.id || "");
      }

      createMutation.mutate({
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
        attachmentUrl,
        // description omitida para evitar envio de undefined
        splits,
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload do anexo");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover despesa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setTitle(row.expense.title);
    setAmount(centsToRealsInput(row.expense.amount));
    setCategory(row.expense.category || "");
    setDate(new Date(row.expense.date).toISOString().substring(0,10));
    setAllowMemberEdits(Boolean(row.expense.allowMemberEdits));
    setPanel("edit");
  };

  const handleUpdate = () => {
    if (!editing) return;
    const amt = realsToCents(amount);
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
    updateMutation.mutate(payload);
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

  const expensesList = filteredExpenses ?? [];
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

  return (
    <div className="relative space-y-3 sm:space-y-4 animate-fade-in">
      {/* Topo limpo */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Select value={groupId ?? undefined} onValueChange={(v) => setCurrentGroupId(v)}>
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
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => setPanel("filters")} aria-label="Buscar">
            <Search className="h-4 w-4" />
          </Button>
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
            <p className="text-[11px] text-muted-foreground">Total do mês</p>
            <p className="mt-1 truncate text-sm font-semibold">{formatCents(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-sm font-semibold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">Itens</p>
            <p className="mt-1 text-sm font-semibold">{expensesList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chips compactos */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full gap-2" disabled={!groupId} onClick={() => {
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
        }}>
          <Plus className="h-4 w-4" /> + Despesa
        </Button>

        {(uiSettings.mode === "advanced" || !isMobile) && (
          <Button size="sm" variant="outline" className="rounded-full gap-2" disabled={!groupId} onClick={() => setPanel("recurring")}> 
            <Repeat className="h-4 w-4" /> Recorrentes
          </Button>
        )}
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
        <div className="flex items-center justify-center py-10"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : expensesList.length === 0 ? (
        <Card className="rounded-3xl border border-border/60 bg-card/80">
          <CardContent className="p-6">
            <EmptyState
              title="Nenhuma despesa neste mês"
              description="Use o botão + para adicionar a primeira despesa do período."
              cta={
                <Button onClick={() => setPanel("create")} disabled={!groupId} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar despesa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expensesList.map((e) => {
            const isOwner = e.expense.createdBy === user?.id;
            const canEdit = isOwner || (!!e.expense.allowMemberEdits && !!user?.id);
            return (
              <Card key={e.expense.id} className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openDetail(e)}>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{e.expense.title}</p>
                        {e.expense.attachmentUrl ? <Paperclip className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{new Date(e.expense.date).toLocaleDateString("pt-BR")}</span>
                        {e.expense.category ? <span className="text-[11px] text-muted-foreground">{e.expense.category}</span> : null}
                        <Badge variant={e.expense.status === "validated" ? "secondary" : "outline"} className="rounded-full text-[11px]">
                          {e.expense.status === "validated" ? "Paga" : "Pendente"}
                        </Badge>
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCents(e.expense.amount)}</p>
                        <p className="text-[11px] text-muted-foreground">valor</p>
                      </div>
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
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(e.expense.id)}>
                              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <Button
        className="fixed bottom-20 right-4 h-12 w-12 rounded-full p-0 shadow-sm"
        onClick={() => {
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
        }}
        disabled={!groupId}
        aria-label="Adicionar despesa"
      >
        <Plus className="h-5 w-5" />
      </Button>

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
                    <SelectItem key={c.id} value={c.name}>{c.icon ? `${c.icon} ` : ""}{c.name}</SelectItem>
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
            <DrawerDescription>Modo simples para leigos, avançado para power users.</DrawerDescription>
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
            <DrawerDescription>Crie e edite categorias sem sair da tela.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
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

            <div className="space-y-2">
              {(categoriesQuery.data || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.icon ? `${c.icon} ` : ""}{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.id}</p>
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
            <DrawerDescription>Convites e renda (para divisão por renda).</DrawerDescription>
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
            <DrawerDescription>Cadastre despesas que se repetem.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Nova recorrente</Label>
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
              <Button
                className="rounded-2xl"
                disabled={!groupId || !templateTitle.trim() || !templateAmount.trim() || createTemplateMutation.isPending}
                onClick={() => {
                  if (!groupId || !user?.id) return;
                  const amt = realsToCents(templateAmount);
                  if (!amt || amt <= 0) {
                    toast.error("Informe um valor válido");
                    return;
                  }
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
                  setTemplateTitle("");
                  setTemplateAmount("");
                }}
              >
                {createTemplateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                + Criar
              </Button>
            </div>

            <div className="space-y-2">
              {(templatesQuery.data || []).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatCents(t.amount)} • {t.frequency}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{panel === "edit" ? "Editar despesa" : "Adicionar despesa"}</DrawerTitle>
            <DrawerDescription>{panel === "edit" ? "Atualize os campos e salve." : "Preencha o básico; o resto fica escondido."}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-3">
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
                      <SelectItem key={c.id} value={c.name}>{c.icon ? `${c.icon} ` : ""}{c.name}</SelectItem>
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
          <DrawerFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setPanel(null)}>Cancelar</Button>
            {panel === "edit" ? (
              <Button className="rounded-2xl" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
            setPanel(null);
            setDetailId(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Detalhes</DrawerTitle>
            <DrawerDescription>Valores, splits e comprovante.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            {detailQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : detailQuery.data ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between"><span>Título</span><span className="font-medium">{detailQuery.data.expense.title}</span></div>
                  <div className="flex justify-between"><span>Valor</span><span className="font-medium">{formatCents(detailQuery.data.expense.amount)}</span></div>
                  <div className="flex justify-between"><span>Categoria</span><span className="font-medium">{detailQuery.data.expense.category || "Sem"}</span></div>
                  <div className="flex justify-between"><span>Data</span><span className="font-medium">{new Date(detailQuery.data.expense.date).toLocaleDateString("pt-BR")}</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="font-medium">{detailQuery.data.expense.status === "validated" ? "Paga" : "Pendente"}</span></div>
                </div>

                {detailQuery.data.expense.attachmentUrl ? (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-2"><Paperclip className="h-3.5 w-3.5" /> Comprovante</Label>
                    <div className="rounded-2xl border overflow-hidden">
                      <img src={detailQuery.data.expense.attachmentUrl} alt="Comprovante" className="w-full max-h-72 object-contain bg-muted" />
                    </div>
                    <Button variant="outline" className="rounded-2xl" onClick={() => window.open(detailQuery.data.expense.attachmentUrl, "_blank")}>
                      <ImageIcon className="h-4 w-4 mr-2" /> Abrir em tela cheia
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">Edição por membros</p>
                    <p className="text-xs text-muted-foreground">Permite que outros editem.</p>
                  </div>
                  {detailQuery.data.expense.createdBy === user?.id ? (
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

                <Card className="rounded-2xl">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-semibold">Splits</p>
                    {detailQuery.data.splits.map((s: any) => (
                      <div key={s.split.id} className="flex justify-between text-xs">
                        <span>{userLabel(s.user, user || undefined)}</span>
                        <span className="font-medium">{formatCents(s.split.amount)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {detailQuery.data.expense.status === "pending" ? (
                  <Button className="rounded-2xl gap-2" onClick={() => validateMutation.mutate({ id: detailQuery.data.expense.id })}>
                    <CheckCircle2 className="h-4 w-4" /> Marcar paga
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Sem dados</p>
            )}
          </div>
          <DrawerFooter>
            <Button className="rounded-2xl" onClick={() => setPanel(null)}>Fechar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
