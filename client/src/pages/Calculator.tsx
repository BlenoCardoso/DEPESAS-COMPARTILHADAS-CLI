import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeftRight, Calculator as CalculatorIcon, Delete, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CalcMode = "calc" | "convert";

type ConvertKind = "length" | "mass" | "temperature" | "currency";

type UnitDef = {
  id: string;
  label: string;
};

const LENGTH_UNITS: UnitDef[] = [
  { id: "mm", label: "Milímetro (mm)" },
  { id: "cm", label: "Centímetro (cm)" },
  { id: "m", label: "Metro (m)" },
  { id: "km", label: "Quilômetro (km)" },
];

const MASS_UNITS: UnitDef[] = [
  { id: "g", label: "Grama (g)" },
  { id: "kg", label: "Quilograma (kg)" },
];

const TEMP_UNITS: UnitDef[] = [
  { id: "c", label: "Celsius (°C)" },
  { id: "f", label: "Fahrenheit (°F)" },
];

const CURRENCIES: UnitDef[] = [
  { id: "BRL", label: "Real (BRL)" },
  { id: "USD", label: "Dólar (USD)" },
  { id: "EUR", label: "Euro (EUR)" },
];

const parseNumberInput = (raw: string): number => {
  const normalized = String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = (n: number): string => {
  if (!Number.isFinite(n)) return "Erro";
  if (Object.is(n, -0)) return "0";
  const abs = Math.abs(n);
  // Evita números gigantes com muitas casas.
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return n.toExponential(6).replace(/\.0+e/, "e");
  }
  const out = n.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
  return out || "0";
};

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "u-" }
  | { type: "paren"; value: "(" | ")" };

const tokenize = (expr: string): Token[] | null => {
  const s = expr.replace(/,/g, ".").replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (!ch) break;

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      // Unary minus
      const prev = tokens[tokens.length - 1];
      const isUnary = ch === "-" && (!prev || prev.type === "op" || (prev.type === "paren" && prev.value === "("));
      if (isUnary) {
        tokens.push({ type: "op", value: "u-" });
      } else {
        tokens.push({ type: "op", value: ch });
      }
      i++;
      continue;
    }

    // number
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      while (j < s.length) {
        const c = s[j];
        if ((c >= "0" && c <= "9") || c === ".") {
          j++;
          continue;
        }
        break;
      }
      const raw = s.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }

    return null;
  }
  return tokens;
};

const toRpn = (tokens: Token[]): Token[] | null => {
  const output: Token[] = [];
  const stack: Token[] = [];
  const prec = (op: Token["value"]): number => {
    if (op === "u-") return 3;
    if (op === "*" || op === "/") return 2;
    if (op === "+" || op === "-") return 1;
    return 0;
  };
  const rightAssoc = (op: Token["value"]) => op === "u-";

  for (const t of tokens) {
    if (t.type === "number") {
      output.push(t);
      continue;
    }
    if (t.type === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== "op") break;
        const p1 = prec(t.value);
        const p2 = prec(top.value);
        if ((rightAssoc(t.value) && p1 < p2) || (!rightAssoc(t.value) && p1 <= p2)) {
          output.push(stack.pop() as Token);
          continue;
        }
        break;
      }
      stack.push(t);
      continue;
    }
    if (t.type === "paren" && t.value === "(") {
      stack.push(t);
      continue;
    }
    if (t.type === "paren" && t.value === ")") {
      let found = false;
      while (stack.length) {
        const top = stack.pop() as Token;
        if (top.type === "paren" && top.value === "(") {
          found = true;
          break;
        }
        output.push(top);
      }
      if (!found) return null;
    }
  }

  while (stack.length) {
    const top = stack.pop() as Token;
    if (top.type === "paren") return null;
    output.push(top);
  }
  return output;
};

const evalRpn = (tokens: Token[]): number | null => {
  const stack: number[] = [];
  for (const t of tokens) {
    if (t.type === "number") {
      stack.push(t.value);
      continue;
    }
    if (t.type !== "op") return null;
    if (t.value === "u-") {
      const a = stack.pop();
      if (a === undefined) return null;
      stack.push(-a);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) return null;
    if (t.value === "+") stack.push(a + b);
    if (t.value === "-") stack.push(a - b);
    if (t.value === "*") stack.push(a * b);
    if (t.value === "/") stack.push(b === 0 ? NaN : a / b);
  }
  if (stack.length !== 1) return null;
  return stack[0] as number;
};

const evaluateExpression = (expr: string): number | null => {
  const tokens = tokenize(expr);
  if (!tokens) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;
  return evalRpn(rpn);
};

