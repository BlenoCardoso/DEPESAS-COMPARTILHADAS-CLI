# Atualizações do Firebase - Divisão Flexível e Acertos de Contas

Este documento descreve todas as alterações necessárias no Firebase Firestore para suportar as novas funcionalidades:

## 1. Novas Collections

### a) `settlements` (Acertos de Contas)
Registra pagamentos diretos entre membros do grupo.

**Estrutura:**
```javascript
{
  groupId: string,           // Referência ao grupo
  fromUserId: string,        // Quem pagou
  toUserId: string,          // Quem recebeu
  amount: number,            // Valor em centavos
  description: string,       // Descrição opcional
  settledAt: timestamp,      // Data do acerto
  createdBy: string,         // Quem registrou
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### b) `expenseTemplates` (Despesas Recorrentes)
Templates para gerar despesas automaticamente (aluguel, contas fixas, etc.).

**Estrutura:**
```javascript
{
  groupId: string,
  title: string,
  description: string,
  amount: number,            // em centavos
  currency: string,
  category: string,
  paidBy: string,            // userId padrão
  splitMode: string,         // "equal" | "fixed" | "percentage" | "proportional"
  customSplits: array,       // [{userId, value}]
  frequency: string,         // "weekly" | "monthly" | "yearly"
  dayOfWeek: number,         // 0-6 (para weekly)
  dayOfMonth: number,        // 1-31 (para monthly)
  monthOfYear: number,       // 1-12 (para yearly)
  isActive: boolean,
  lastGenerated: timestamp,
  nextDueDate: timestamp,
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 2. Campos Novos em Collections Existentes

### a) `sharedExpenses` (Atualizar)
Adicione os seguintes campos:

```javascript
{
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  splitMode: string,         // "equal" | "fixed" | "percentage" | "proportional"
  customSplits: array,       // [{userId: string, value: number}]
  
  // Recorrência
  isRecurring: boolean,
  recurringFrequency: string, // "weekly" | "monthly" | "yearly"
  nextDueDate: timestamp,
  isPaused: boolean,
  
  // Parcelas
  isInstallment: boolean,
  installmentNumber: number,  // ex: 3 (de 12)
  totalInstallments: number,  // ex: 12
  parentExpenseId: string     // referência à despesa original
}
```

### b) `groupMembers` (Atualizar)
Adicione perfil financeiro:

```javascript
{
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  monthlyIncome: number,      // em centavos (ex: 300000 = R$ 3.000)
  incomeVisible: boolean,     // se deve mostrar o valor ou só usar no cálculo
  customWeight: number        // multiplicador (ex: 1.2 = paga 20% a mais)
}
```

### c) `expenseSplits` (Já existe, não precisa mudar)
Mantém a estrutura atual - os novos modos de divisão calculam os valores automaticamente e salvam aqui.

## 3. Índices Compostos Necessários

### Para `settlements`:
```javascript
// Buscar settlements de um grupo ordenados por data
groupId ASC, settledAt DESC

// Buscar settlements enviados por um usuário
fromUserId ASC, settledAt DESC

// Buscar settlements recebidos por um usuário
toUserId ASC, settledAt DESC
```

### Para `expenseTemplates`:
```javascript
// Buscar templates ativos de um grupo
groupId ASC, isActive ASC

// Buscar próximos templates a gerar
isActive ASC, nextDueDate ASC
```

### Para `sharedExpenses` (adicionar aos existentes):
```javascript
// Buscar despesas recorrentes ativas
groupId ASC, isRecurring ASC, nextDueDate ASC

// Buscar parcelas de uma despesa
parentExpenseId ASC, installmentNumber ASC
```

## 4. Regras de Segurança (firestore.rules)

Adicione as seguintes regras ao seu arquivo `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: verificar se o usuário é membro do grupo
    function isGroupMember(groupId) {
      return exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
    }
    
    // SETTLEMENTS
    match /settlements/{settlementId} {
      allow read: if isGroupMember(resource.data.groupId);
      
      allow create: if request.auth != null
                    && isGroupMember(request.resource.data.groupId)
                    && request.resource.data.fromUserId == request.auth.uid;
      
      allow update, delete: if request.auth != null
                           && resource.data.createdBy == request.auth.uid;
    }
    
    // EXPENSE TEMPLATES
    match /expenseTemplates/{templateId} {
      allow read: if isGroupMember(resource.data.groupId);
      
      allow create: if request.auth != null
                    && isGroupMember(request.resource.data.groupId);
      
      allow update, delete: if request.auth != null
                           && (isGroupMember(resource.data.groupId)
                               && resource.data.createdBy == request.auth.uid);
    }
    
    // SHARED EXPENSES (atualizar regra existente se necessário)
    match /sharedExpenses/{expenseId} {
      allow read: if isGroupMember(resource.data.groupId);
      
      allow create: if request.auth != null
                    && isGroupMember(request.resource.data.groupId);
      
      allow update: if request.auth != null
                    && (resource.data.createdBy == request.auth.uid
                        || (resource.data.allowMemberEdits == true 
                            && isGroupMember(resource.data.groupId)));
      
      allow delete: if request.auth != null
                    && resource.data.createdBy == request.auth.uid;
    }
    
    // GROUP MEMBERS (atualizar para permitir edição de perfil financeiro)
    match /groupMembers/{memberId} {
      allow read: if isGroupMember(resource.data.groupId);
      
      allow create: if request.auth != null;
      
      allow update: if request.auth != null
                    && (resource.data.userId == request.auth.uid  // próprio usuário
                        || exists(/databases/$(database)/documents/groups/$(resource.data.groupId))
                           && get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.ownerId == request.auth.uid);  // owner do grupo
      
      allow delete: if request.auth != null
                    && (resource.data.userId == request.auth.uid
                        || exists(/databases/$(database)/documents/groups/$(resource.data.groupId))
                           && get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.ownerId == request.auth.uid);
    }
  }
}
```

## 5. Como Aplicar as Mudanças

### Passo 1: Criar Índices
1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Vá em **Firestore Database** → **Indexes** → **Composite**
3. Clique em **Create Index** para cada índice listado acima
4. Aguarde a criação (pode levar alguns minutos)

### Passo 2: Atualizar Regras
1. No Firebase Console, vá em **Firestore Database** → **Rules**
2. Copie e cole as regras acima (ou atualize suas regras existentes)
3. Clique em **Publish**

### Passo 3: Migração de Dados (Opcional)
Se você já tem despesas existentes, pode ser necessário adicionar os novos campos:

```javascript
// Exemplo de script de migração (executar no console do Firebase Functions ou localmente)
const admin = require('firebase-admin');
const db = admin.firestore();

async function migrateExpenses() {
  const snapshot = await db.collection('sharedExpenses').get();
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      splitMode: 'equal',  // modo padrão para despesas antigas
      isRecurring: false,
      isInstallment: false
    });
  });
  
  await batch.commit();
  console.log('Migração concluída!');
}
```

## 6. Validações Importantes

### Para `splitMode`:
- **equal**: Divisão igual entre todos os membros (comportamento atual)
- **fixed**: Valores fixos por pessoa - soma de `customSplits[].value` deve ser igual ao `amount`
- **percentage**: Porcentagens - soma de `customSplits[].value` deve ser 100
- **proportional**: Baseado em `monthlyIncome` de cada membro

### Para recorrência:
- `nextDueDate` deve ser atualizado após gerar cada despesa
- `isActive` pode ser usado para pausar/retomar templates

## 7. Exemplos de Dados

### Exemplo 1: Despesa com divisão por porcentagem
```javascript
{
  groupId: "grupo123",
  title: "Aluguel",
  amount: 180000,  // R$ 1.800,00
  splitMode: "percentage",
  customSplits: [
    { userId: "user1", value: 60 },  // 60%
    { userId: "user2", value: 40 }   // 40%
  ],
  paidBy: "user1",
  // ...
}
```

### Exemplo 2: Despesa recorrente mensal
```javascript
{
  groupId: "grupo123",
  title: "Internet",
  amount: 10000,  // R$ 100,00
  splitMode: "equal",
  isRecurring: true,
  recurringFrequency: "monthly",
  dayOfMonth: 5,  // todo dia 5
  nextDueDate: Timestamp,
  isActive: true,
  // ...
}
```

### Exemplo 3: Acerto de contas
```javascript
{
  groupId: "grupo123",
  fromUserId: "user2",  // user2 pagou
  toUserId: "user1",    // para user1
  amount: 50000,        // R$ 500,00
  description: "Acerto de despesas do mês",
  settledAt: Timestamp,
  // ...
}
```

## 8. Próximos Passos no Código

Após configurar o Firebase, você precisará:

1. **UI para Divisão Flexível**: Criar formulário na tela de adicionar despesa
2. **Tela de Saldos**: Mostrar quem deve a quem com botão de registrar acerto
3. **Gerenciamento de Templates**: Tela para criar/pausar despesas recorrentes
4. **Job Automático**: Cloud Function para gerar despesas recorrentes (opcional)

## Dúvidas ou Problemas?

- Se um índice demorar muito para criar, verifique se tem muitos documentos
- Se as regras derem erro, teste com o Simulator do Firebase Console
- Para migração de dados, teste primeiro em ambiente de desenvolvimento
