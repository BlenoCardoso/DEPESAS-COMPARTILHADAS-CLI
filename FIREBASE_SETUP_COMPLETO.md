# 🔥 Configuração Firebase - Divisão Flexível

## ✅ Funcionalidades Implementadas

1. **Divisão Flexível de Despesas**
   - Igual (dividir por todos igualmente)
   - Valor Fixo (definir valor específico para cada membro)
   - Porcentagem (cada membro paga % do total)
   - Proporcional à Renda (baseado no `monthlyIncome` de cada membro)

2. **"Quem Pagou?"**
   - Campo `paidBy` para identificar quem desembolsou a despesa
   - Sistema de saldos: calcular quem deve quanto a quem

3. **Acertos de Contas (Settlements)**
   - Registrar pagamentos entre membros
   - Zerar dívidas específicas
   - Histórico de acertos

4. **Despesas Recorrentes e Parceladas**
   - Templates de despesas recorrentes (mensais, semanais, etc.)
   - Despesas parceladas (X de Y parcelas)
   - Geração automática de próximas parcelas

5. **Perfil Financeiro dos Membros**
   - `monthlyIncome`: renda mensal para cálculo proporcional
   - `incomeVisible`: escolher se quer exibir a renda para outros
   - `customWeight`: peso customizado para divisões (alternativa à renda)

---

## 📦 1. Estrutura das Coleções (Collections)

### 1.1 `sharedExpenses` (ATUALIZADA)

Campos adicionados:
```typescript
{
  // ... campos existentes (id, groupId, title, amount, date, etc.)
  
  // NOVOS CAMPOS - Divisão Flexível
  splitMode: 'equal' | 'fixed' | 'percentage' | 'proportional',  // modo de divisão
  customSplits?: Array<{                                           // valores customizados
    userId: string,
    value: number  // centavos (fixed) ou % (percentage)
  }>,
  paidBy?: string,  // userId de quem pagou a despesa
  
  // NOVOS CAMPOS - Recorrência
  isRecurring?: boolean,           // se é despesa recorrente
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly',
  
  // NOVOS CAMPOS - Parcelamento
  isInstallment?: boolean,         // se é parcela
  installmentNumber?: number,      // parcela atual (ex: 3)
  totalInstallments?: number,      // total de parcelas (ex: 12)
  parentExpenseId?: string         // ID da despesa original (se parcelada)
}
```

### 1.2 `groupMembers` (ATUALIZADA)

Campos adicionados:
```typescript
{
  // ... campos existentes (userId, groupId, role, joinedAt)
  
  // NOVOS CAMPOS - Perfil Financeiro
  monthlyIncome?: number,      // renda mensal em centavos
  incomeVisible?: boolean,     // se permite exibir renda para outros
  customWeight?: number        // peso customizado (alternativa à renda, ex: 1.5)
}
```

### 1.3 `settlements` (NOVA COLEÇÃO)

Registra acertos de contas entre membros:
```typescript
{
  id: string,
  groupId: string,
  fromUserId: string,      // quem pagou
  toUserId: string,        // quem recebeu
  amount: number,          // valor em centavos
  settledAt: Date,         // quando foi feito o acerto
  description?: string,    // nota opcional
  createdAt: Date
}
```

### 1.4 `expenseTemplates` (NOVA COLEÇÃO)

Templates para despesas recorrentes:
```typescript
{
  id: string,
  groupId: string,
  title: string,
  amount: number,
  category?: string,
  frequency: 'weekly' | 'monthly' | 'yearly',
  dayOfWeek?: number,      // 0-6 (se weekly)
  dayOfMonth?: number,     // 1-31 (se monthly)
  dayOfYear?: string,      // 'MM-DD' (se yearly, ex: '01-15')
  splitMode: 'equal' | 'fixed' | 'percentage' | 'proportional',
  customSplits?: Array<{ userId: string, value: number }>,
  paidBy?: string,
  isActive: boolean,       // se está ativo
  nextDueDate: Date,       // próxima data de vencimento
  createdAt: Date,
  createdBy: string
}
```

---

## 📊 2. Índices Composite (Firestore Indexes)

Acesse o Firebase Console → Firestore Database → Indexes → Composite e adicione:

### Índices para `settlements`:
1. **Collection ID**: `settlements`
   - `groupId` (Ascending)
   - `settledAt` (Descending)

2. **Collection ID**: `settlements`
   - `fromUserId` (Ascending)
   - `settledAt` (Descending)

