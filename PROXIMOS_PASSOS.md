# 🚀 Próximos Passos - Despesas Compartilhadas

Este documento contém instruções detalhadas para completar a implementação do aplicativo.

## ✅ O que já está pronto

### Backend Completo
- ✅ Banco de dados MySQL com 11 tabelas (users, groups, groupMembers, sharedExpenses, expenseSplits, personalExpenses, tasks, reminders, calendarEvents, invitations, notifications)
- ✅ Queries e mutations completas em `server/db.ts`
- ✅ Routers tRPC para todas as funcionalidades em `server/routers.ts`
- ✅ Autenticação via Manus OAuth

### Firebase Configurado
- ✅ SDK do Firebase instalado e configurado
- ✅ Regras de segurança do Firestore (`firestore.rules`)
- ✅ Índices compostos otimizados (`firestore.indexes.json`)
- ✅ Documentação completa (`FIREBASE_SETUP.md`)

### Interface Mobile
- ✅ Layout mobile responsivo com menu hambúrguer
- ✅ Tema de cores vibrante (roxo, verde água, laranja)
- ✅ Sistema de navegação completo
- ✅ Página inicial (Home) funcional
- ✅ Página de Grupos funcional
- ✅ Bottom navigation para mobile

### Dependências Instaladas
- ✅ Firebase SDK
- ✅ Capacitor e plugins
- ✅ Recharts para gráficos
- ✅ date-fns para datas
- ✅ Todas as bibliotecas necessárias

## 📝 O que falta implementar

### 1. Completar Páginas Restantes

#### Despesas Compartilhadas (`client/src/pages/SharedExpenses.tsx`)
```tsx
// Implementar:
- Listagem de despesas do grupo selecionado
- Formulário para adicionar nova despesa
- Sistema de divisão de valores entre membros
- Botão de validação de despesas
- Indicadores visuais (quem pagou, quem deve, pendente)
- Filtros por data e categoria
```

#### Despesas Pessoais (`client/src/pages/PersonalExpenses.tsx`)
```tsx
// Implementar:
- Listagem de despesas pessoais
- Formulário para adicionar/editar despesa
- Categorização de despesas
- Filtros por data e categoria
- Resumo mensal de gastos
```

#### Tarefas (`client/src/pages/Tasks.tsx`)
```tsx
// Implementar:
- Lista de tarefas com checkbox
- Formulário para adicionar/editar tarefa
- Prioridades (baixa, média, alta) com cores
- Data de vencimento
- Filtro por status (concluídas/pendentes)
```

#### Lembretes (`client/src/pages/Reminders.tsx`)
```tsx
// Implementar:
- Lista de lembretes ordenados por data
- Formulário para adicionar/editar lembrete
- Categorização
- Indicador visual de lembretes próximos
```

#### Calendário (`client/src/pages/Calendar.tsx`)
```tsx
// Implementar:
- Visualização mensal de eventos
- Adicionar eventos clicando em datas
- Editar/excluir eventos
- Cores personalizadas para eventos
- Integração com lembretes e tarefas
```

#### Relatórios (`client/src/pages/Reports.tsx`)
```tsx
// Implementar com Recharts:
- Gráfico de pizza: despesas por categoria
- Gráfico de linha: evolução temporal de gastos
- Gráfico de barras: comparação mensal
- Estatísticas: total gasto, média, maior/menor despesa
- Balanço de despesas compartilhadas (quem deve/recebe)
- Filtros por período
```

#### Notificações (`client/src/pages/Notifications.tsx`)
```tsx
// Implementar:
- Lista de notificações ordenadas por data
- Marcar como lida/não lida
- Marcar todas como lidas
- Tipos diferentes de notificação com ícones
- Link para o item relacionado
```

#### Configurações (`client/src/pages/Settings.tsx`)
```tsx
// Implementar:
- Perfil do usuário
- Preferências de notificação
- Tema (claro/escuro)
- Idioma
- Sobre o app
```

### 2. Configurar Firebase no Console