const lastNumberRange = (expr: string): { start: number; end: number } | null => {
  const s = expr;
  let i = s.length - 1;
  while (i >= 0 && /\s/.test(s[i] || "")) i--;
  if (i < 0) return null;

  // number may end with digits
  let end = i + 1;
  while (i >= 0 && /[0-9.,]/.test(s[i] || "")) i--;
  const start = i + 1;
  if (start >= end) return null;
  return { start, end };
};

const replaceRange = (s: string, start: number, end: number, value: string) => s.slice(0, start) + value + s.slice(end);

const convertLengthToMeters = (value: number, unit: string): number => {
  if (unit === "mm") return value / 1000;
  if (unit === "cm") return value / 100;
  if (unit === "m") return value;
  if (unit === "km") return value * 1000;
  return value;
};

const convertMetersToLength = (valueMeters: number, unit: string): number => {
  if (unit === "mm") return valueMeters * 1000;
  if (unit === "cm") return valueMeters * 100;
  if (unit === "m") return valueMeters;
  if (unit === "km") return valueMeters / 1000;
  return valueMeters;
};

const convertMassToKg = (value: number, unit: string): number => {
  if (unit === "g") return value / 1000;
  if (unit === "kg") return value;
  return value;
};

const convertKgToMass = (valueKg: number, unit: string): number => {
  if (unit === "g") return valueKg * 1000;
  if (unit === "kg") return valueKg;
  return valueKg;
};

const convertTemperature = (value: number, from: string, to: string): number => {
  if (from === to) return value;
  if (from === "c" && to === "f") return value * 9 / 5 + 32;
  if (from === "f" && to === "c") return (value - 32) * 5 / 9;
  return value;
};

type FxRates = {
  usdBrl: number;
  eurBrl: number;
};

const computeCurrencyRate = (from: string, to: string, fx: FxRates): number | null => {
  if (from === to) return 1;

  const brlPer = (c: string): number | null => {
    if (c === "BRL") return 1;
    if (c === "USD") return fx.usdBrl;
    if (c === "EUR") return fx.eurBrl;
    return null;
  };

  const brlPerFrom = brlPer(from);
  const brlPerTo = brlPer(to);
  if (!brlPerFrom || !brlPerTo) return null;
  return brlPerFrom / brlPerTo;
};