3. **Collection ID**: `settlements`
   - `toUserId` (Ascending)
   - `settledAt` (Descending)

### Índices para `expenseTemplates`:
1. **Collection ID**: `expenseTemplates`
   - `groupId` (Ascending)
   - `isActive` (Ascending)
   - `nextDueDate` (Ascending)

2. **Collection ID**: `expenseTemplates`
   - `groupId` (Ascending)
   - `createdAt` (Descending)

### Índices para `sharedExpenses` (atualizar):
1. **Collection ID**: `sharedExpenses`
   - `groupId` (Ascending)
   - `isRecurring` (Ascending)
   - `date` (Descending)

2. **Collection ID**: `sharedExpenses`
   - `groupId` (Ascending)
   - `parentExpenseId` (Ascending)
   - `installmentNumber` (Ascending)

---

## 🔐 3. Regras de Segurança (Security Rules)

Substitua ou adicione ao arquivo `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: verifica se user é membro do grupo
    function isGroupMember(groupId) {
      return exists(/databases/$(database)/documents/groupMembers/$(request.auth.uid + '_' + groupId));
    }
    
    // Helper: verifica se user é owner do grupo
    function isGroupOwner(groupId) {
      return get(/databases/$(database)/documents/groups/$(groupId)).data.ownerId == request.auth.uid;
    }
    
    // Coleção sharedExpenses
    match /sharedExpenses/{expenseId} {
      allow read: if request.auth != null && isGroupMember(resource.data.groupId);
      allow create: if request.auth != null 
        && isGroupMember(request.resource.data.groupId)
        && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null 
        && isGroupMember(resource.data.groupId)
        && (resource.data.createdBy == request.auth.uid 
          || resource.data.allowMemberEdits == true);
      allow delete: if request.auth != null 
        && (resource.data.createdBy == request.auth.uid 
          || isGroupOwner(resource.data.groupId));
    }
    
    // Coleção settlements (NOVA)
    match /settlements/{settlementId} {
      allow read: if request.auth != null && isGroupMember(resource.data.groupId);
      allow create: if request.auth != null 
        && isGroupMember(request.resource.data.groupId)
        && (request.resource.data.fromUserId == request.auth.uid 
          || request.resource.data.toUserId == request.auth.uid);
      allow update, delete: if false;  // settlements são imutáveis
    }
    
    // Coleção expenseTemplates (NOVA)
    match /expenseTemplates/{templateId} {
      allow read: if request.auth != null && isGroupMember(resource.data.groupId);
      allow create: if request.auth != null 
        && isGroupMember(request.resource.data.groupId)
        && request.resource.data.createdBy == request.auth.uid;
      allow update: if request.auth != null 
        && (resource.data.createdBy == request.auth.uid 
          || isGroupOwner(resource.data.groupId));
      allow delete: if request.auth != null 
        && (resource.data.createdBy == request.auth.uid 
          || isGroupOwner(resource.data.groupId));
    }
    
    // Coleção groupMembers (ATUALIZADA)
    match /groupMembers/{memberId} {
      allow read: if request.auth != null 
        && (memberId.split('_')[0] == request.auth.uid 
          || isGroupMember(resource.data.groupId));
      allow create: if request.auth != null;
      allow update: if request.auth != null 
        && (memberId.split('_')[0] == request.auth.uid 
          || isGroupOwner(resource.data.groupId));
      allow delete: if request.auth != null 
        && (memberId.split('_')[0] == request.auth.uid 
          || isGroupOwner(resource.data.groupId));
    }
    
    // Outras coleções existentes...
    match /groups/{groupId} {
      allow read: if request.auth != null && isGroupMember(groupId);
      allow create: if request.auth != null;
      allow update: if request.auth != null && isGroupOwner(groupId);
      allow delete: if request.auth != null && isGroupOwner(groupId);
    }
    
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /invitations/{inviteId} {
      allow read, write: if request.auth != null;
    }
    
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🛠️ 4. Migração de Dados (Script de Exemplo)

Se você já tem despesas existentes, rode este script para adicionar `splitMode`:

```javascript
// scripts/migrate-add-split-mode.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateSplitMode() {
  const snapshot = await db.collection('sharedExpenses').get();
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.splitMode) {
      batch.update(doc.ref, { 
        splitMode: 'equal',  // assume divisão igual por padrão
        paidBy: data.createdBy || null  // assume que criador pagou
      });
      count++;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`✅ Migrados ${count} documentos`);
  } else {
    console.log('Nenhum documento para migrar');
  }
}

