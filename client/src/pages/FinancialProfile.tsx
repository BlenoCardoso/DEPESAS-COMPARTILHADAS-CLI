import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { DollarSign, Loader2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

export default function FinancialProfile() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;

  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [incomeVisible, setIncomeVisible] = useState<boolean>(false);
  const [customWeight, setCustomWeight] = useState<string>("1.0");

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  // Buscar membros do grupo para pegar dados atuais
  const membersQuery = trpc.groups.getMembers.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const updateMutation = trpc.groupMembers.updateFinancialProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil financeiro atualizado");
      membersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Carregar dados atuais quando membros forem carregados
  useEffect(() => {
    if (!membersQuery.data || !user?.id) return;
    
    const myMember = membersQuery.data.find(m => m.user.id === user.id);
    if (myMember) {
      const income = (myMember.member as any).monthlyIncome || 0;
      const visible = (myMember.member as any).incomeVisible || false;
      const weight = (myMember.member as any).customWeight || 1.0;
      
      setMonthlyIncome(income > 0 ? (income / 100).toFixed(2) : "");
      setIncomeVisible(visible);
      setCustomWeight(weight.toString());
    }
  }, [membersQuery.data, user?.id]);

  // Selecionar primeiro grupo automaticamente
  useEffect(() => {
    if (!groupId && groupsList.length > 0) {
      setCurrentGroupId(groupsList[0].group.id);
    }
  }, [groupsList, groupId, setCurrentGroupId]);

  const handleSave = () => {
    if (!groupId || !user?.id) {
      toast.error("Selecione um grupo");
      return;
    }

    const incomeInCents = monthlyIncome ? Math.round(parseFloat(monthlyIncome) * 100) : 0;
    const weightValue = parseFloat(customWeight) || 1.0;

    updateMutation.mutate({
      groupId,
      userId: user.id,
      monthlyIncome: incomeInCents > 0 ? incomeInCents : undefined,
      incomeVisible,
      customWeight: weightValue !== 1.0 ? weightValue : undefined,
    });
  };

  // Calcular preview da divisão proporcional
  const previewSplits = () => {
    if (!membersQuery.data || monthlyIncome === "" || parseFloat(monthlyIncome) <= 0) return null;

    const myIncome = Math.round(parseFloat(monthlyIncome) * 100);
    const allMembers = membersQuery.data.map(m => {
      const income = m.user.id === user?.id 
        ? myIncome 
        : ((m.member as any).monthlyIncome || 100000); // default R$ 1000
      return {
        name: m.user.name || m.user.email || "Sem nome",
        income,
      };
    });

    const totalIncome = allMembers.reduce((sum, m) => sum + m.income, 0);
    const exampleAmount = 100000; // R$ 1000,00 de exemplo

    return allMembers.map(m => ({
      name: m.name,
      percentage: ((m.income / totalIncome) * 100).toFixed(1),
      amount: Math.floor((exampleAmount * m.income) / totalIncome),
    }));
  };

  const splits = previewSplits();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Perfil Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Configure sua renda para divisões proporcionais
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
            {/* Configuração de Renda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Renda Mensal
                </CardTitle>
                <CardDescription className="text-xs">
                  Usada para calcular divisão proporcional de despesas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="income" className="text-sm">
                    Renda Mensal (R$)
                  </Label>
                  <Input
                    id="income"
                    type="number"
                    step="0.01"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="Ex: 3500.00"
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    {monthlyIncome && parseFloat(monthlyIncome) > 0
                      ? `Equivale a ${formatCents(Math.round(parseFloat(monthlyIncome) * 100))}`
                      : "Digite sua renda mensal aproximada"}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="visible" className="text-sm font-medium">
                      Tornar renda visível
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Outros membros poderão ver sua renda
                    </p>
                  </div>
                  <Switch
                    id="visible"
                    checked={incomeVisible}
                    onCheckedChange={setIncomeVisible}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm">
                    Peso Customizado (avançado)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    placeholder="1.0"
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplicador para ajustar sua participação (padrão: 1.0)
                  </p>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full gap-2"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>

            {/* Preview da Divisão */}
            {splits && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Preview de Divisão Proporcional
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Como seria dividida uma despesa de R$ 1.000,00
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {splits.map((split, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{split.name}</p>
                        <p className="text-xs text-muted-foreground">{split.percentage}%</p>
                      </div>
                      <p className="font-semibold">{formatCents(split.amount)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t font-semibold">
                    <span>Total</span>
                    <span>{formatCents(100000)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Membros do Grupo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros do Grupo
                </CardTitle>
                <CardDescription className="text-xs">
                  {incomeVisible
                    ? "Sua renda está visível para os membros abaixo"
                    : "Sua renda está privada"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersQuery.isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {membersQuery.data?.map((m) => {
                      const isMe = m.user.id === user?.id;
                      const income = (m.member as any).monthlyIncome;
                      const visible = (m.member as any).incomeVisible;

                      return (
                        <div
                          key={m.user.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {m.user.name || m.user.email}
                              {isMe && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                            </p>
                            {isMe || visible ? (
                              <p className="text-xs text-muted-foreground">
                                {income ? formatCents(income) : "Renda não definida"}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Renda privada</p>
                            )}
                          </div>
                          {m.member.role === "owner" && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Dono
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!groupId && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Selecione um grupo para configurar seu perfil</p>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </div>
  );
}