export default function Calculator() {
  const [mode, setMode] = useState<CalcMode>("calc");

  // ===== Calculadora =====
  const [expr, setExpr] = useState<string>("0");
  const [preview, setPreview] = useState<string>("");

  const toDisplay = (s: string) =>
    String(s || "")
      .replace(/\*/g, "×")
      .replace(/\//g, "÷")
      .replace(/-/g, "−")
      .replace(/\./g, ",");

  const setExprSafe = (next: string) => {
    const cleaned = next
      .replace(/\s+/g, "")
      .replace(/\u2212/g, "-")
      .replace(/\u00D7/g, "*")
      .replace(/\u00F7/g, "/");
    setExpr(cleaned.length ? cleaned : "0");
  };

  const append = (s: string) => {
    if (expr === "0" && /[0-9]/.test(s)) {
      setExprSafe(s);
      return;
    }
    if (expr === "Erro") {
      setExprSafe(s);
      return;
    }
    setExprSafe(expr + s);
  };

  const backspace = () => {
    if (expr === "Erro") {
      setExprSafe("0");
      return;
    }
    if (expr.length <= 1) {
      setExprSafe("0");
      return;
    }
    setExprSafe(expr.slice(0, -1));
  };

  const clearAll = () => {
    setExprSafe("0");
    setPreview("");
  };

  const toggleSign = () => {
    if (expr === "Erro") {
      setExprSafe("0");
      return;
    }
    const r = lastNumberRange(expr);
    if (!r) {
      setExprSafe(expr === "0" ? "-0" : `-(${expr})`);
      return;
    }
    const raw = expr.slice(r.start, r.end);
    const n = parseNumberInput(raw);
    const next = formatNumber(-n);
    setExprSafe(replaceRange(expr, r.start, r.end, next));
  };

  const percent = () => {
    if (expr === "Erro") {
      setExprSafe("0");
      return;
    }
    const r = lastNumberRange(expr);
    if (!r) return;
    const raw = expr.slice(r.start, r.end);
    const n = parseNumberInput(raw);
    const next = formatNumber(n / 100);
    setExprSafe(replaceRange(expr, r.start, r.end, next));
  };

  const evaluate = () => {
    const result = evaluateExpression(expr);
    if (result === null || !Number.isFinite(result)) {
      setPreview(expr);
      setExprSafe("Erro");
      return;
    }
    setPreview(expr);
    setExprSafe(formatNumber(result));
  };

  const canAppendOperator = (op: string) => {
    if (!expr || expr === "Erro") return false;
    const last = expr[expr.length - 1] || "";
    if (/[+\-*/(]/.test(last) && op !== "-") return false;
    return true;
  };

  const pressOperator = (op: "+" | "-" | "*" | "/") => {
    if (expr === "Erro") return;
    if (expr === "0" && op !== "-") return;
    if (!canAppendOperator(op)) {
      // substituir operador final
      const last = expr[expr.length - 1] || "";
      if (/[+\-*/]/.test(last)) {
        setExprSafe(expr.slice(0, -1) + op);
      }
      return;
    }
    append(op);
  };

  const calcValuePreview = useMemo(() => {
    if (!expr || expr === "Erro") return "";
    const r = evaluateExpression(expr);
    if (r === null || !Number.isFinite(r)) return "";
    return formatNumber(r);
  }, [expr]);

  // ===== Conversões =====
  const [kind, setKind] = useState<ConvertKind>("currency");
  const units = useMemo(() => {
    if (kind === "length") return LENGTH_UNITS;
    if (kind === "mass") return MASS_UNITS;
    if (kind === "temperature") return TEMP_UNITS;
    return CURRENCIES;
  }, [kind]);

  const [fromUnit, setFromUnit] = useState<string>("BRL");
  const [toUnit, setToUnit] = useState<string>("USD");
  const [inputValue, setInputValue] = useState<string>("100");
  const [rate, setRate] = useState<string>("1");

  const [useAutoRate, setUseAutoRate] = useState<boolean>(true);
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [fxLoading, setFxLoading] = useState<boolean>(false);
  const [fxError, setFxError] = useState<string>("");
  const [fxUpdatedAt, setFxUpdatedAt] = useState<number | null>(null);

  const refreshFx = async () => {
    setFxLoading(true);
    setFxError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL", { signal: controller.signal });
      if (!res.ok) throw new Error("Falha ao buscar cotação");
      const json = (await res.json()) as any;
      const usd = Number(json?.USDBRL?.bid);
      const eur = Number(json?.EURBRL?.bid);
      if (!Number.isFinite(usd) || !Number.isFinite(eur) || usd <= 0 || eur <= 0) {
        throw new Error("Resposta inválida da cotação");
      }
      setFxRates({ usdBrl: usd, eurBrl: eur });
      setFxUpdatedAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar cotação";
      setFxError(msg);
    } finally {
      clearTimeout(timeout);
      setFxLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== "convert") return;
    if (kind !== "currency") return;
    if (!useAutoRate) return;
    if (fxRates) return;
    void refreshFx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, kind, useAutoRate]);

  const autoRate = useMemo(() => {
    if (kind !== "currency") return null;
    if (!fxRates) return null;
    return computeCurrencyRate(fromUnit, toUnit, fxRates);
  }, [fxRates, fromUnit, kind, toUnit]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const converted = useMemo(() => {
    const v = parseNumberInput(inputValue);
    if (kind === "length") {
      const meters = convertLengthToMeters(v, fromUnit);
      return convertMetersToLength(meters, toUnit);
    }
    if (kind === "mass") {
      const kg = convertMassToKg(v, fromUnit);
      return convertKgToMass(kg, toUnit);
    }
    if (kind === "temperature") {
      return convertTemperature(v, fromUnit, toUnit);
    }
    // currency
    const effectiveRate = useAutoRate ? (autoRate ?? NaN) : parseNumberInput(rate);
    if (!Number.isFinite(effectiveRate)) return NaN;
    return v * effectiveRate;
  }, [autoRate, fromUnit, inputValue, kind, rate, toUnit, useAutoRate]);

  const convertedLabel = useMemo(() => {
    if (!Number.isFinite(converted)) return "Erro";
    if (kind !== "currency") return formatNumber(converted);
    try {
      const to = toUnit || "BRL";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: to,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return formatNumber(converted);
    }
  }, [converted, kind, toUnit]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="space-y-3">
        <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Calculadora</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground ring-1 ring-border/60">
                <CalculatorIcon className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleGroup type="single" value={mode} onValueChange={(v) => (v ? setMode(v as CalcMode) : null)} className="w-full" variant="outline">
              <ToggleGroupItem value="calc" className="flex-1 rounded-2xl">Calculadora</ToggleGroupItem>
              <ToggleGroupItem value="convert" className="flex-1 rounded-2xl">Conversões</ToggleGroupItem>
            </ToggleGroup>

            {mode === "calc" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-[11px] text-muted-foreground truncate">{preview ? toDisplay(preview) : " "}</p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display tabular-nums text-3xl font-semibold tracking-tight break-all text-right">{toDisplay(expr)}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground text-right">{calcValuePreview ? `= ${toDisplay(calcValuePreview)}` : " "}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" className="rounded-2xl" onClick={clearAll} aria-label="Limpar">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={() => append("(")}> ( </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={() => append(")")}> ) </Button>
                  <Button variant="outline" className="rounded-2xl" onClick={backspace} aria-label="Apagar">
                    <Delete className="h-4 w-4" />
                  </Button>

                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("7")}>7</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("8")}>8</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("9")}>9</Button>
                  <Button className="rounded-2xl" onClick={() => pressOperator("/")}>÷</Button>

                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("4")}>4</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("5")}>5</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("6")}>6</Button>
                  <Button className="rounded-2xl" onClick={() => pressOperator("*")}>×</Button>

                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("1")}>1</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("2")}>2</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("3")}>3</Button>
                  <Button className="rounded-2xl" onClick={() => pressOperator("-")}>−</Button>

                  <Button variant="outline" className="rounded-2xl" onClick={toggleSign}>±</Button>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => append("0")}>0</Button>
                  <Button variant="outline" className="rounded-2xl" onClick={percent}>%</Button>
                  <Button className="rounded-2xl" onClick={() => pressOperator("+")}>+</Button>

                  <Button variant="secondary" className="rounded-2xl col-span-2" onClick={() => append(".")}>,</Button>
                  <Button variant="secondary" className="rounded-2xl col-span-2" onClick={evaluate}>=</Button>
                </div>

                <p className="text-[11px] text-muted-foreground">Dica: use parênteses para contas maiores. Ex: (10+5)*2</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={kind} onValueChange={(v) => {
                      const next = v as ConvertKind;
                      setKind(next);
                      // defaults
                      if (next === "length") {
                        setFromUnit("m");
                        setToUnit("km");
                      } else if (next === "mass") {
                        setFromUnit("kg");
                        setToUnit("g");
                      } else if (next === "temperature") {
                        setFromUnit("c");
                        setToUnit("f");
                      } else {
                        setFromUnit("BRL");
                        setToUnit("USD");
                      }
                    }}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="currency">Moeda</SelectItem>
                        <SelectItem value="length">Comprimento</SelectItem>
                        <SelectItem value="mass">Peso</SelectItem>
                        <SelectItem value="temperature">Temperatura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor</Label>
                    <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} inputMode="decimal" className="rounded-2xl" />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">De</Label>
                    <Select value={fromUnit} onValueChange={setFromUnit}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="icon" className="rounded-2xl" onClick={swapUnits} aria-label="Trocar">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Para</Label>
                    <Select value={toUnit} onValueChange={setToUnit}>
                      <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {kind === "currency" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
                      <div className="min-w-0">
                        <Label className="text-xs">Cotação automática</Label>
                        <p className="text-[11px] text-muted-foreground truncate">USD/BRL e EUR/BRL (internet)</p>
                      </div>
                      <Switch checked={useAutoRate} onCheckedChange={setUseAutoRate} />
                    </div>

                    <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Taxa (1 {fromUnit} = X {toUnit})</Label>
                        <Input
                          value={useAutoRate ? (autoRate ? formatNumber(autoRate) : "") : rate}
                          onChange={(e) => setRate(e.target.value)}
                          inputMode="decimal"
                          className="rounded-2xl"
                          disabled={useAutoRate}
                          placeholder={useAutoRate ? "Buscando…" : "1"}
                        />
                        {useAutoRate ? (
                          <p className="text-[11px] text-muted-foreground">
                            {fxLoading
                              ? "Atualizando cotação…"
                              : fxError
                                ? `Falha: ${fxError}. Você pode desligar o automático e informar manualmente.`
                                : fxUpdatedAt
                                  ? `Atualizado: ${new Date(fxUpdatedAt).toLocaleString("pt-BR")}`
                                  : " "}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Sem internet: você define a taxa manualmente.</p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={refreshFx}
                        disabled={!useAutoRate || fxLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <Separator />

                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <Label className="text-xs">Resultado</Label>
                  <p className="mt-1 font-display tabular-nums text-2xl font-semibold tracking-tight break-all text-right">{convertedLabel}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