Siga o guia completo em `FIREBASE_SETUP.md`:

1. **Obter API Key**
   - Acesse o Console do Firebase
   - Copie a `apiKey` do firebaseConfig
   - Cole em `client/src/lib/firebase.ts`

2. **Ativar Google Sign-In**
   - Authentication > Sign-in method > Google > Ativar

3. **Criar Firestore Database**
   - Firestore Database > Create database
   - Localização: southamerica-east1 (São Paulo)

4. **Aplicar Regras e Índices**
   ```bash
   firebase login:ci
   # Use o token fornecido
   firebase init
   firebase deploy --only firestore
   ```

5. **Configurar Android**
   - Baixar `google-services.json`
   - Colocar em `android/app/google-services.json`
   - Adicionar SHA-1 no Console

### 3. Implementar Gráficos com Recharts

Exemplo de gráfico de pizza:

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

function ExpensesPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### 4. Configurar Capacitor para Android

```bash
# Adicionar plataforma Android
npx cap add android

# Sincronizar código
npx cap sync

# Abrir no Android Studio
npx cap open android

# Build
cd android
./gradlew assembleDebug
```

### 5. Testar o Aplicativo

```bash
# Rodar em desenvolvimento
npm run dev

# Testar no navegador
# Abrir: http://localhost:3000

# Testar no Android
npx cap run android
```

## 🎨 Dicas de Design

### Cores do Tema (já configuradas)
- **Primary (Roxo)**: `oklch(0.65 0.25 290)`
- **Secondary (Verde Água)**: `oklch(0.60 0.15 180)`
- **Accent (Laranja)**: `oklch(0.70 0.20 40)`
- **Success (Verde)**: `oklch(0.55 0.18 140)`
- **Warning (Amarelo)**: `oklch(0.70 0.20 60)`
- **Info (Azul)**: `oklch(0.65 0.20 240)`

### Componentes Úteis (já instalados)
- `Button`, `Card`, `Dialog`, `Input`, `Label`, `Textarea`
- `Select`, `Checkbox`, `RadioGroup`, `Switch`
- `Tabs`, `Accordion`, `Sheet`, `Popover`
- `Badge`, `Avatar`, `Skeleton`, `Progress`

### Ícones (Lucide React)
- Já importados: `Users`, `CreditCard`, `Wallet`, `CheckSquare`, `Clock`, `Calendar`, `Bell`, `Settings`, etc.

## 📚 Recursos Úteis

- [tRPC Docs](https://trpc.io/docs)
- [Recharts Docs](https://recharts.org/)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run type-check

# Database push
pnpm db:push

# Capacitor sync
npx cap sync

# Firebase deploy
firebase deploy
```

## ✨ Melhorias Futuras

1. **Notificações Push** - Usar Firebase Cloud Messaging
2. **Modo Offline** - Implementar cache com Service Workers
3. **Exportar Relatórios** - PDF ou Excel
4. **Anexar Comprovantes** - Upload de imagens de notas fiscais
5. **Múltiplas Moedas** - Conversão automática
6. **Recorrência** - Despesas recorrentes automáticas
7. **Categorias Personalizadas** - Criar categorias próprias
8. **Temas Personalizados** - Mais opções de cores

## 🎯 Prioridades

1. ⭐ **Alta**: Completar páginas de Despesas Compartilhadas e Pessoais
2. ⭐ **Alta**: Configurar Firebase e testar autenticação
3. ⭐ **Média**: Implementar Relatórios com gráficos
4. ⭐ **Média**: Completar Tarefas, Lembretes e Calendário
5. ⭐ **Baixa**: Configurar build Android
6. ⭐ **Baixa**: Melhorias e otimizações

## 💡 Dica Final

O projeto está com uma base sólida! Todas as funcionalidades principais estão estruturadas no backend. Agora é só conectar o frontend com os routers tRPC que já existem. Use a página de Grupos como referência - ela mostra como usar `trpc.*.useQuery` e `trpc.*.useMutation`.

Boa sorte! 🚀