migrateSplitMode().catch(console.error);
```

Execute:
```bash
cd scripts
node migrate-add-split-mode.js
```

---

## 🧪 5. Testes e Exemplos

### Criar despesa com divisão por porcentagem (60/40):

```typescript
await trpc.sharedExpenses.create.mutate({
  groupId: 'group123',
  title: 'Aluguel',
  amount: 100000,  // R$ 1.000,00
  date: new Date(),
  currency: 'BRL',
  splitMode: 'percentage',
  customSplits: [
    { userId: 'user1', value: 60 },  // 60% = R$ 600
    { userId: 'user2', value: 40 }   // 40% = R$ 400
  ],
  paidBy: 'user1',  // user1 pagou
  splits: []  // calculado automaticamente no backend
});
```

### Criar despesa recorrente mensal:

```typescript
await trpc.expenseTemplates.create.mutate({
  groupId: 'group123',
  title: 'Internet',
  amount: 9900,  // R$ 99,00
  category: 'Contas fixas',
  frequency: 'monthly',
  dayOfMonth: 5,  // todo dia 5
  splitMode: 'equal',
  isActive: true
});
```

### Registrar acerto de contas:

```typescript
await trpc.settlements.create.mutate({
  groupId: 'group123',
  fromUserId: 'user2',  // user2 pagou
  toUserId: 'user1',    // para user1
  amount: 50000,        // R$ 500,00
  description: 'Acerto de despesas anteriores'
});
```

### Calcular saldos do grupo:

```typescript
const balances = await trpc.settlements.calculateBalances.query({
  groupId: 'group123'
});
// Retorna: Array<{ userId: string, balance: number }>
// balance positivo = pessoa deve receber
// balance negativo = pessoa deve pagar
```

---

## 📱 6. Próximos Passos (UI Pendentes)

### 6.1 Tela de Saldos
Criar página `client/src/pages/GroupBalances.tsx`:
- Exibir matriz "quem deve para quem"
- Botão "Registrar Acerto" por dívida
- Histórico de settlements

### 6.2 Gestão de Templates Recorrentes
Criar página `client/src/pages/ExpenseTemplates.tsx`:
- Listar templates ativos/inativos
- CRUD de templates
- Botão "Gerar Próxima Parcela" manual

### 6.3 Perfil Financeiro
Adicionar em `client/src/pages/GroupSettings.tsx`:
- Input para `monthlyIncome` do membro
- Toggle `incomeVisible`
- Input para `customWeight`

### 6.4 Categorias Gerenciáveis
- Coleção `expenseCategories` no Firebase
- CRUD de categorias personalizadas por grupo
- Dropdown com categorias customizadas

### 6.5 Anexos (Comprovantes)
- Firebase Storage para imagens
- Campo `attachmentUrl` em `sharedExpenses`
- Upload de foto/PDF

---

## 🚀 7. Build e Deploy

### 7.1 Verificar TypeScript
```bash
cd c:\Users\bleno\Downloads\DEPESAS-COMPARTILHADAS-CLI-main
pnpm install
pnpm run typecheck
```

### 7.2 Gerar APK
```bash
pnpm build
npx cap sync android
cd android
.\gradlew assembleDebug
```

APK gerado em:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

### 7.3 Instalar no Dispositivo
```bash
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## ✅ Checklist Final

- [ ] Adicionar índices composite no Firebase Console
- [ ] Atualizar `firestore.rules` com as novas regras
- [ ] Rodar script de migração (se tiver dados existentes)
- [ ] Testar criação de despesa com splitMode='percentage'
- [ ] Testar criação de template recorrente
- [ ] Testar registro de settlement
- [ ] Testar cálculo de saldos
- [ ] Build do APK
- [ ] Instalar e testar no dispositivo

---

## 🆘 Troubleshooting

### Erro: "Missing index"
- Acesse o link do erro no console
- Firebase cria o índice automaticamente
- Aguarde 2-5 minutos para o índice ser construído

### Erro: "PERMISSION_DENIED"
- Verifique se as regras de segurança foram publicadas
- Confirme que o usuário está autenticado
- Verifique se o userId está no `groupMembers`

### SplitCalculator não aparece
- Verifique se o import está correto
- Confirme que `membersQuery.data` não está vazio
- Cheque o console do navegador por erros TypeScript

---

**Pronto!** Agora você tem divisão flexível, settlements, templates recorrentes e perfis financeiros funcionando. 🎉
