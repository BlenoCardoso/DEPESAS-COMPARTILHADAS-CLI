import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCents } from "@/lib/utils";
import { Loader2, DollarSign, Percent, TrendingUp, Users, User } from "lucide-react";

type SplitMode = "equal" | "fixed" | "percentage" | "proportional" | "single";

interface CustomSplit {
  userId: string;
  value: number;
}

interface Member {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  member: {
    monthlyIncome?: number;
  };
}

interface SplitCalculatorProps {
  members: Member[];
  totalAmount: number;
  splitMode: SplitMode;
  customSplits: CustomSplit[];
  onSplitModeChange: (mode: SplitMode) => void;
  onCustomSplitsChange: (splits: CustomSplit[]) => void;
  paidBy: string;
  onPaidByChange: (userId: string) => void;
}

export function SplitCalculator({
  members,
  totalAmount,
  splitMode,
  customSplits,
  onSplitModeChange,
  onCustomSplitsChange,
  paidBy,
  onPaidByChange,
}: SplitCalculatorProps) {
  // Calcular splits finais baseado no modo
  const calculatedSplits = useMemo(() => {
    if (totalAmount <= 0 || members.length === 0) return [];

    if (splitMode === "single") {
      // Somente uma pessoa paga tudo
      const payerId = paidBy || members[0]?.user.id;
      const payer = members.find(m => m.user.id === payerId);
      return [{
        userId: payerId,
        userName: payer?.user.name || payer?.user.email || "Sem nome",
        amount: totalAmount,
      }];
    }

    if (splitMode === "equal") {
      const amountPerPerson = Math.floor(totalAmount / members.length);
      let remainder = totalAmount - amountPerPerson * members.length;
      return members.map(m => ({
        userId: m.user.id,
        userName: m.user.name || m.user.email || "Sem nome",
        amount: amountPerPerson + (remainder-- > 0 ? 1 : 0),
      }));
    }

    if (splitMode === "fixed") {
      return customSplits.map(cs => {
        const member = members.find(m => m.user.id === cs.userId);
        return {
          userId: cs.userId,
          userName: member?.user.name || member?.user.email || "Sem nome",
          amount: cs.value,
        };
      });
    }

    if (splitMode === "percentage") {
      return customSplits.map(cs => {
        const member = members.find(m => m.user.id === cs.userId);
        return {
          userId: cs.userId,
          userName: member?.user.name || member?.user.email || "Sem nome",
          amount: Math.floor((totalAmount * cs.value) / 100),
        };
      });
    }

    if (splitMode === "proportional") {
      const memberIncomes = members.map(m => ({
        userId: m.user.id,
        userName: m.user.name || m.user.email || "Sem nome",
        income: m.member.monthlyIncome || 100000, // default R$ 1000
      }));
      
      const totalIncome = memberIncomes.reduce((sum, m) => sum + m.income, 0);
      
      return memberIncomes.map(m => ({
        userId: m.userId,
        userName: m.userName,
        amount: Math.floor((totalAmount * m.income) / totalIncome),
      }));
    }

    return [];
  }, [totalAmount, splitMode, customSplits, members]);

  // Validações
  const validation = useMemo(() => {
    if (splitMode === "equal") return { valid: true, message: "" };

    const totalSplit = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);

    if (splitMode === "fixed") {
      if (totalSplit !== totalAmount) {
        return {
          valid: false,
          message: `Soma dos valores (${formatCents(totalSplit)}) deve ser igual ao total (${formatCents(totalAmount)})`,
        };
      }
    }

    if (splitMode === "percentage") {
      const totalPercentage = customSplits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return {
          valid: false,
          message: `Soma das porcentagens (${totalPercentage.toFixed(1)}%) deve ser 100%`,
        };
      }
    }

    return { valid: true, message: "" };
  }, [splitMode, calculatedSplits, customSplits, totalAmount]);

  const handleCustomSplitChange = (userId: string, value: number) => {
    const updated = customSplits.find(s => s.userId === userId)
      ? customSplits.map(s => s.userId === userId ? { ...s, value } : s)
      : [...customSplits, { userId, value }];
    onCustomSplitsChange(updated);
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    onSplitModeChange(mode);
    
    // Inicializar customSplits quando mudar para fixed ou percentage
    if ((mode === "fixed" || mode === "percentage") && customSplits.length === 0) {
      const initial = members.map(m => ({
        userId: m.user.id,
        value: mode === "fixed" ? Math.floor(totalAmount / members.length) : Math.floor(100 / members.length),
      }));
      onCustomSplitsChange(initial);
    }
  };

  return (
    <div className="space-y-3">
      {/* Quem pagou */}
      <div className="space-y-1.5">
        <Label className="text-xs">Quem pagou?</Label>
        <Select value={paidBy} onValueChange={onPaidByChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {members.map(m => (
              <SelectItem key={m.user.id} value={m.user.id}>
                {m.user.name || m.user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Modo de divisão */}
      <div className="space-y-1.5">
        <Label className="text-xs">Modo de divisão</Label>
        <RadioGroup value={splitMode} onValueChange={handleSplitModeChange}>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex items-center space-x-1.5 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
              <RadioGroupItem value="single" id="split-single" className="shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">Só eu</div>
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-1.5 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
              <RadioGroupItem value="equal" id="split-equal" className="shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">Igual</div>
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-1.5 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
              <RadioGroupItem value="fixed" id="split-fixed" className="shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">Fixo</div>
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-1.5 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
              <RadioGroupItem value="percentage" id="split-percentage" className="shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <Percent className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">%</div>
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-1.5 rounded-lg border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary col-span-2">
              <RadioGroupItem value="proportional" id="split-proportional" className="shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">Proporcional à renda</div>
                </div>
              </div>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Inputs customizados para fixed e percentage */}
      {(splitMode === "fixed" || splitMode === "percentage") && (
        <Card className="border-dashed">
          <CardHeader className="p-3">
            <CardTitle className="text-xs">
              {splitMode === "fixed" ? "Valores" : "Porcentagens"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {members.map(m => {
              const currentValue = customSplits.find(s => s.userId === m.user.id)?.value || 0;
              return (
                <div key={m.user.id} className="flex items-center gap-2">
                  <Label className="flex-1 text-xs truncate">{m.user.name || m.user.email}</Label>
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleCustomSplitChange(m.user.id, parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-xs"
                    placeholder="0"
                  />
                  {splitMode === "percentage" && <span className="text-xs text-muted-foreground w-4">%</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Preview dos valores calculados - compacto */}
      {calculatedSplits.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="p-3">
            <CardTitle className="text-xs">Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1.5">
            {calculatedSplits.map(split => (
              <div key={split.userId} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{split.userName}</span>
                <span className="font-medium">{formatCents(split.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-1.5 text-xs font-semibold">
              <span>Total</span>
              <span>{formatCents(calculatedSplits.reduce((sum, s) => sum + s.amount, 0))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validação */}
      {!validation.valid && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{validation.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
