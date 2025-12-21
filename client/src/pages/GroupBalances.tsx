import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { formatCents } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Loader2, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function GroupBalances() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleFromUser, setSettleFromUser] = useState("");
  const [settleToUser, setSettleToUser] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDescription, setSettleDescription] = useState("");

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  const balancesQuery = trpc.settlements.calculateBalances.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const settlementsQuery = trpc.settlements.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const membersQuery = trpc.groups.getMembers.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const createSettlementMutation = trpc.settlements.create.useMutation({
    onSuccess: () => {
      toast.success("Acerto registrado");
      setIsSettleOpen(false);
      setSettleFromUser("");
      setSettleToUser("");
      setSettleAmount("");
      setSettleDescription("");
      balancesQuery.refetch();
      settlementsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!groupId && groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupsList, groupId, setCurrentGroupId]);

  const handleCreateSettlement = () => {
    if (!groupId || !settleFromUser || !settleToUser || !settleAmount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const amountInCents = Math.round(parseFloat(settleAmount) * 100);
    if (amountInCents <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    createSettlementMutation.mutate({
      groupId,
      toUserId: settleToUser,
      amount: amountInCents,
      description: settleDescription || undefined,
    });
  };

  const getUserName = (userId: string) => {
    const member = membersQuery.data?.find(m => m.user.id === userId);
    return member?.user.name || member?.user.email || "Usuário desconhecido";
  };

  // Calcular dívidas líquidas (quem deve para quem)
  const debts = balancesQuery.data
    ?.filter(b => b.balance < 0)
    .map(debtor => {
      const creditors = balancesQuery.data?.filter(c => c.balance > 0) || [];
      return {
        debtorId: debtor.userId,
        debtorName: getUserName(debtor.userId),
        debtorBalance: debtor.balance,
        creditors: creditors.map(c => ({
          creditorId: c.userId,
          creditorName: getUserName(c.userId),
          creditorBalance: c.balance,
        })),
      };
    }) || [];

  const totalOwed = balancesQuery.data
    ?.filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0) || 0;

  const totalToReceive = balancesQuery.data
    ?.filter(b => b.balance > 0)
    .reduce((sum, b) => sum + b.balance, 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Saldos do Grupo</h1>
        <p className="text-sm text-muted-foreground">
          Veja quem deve a quem e registre acertos de contas
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
            {/* Resumo de Saldos */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">A pagar</p>
                      <p className="text-lg font-bold text-destructive">{formatCents(totalOwed)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">A receber</p>
                      <p className="text-lg font-bold text-green-600">{formatCents(totalToReceive)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matriz de Dívidas */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Quem Deve a Quem</CardTitle>
                    <CardDescription className="text-xs">Saldos líquidos do grupo</CardDescription>
                  </div>
                  <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Registrar Acerto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base">Registrar Acerto de Contas</DialogTitle>
                        <DialogDescription className="text-xs">
                          Registre um pagamento entre membros
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Quem pagou?</Label>
                          <Select value={settleFromUser} onValueChange={setSettleFromUser}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {membersQuery.data?.map(m => (
                                <SelectItem key={m.user.id} value={m.user.id}>
                                  {m.user.name || m.user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Para quem?</Label>
                          <Select value={settleToUser} onValueChange={setSettleToUser}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {membersQuery.data?.map(m => (
                                <SelectItem key={m.user.id} value={m.user.id}>
                                  {m.user.name || m.user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            placeholder="Ex: 150.00"
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Descrição (opcional)</Label>
                          <Textarea
                            value={settleDescription}
                            onChange={(e) => setSettleDescription(e.target.value)}
                            placeholder="Ex: Acerto de despesas de dezembro"
                            className="text-xs"
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsSettleOpen(false)} className="h-9">
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateSettlement}
                          disabled={createSettlementMutation.isPending}
                          className="h-9"
                        >
                          {createSettlementMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Registrar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {balancesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : debts.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
                    <p className="font-medium">Tudo acertado!</p>
                    <p className="text-sm text-muted-foreground">Não há dívidas pendentes no grupo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {debts.map((debt, idx) => (
                      <motion.div
                        key={debt.debtorId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="border-l-4 border-l-destructive">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm">{debt.debtorName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Deve {formatCents(Math.abs(debt.debtorBalance))} no total
                                  </p>
                                </div>
                                <Badge variant="destructive">Devedor</Badge>
                              </div>

                              <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                                {debt.creditors.map(creditor => {
                                  // Simplificação: divide proporcionalmente
                                  const proportion = creditor.creditorBalance / totalToReceive;
                                  const owedToCreditor = Math.floor(Math.abs(debt.debtorBalance) * proportion);

                                  if (owedToCreditor <= 0) return null;

                                  return (
                                    <div key={creditor.creditorId} className="flex items-center gap-2 text-xs">
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">para</span>
                                      <span className="font-medium">{creditor.creditorName}</span>
                                      <span className="ml-auto font-semibold text-destructive">
                                        {formatCents(owedToCreditor)}
                                      </span>
                                    </div>
                                  );
                                })}
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

            {/* Histórico de Acertos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Histórico de Acertos
                </CardTitle>
                <CardDescription className="text-xs">
                  Pagamentos registrados entre membros
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settlementsQuery.isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !settlementsQuery.data || settlementsQuery.data.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Nenhum acerto registrado ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settlementsQuery.data.map((settlement: any) => (
                      <div
                        key={settlement.id}
                        className="flex items-center justify-between p-2 rounded-2xl border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getUserName(settlement.fromUserId)}
                            <ArrowRight className="inline h-3 w-3 mx-1" />
                            {getUserName(settlement.toUserId)}
                          </p>
                          {settlement.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {settlement.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(settlement.settledAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-600 ml-2">
                          {formatCents(settlement.amount)}
                        </p>
                      </div>
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
              <p className="text-muted-foreground">Selecione um grupo para ver os saldos</p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </div>
  );
}
