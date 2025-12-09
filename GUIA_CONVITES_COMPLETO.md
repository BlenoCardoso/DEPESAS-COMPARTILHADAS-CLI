# 📧 **GUIA COMPLETO: Sistema de Convites - Despesas Compartilhadas**

> **🎯 Este guia te mostra EXATAMENTE como fazer tudo funcionar do zero!**

## 🚀 **PASSO 1: Configuração Inicial**

### **1.1 Verificar Firebase Console**
1. Acesse: [Firebase Console](https://console.firebase.google.com/project/despesas-compartilhadas-vs)
2. Vá em **Firestore Database**
3. Certifique-se que está vazio (pode ter uma coleção de teste)

### **1.2 Executar Seeds (Popular Banco)**
```bash
# No terminal do seu projeto
cd d:\Bleno\despesas-compartilhadas

# Instalar dependências se necessário
pnpm install

# Popular o Firebase com dados iniciais
npm run seed-firebase
```

**O que o seed cria:**
- ✅ 3 usuários de exemplo
- ✅ 3 grupos diferentes
- ✅ Despesas compartilhadas
- ✅ Notificações
- ✅ 1 convite pendente

---

## 🎭 **PASSO 2: Demonstração do Fluxo**

### **2.1 Executar Teste de Convites**
```bash
# Demonstrar fluxo completo de convites
npm run test-invitations
```

**Este comando simula:**
1. 👤 Criação de usuários
2. 🏠 Criação de grupo 
3. 📧 Envio de convite
4. ✅ Aceite do convite
5. 👥 Adição ao grupo
6. 💰 Criação de despesa
7. 🔔 Notificações automáticas

### **2.2 Verificar no Firebase Console**
Após executar os scripts, você verá no Firestore:

#### **👥 Coleção: `users`**
```json
{
  "id": "auto-generated",
  "name": "João Silva",
  "email": "joao.silva@email.com",
  "openId": "google-123456789",
  "role": "user",
  "avatarUrl": "https://i.pravatar.cc/150?img=1",
  "createdAt": "timestamp"
}
```

#### **🏠 Coleção: `groups`**
```json
{
  "id": "auto-generated", 
  "name": "🏠 Apartamento Compartilhado",
  "description": "Despesas do apartamento que dividimos",
  "ownerId": "user-id-reference",
  "createdAt": "timestamp"
}
```

#### **📧 Coleção: `invitations`**
```json
{
  "id": "auto-generated",
  "groupId": "group-id-reference",
  "invitedBy": "user-id-reference", 
  "invitedEmail": "novo.usuario@email.com",
  "status": "pending", // ou "accepted" / "rejected"
  "createdAt": "timestamp",
  "respondedAt": "timestamp" // quando aceito/rejeitado
}
```

---

## 💡 **PASSO 3: Como Funciona na Aplicação Real**

### **3.1 Fluxo no Frontend (Como o usuário vê)**

#### **👑 Usuário ADMIN/OWNER do Grupo:**
1. **Acessa página de Grupos**
2. **Clica em "Convidar Membro"**
3. **Insere email do convidado**
4. **Clica em "Enviar Convite"**

```typescript
// Exemplo de como seria chamado no frontend
const handleSendInvite = async (email: string, groupId: string) => {
  try {
    const result = await trpc.invitations.create.mutate({
      groupId: parseInt(groupId),
      invitedEmail: email
    });
    
    toast.success('Convite enviado com sucesso!');
  } catch (error) {
    toast.error('Erro ao enviar convite');
  }
};
```

#### **📬 Usuário CONVIDADO:**
1. **Recebe notificação na aplicação**
2. **Vê convite na seção "Convites Pendentes"**
3. **Clica em "Aceitar" ou "Rejeitar"**
4. **Se aceitar: é automaticamente adicionado ao grupo**

```typescript
// Exemplo de resposta a convite
const handleRespondInvite = async (inviteId: string, accept: boolean) => {
  try {
    await trpc.invitations.respond.mutate({
      id: parseInt(inviteId),
      accept: accept
    });
    
    toast.success(accept ? 'Convite aceito!' : 'Convite rejeitado');
  } catch (error) {
    toast.error('Erro ao responder convite');
  }
};
```

### **3.2 Fluxo no Backend (Como o sistema processa)**

#### **🔄 Envio de Convite:**
1. **Validar** se usuário tem permissão no grupo
2. **Verificar** se email já foi convidado
3. **Criar** registro de convite
4. **Verificar** se usuário existe no sistema
5. **Criar** notificação (se usuário existe)
6. **Enviar** email (opcional - não implementado ainda)

#### **✅ Aceitar Convite:**
1. **Buscar** convite por email do usuário
2. **Validar** se convite ainda está pendente
3. **Atualizar** status para "accepted"
4. **Adicionar** usuário ao grupo como "member"
5. **Criar** notificação para quem convidou
6. **Atualizar** timestamp de resposta

---

## 🛠️ **PASSO 4: Testar na Sua Aplicação**

### **4.1 Iniciar Aplicação**
```bash
# Terminal 1: Iniciar aplicação
npm run dev
```

### **4.2 Acessar Interface**
```
http://localhost:3000
```

### **4.3 Fazer Login**
1. **Clique em "Entrar com Google"**
2. **Faça login com sua conta Google**
3. **Você será criado automaticamente no sistema**

### **4.4 Testar Fluxo Completo**

#### **Scenario A: Você como ADMIN**
1. **Criar um Grupo:**
   - Ir em "Grupos"
   - Clicar "Criar Grupo"
   - Preencher nome e descrição
   - Salvar

2. **Convidar Alguém:**
   - Entrar no grupo criado
   - Clicar "Convidar Membro"
   - Inserir email de um amigo
   - Enviar convite

3. **Verificar Convite Enviado:**
   - Firebase Console > invitations
   - Confirmar que apareceu o convite

#### **Scenario B: Receber Convite**
1. **Usar outro navegador/aba anônima**
2. **Fazer login com outra conta Google**
3. **Usar o MESMO email do convite**
4. **Ver notificação de convite pendente**
5. **Aceitar convite**
6. **Ser adicionado automaticamente ao grupo**

---

## 📊 **PASSO 5: Verificar Dados Criados**

### **5.1 No Firebase Console**

**🔗 Link direto:** https://console.firebase.google.com/project/despesas-compartilhadas-vs/firestore

**Coleções que você deve ver:**
- ✅ **users** - Usuários do sistema
- ✅ **groups** - Grupos criados  
- ✅ **groupMembers** - Memberships
- ✅ **invitations** - Convites enviados
- ✅ **sharedExpenses** - Despesas compartilhadas
- ✅ **expenseSplits** - Como as despesas são divididas
- ✅ **notifications** - Notificações dos usuários

### **5.2 Dados de Exemplo Criados**

#### **Usuários:**
- 👨‍💼 **João Silva** (joao.silva@email.com)
- 👩‍💼 **Maria Santos** (maria.santos@email.com) 
- 👨‍💻 **Pedro Costa** (pedro.costa@email.com)

#### **Grupos:**
- 🏠 **Apartamento Compartilhado** (todos os 3 usuários)
- 🍕 **Galera do Trabalho** (João e Maria)
- ✈️ **Viagem Florianópolis** (só o Pedro por enquanto)

#### **Despesas de Exemplo:**
- 🛒 **Supermercado** - R$ 154,50 (dividido entre 3)
- 💡 **Conta de Luz** - R$ 89,20 (validada)
- 📱 **Internet** - R$ 99,99 (pendente)

---

## 🚨 **TROUBLESHOOTING**

### **Problema: "Firebase not configured"**
**Solução:** Verificar arquivo `.env` tem todas as variáveis:
```env
VITE_FIREBASE_API_KEY=sua-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=despesas-compartilhadas-vs.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=despesas-compartilhadas-vs
# ... outras variáveis
```

### **Problema: "Permission denied"**
**Solução:** 
1. Verificar regras do Firestore estão aplicadas
2. Deploy das regras: `firebase deploy --only firestore:rules`

### **Problema: Scripts não executam**
**Solução:**
```bash
# Dar permissão aos scripts
chmod +x scripts/*.js

# Ou executar diretamente
node scripts/seed-firebase.js
node scripts/test-invitations.js
```

### **Problema: Usuário não recebe convite**
**Causa:** Email do convite diferente do email de login
**Solução:** Usar EXATAMENTE o mesmo email nos dois casos

---

## 🎉 **RESULTADO FINAL**

Após seguir este guia você terá:

✅ **Firebase configurado e funcionando**
✅ **Sistema de autenticação Google**  
✅ **Criação de grupos**
✅ **Sistema de convites completo**
✅ **Notificações automáticas**
✅ **Despesas compartilhadas**
✅ **Divisão automática de valores**

### **🔥 Funcionalidades Principais:**
- **Enviar convites** por email
- **Aceitar/Rejeitar** convites
- **Notificações** em tempo real
- **Grupos** com múltiplos membros  
- **Despesas** compartilhadas automaticamente
- **Divisão** proporcional de valores
- **Validação** de despesas pelos membros

### **📱 Interface Funcional:**
- Dashboard com resumo financeiro
- Lista de grupos do usuário
- Convites pendentes
- Histórico de despesas  
- Notificações não lidas
- Perfil do usuário

---

## 🔗 **Links Importantes**

- **🔥 Firebase Console:** https://console.firebase.google.com/project/despesas-compartilhadas-vs
- **💻 Sua Aplicação:** http://localhost:3000
- **📚 Documentação Firebase:** https://firebase.google.com/docs/firestore
- **🎮 Playground Firestore:** Console > Firestore > Rules > Simulator

---

## 🎯 **Próximos Passos Sugeridos**

1. **🎨 Customizar Interface**
   - Melhorar design dos convites
   - Adicionar avatars personalizados
   - Implementar temas dark/light

2. **📧 Notificações por Email**
   - Configurar SendGrid ou similar
   - Templates de email personalizados
   - Confirmação de recebimento

3. **💰 Funcionalidades Avançadas**
   - Múltiplas moedas
   - Categorização automática
   - Relatórios mensais
   - Gráficos de gastos

4. **📱 App Mobile**
   - Build para Android/iOS
   - Push notifications
   - Modo offline

**🚀 Sua aplicação está pronta para usar! Divirta-se testando! 🎉**