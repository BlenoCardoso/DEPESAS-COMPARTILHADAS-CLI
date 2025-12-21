import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { formatCents } from "@/lib/utils";
import { Calendar, Clock, Edit2, Loader2, Plus, Repeat, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type SplitMode = "equal" | "fixed" | "percentage" | "proportional" | "single";
type Frequency = "weekly" | "monthly" | "yearly";

export default function ExpenseTemplates() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfYear, setDayOfYear] = useState("01-01");
  const [isActive, setIsActive] = useState(true);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  const templatesQuery = trpc.expenseTemplates.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const createMutation = trpc.expenseTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template criado");
      resetForm();
      setIsCreateOpen(false);
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.expenseTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado");
      setIsEditOpen(false);
      setEditingTemplate(null);
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.expenseTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template removido");
      templatesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!groupId && groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupsList, groupId, setCurrentGroupId]);

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("");
    setFrequency("monthly");
    setDayOfWeek("1");
    setDayOfMonth("1");
    setDayOfYear("01-01");
    setIsActive(true);
    setSplitMode("equal");
  };

  const handleCreate = () => {
    if (!groupId || !title || !amount) {
      toast.error("Preencha título e valor");
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents <= 0) {
      toast.error("Valor inválido");
      return;
    }

    // Calcular próxima data de vencimento
    const now = new Date();
    let nextDueDate = new Date();

    if (frequency === "weekly") {
      const targetDay = parseInt(dayOfWeek);
      nextDueDate.setDate(now.getDate() + ((targetDay - now.getDay() + 7) % 7));
    } else if (frequency === "monthly") {
      const targetDay = parseInt(dayOfMonth);
      nextDueDate.setDate(targetDay);
      if (nextDueDate < now) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
    } else if (frequency === "yearly") {
      const [month, day] = dayOfYear.split("-").map(Number);
      nextDueDate = new Date(now.getFullYear(), month - 1, day);
      if (nextDueDate < now) {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      }
    }

    const [yearMonth, yearDay] = frequency === "yearly" 
      ? dayOfYear.split("-").map(Number) 
      : [undefined, undefined];

    createMutation.mutate({
      groupId,
      title,
      amount: amountInCents,
      category: category || undefined,
      frequency,
      dayOfWeek: frequency === "weekly" ? parseInt(dayOfWeek) : undefined,
      dayOfMonth: frequency === "monthly" ? parseInt(dayOfMonth) : (frequency === "yearly" ? yearDay : undefined),
      monthOfYear: frequency === "yearly" ? yearMonth : undefined,
      splitMode,
      paidBy: user?.id || "",
      nextDueDate,
    });
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setIsEditOpen(true);
  };

  const handleToggleActive = (template: any) => {
    updateMutation.mutate({
      id: template.id,
      isActive: !template.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover este template?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return labels[freq] || freq;
  };

  const getDayLabel = (template: any) => {
    if (template.frequency === "weekly") {
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return `Toda ${days[template.dayOfWeek || 0]}`;
    }
    if (template.frequency === "monthly") {
      return `Todo dia ${template.dayOfMonth}`;
    }
    if (template.frequency === "yearly") {
      const [month, day] = (template.dayOfYear || "01-01").split("-");
      return `Todo ${day}/${month}`;
    }
    return "";
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Despesas Recorrentes</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie templates de despesas que se repetem
        </p>
      </div>

      <PageContainer className="space-y-4">
        {/* Seletor de grupo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grupo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={groupId ?? undefined} onValueChange={(v) => setCurrentGroupId(v)}>
              <SelectTrigger className="w-full">
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
          </CardContent>
        </Card>

        {groupId && (
          <>
            {/* Botão Criar Template */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Template Recorrente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base">Nova Despesa Recorrente</DialogTitle>
                  <DialogDescription className="text-xs">
                    Crie um template para despesas que se repetem
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Internet"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex: 99.00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoria</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex: Contas Fixas"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={frequency} onValueChange={(v: Frequency) => setFrequency(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {frequency === "weekly" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dia da Semana</Label>
                      <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Domingo</SelectItem>
                          <SelectItem value="1">Segunda</SelectItem>
                          <SelectItem value="2">Terça</SelectItem>
                          <SelectItem value="3">Quarta</SelectItem>
                          <SelectItem value="4">Quinta</SelectItem>
                          <SelectItem value="5">Sexta</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {frequency === "monthly" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dia do Mês (1-31)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}

                  {frequency === "yearly" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Anual (MM-DD)</Label>
                      <Input
                        placeholder="01-15"
                        value={dayOfYear}
                        onChange={(e) => setDayOfYear(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">Modo de Divisão</Label>
                    <Select value={splitMode} onValueChange={(v: SplitMode) => setSplitMode(v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Igual</SelectItem>
                        <SelectItem value="single">Só eu</SelectItem>
                        <SelectItem value="fixed">Valor Fixo</SelectItem>
                        <SelectItem value="percentage">Porcentagem</SelectItem>
                        <SelectItem value="proportional">Proporcional à Renda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border p-2">
                    <div>
                      <Label className="text-xs font-medium">Template Ativo</Label>
                      <p className="text-[10px] text-muted-foreground">Gerar despesas automaticamente</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="h-9">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="h-9"
                  >
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Lista de Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Templates Configurados
                </CardTitle>
                <CardDescription className="text-xs">
                  {templatesQuery.data?.length || 0} template(s) cadastrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !templatesQuery.data || templatesQuery.data.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Nenhum template criado</p>
                    <p className="text-sm text-muted-foreground">Crie templates para despesas que se repetem</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templatesQuery.data.map((template: any, idx: number) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm truncate">{template.title}</p>
                                  <Badge variant={template.isActive ? "default" : "secondary"} className="text-[10px]">
                                    {template.isActive ? "Ativo" : "Inativo"}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {getFrequencyLabel(template.frequency)}
                                  </span>
                                  <span>•</span>
                                  <span>{getDayLabel(template)}</span>
                                  {template.category && (
                                    <>
                                      <span>•</span>
                                      <span>{template.category}</span>
                                    </>
                                  )}
                                </div>

                                <p className="text-sm font-semibold mt-1">
                                  {formatCents(template.amount)}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Próximo: {new Date(template.nextDueDate).toLocaleDateString("pt-BR")}
                                </p>
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleToggleActive(template)}
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(template)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDelete(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!groupId && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Selecione um grupo para ver os templates</p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </div>
  );
}
