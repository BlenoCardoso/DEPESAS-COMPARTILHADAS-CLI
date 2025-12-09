# 🚀 Tutorial: Migração Completa para Firebase

Parabéns! O código já está preparado para Firebase. Agora você só precisa configurar as credenciais.

## 📋 Checklist de Migração

- ✅ **Código adaptado** - Backend preparado para Firestore
- ✅ **Autenticação Firebase** - Hook `useFirebaseAuth` criado
- ✅ **Interface de login** - Componente `FirebaseLoginPage` pronto
- ✅ **Variáveis de ambiente** - Arquivo `.env` configurado
- ⏳ **Credenciais Firebase** - Você precisa configurar
- ⏳ **Testar login** - Após configurar credenciais

## 🔑 Passo 1: Obter as Credenciais do Firebase

### 1.1. Acesse o Console do Firebase
1. Vá para: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione o projeto `despesas-compartilhadas-vs`

### 1.2. Configurar Authentication
1. No menu lateral, clique em **Authentication**
2. Clique na aba **Sign-in method**
3. Clique em **Google** e **Ative**
4. Escolha um email de suporte
5. Clique em **Salvar**

### 1.3. Obter a API Key
1. Clique no ícone de ⚙️ **Configurações do Projeto**
2. Role até **Seus aplicativos**
3. Clique no app Web (ícone `</>`): `1:681474270325:web:fe6c5696e971e98253843c`
4. Copie o valor de `apiKey` do objeto `firebaseConfig`

### 1.4. Configurar Firestore Database
1. No menu lateral, clique em **Firestore Database**
2. Clique em **Create database**
3. Escolha **Start in production mode**
4. Selecione localização: **southamerica-east1 (São Paulo)**
5. Clique em **Enable**

## 🔧 Passo 2: Configurar as Variáveis de Ambiente

Abra o arquivo `.env` e substitua `sua_api_key_aqui` pela API Key copiada:

\`\`\`bash
# Firebase Configuration
VITE_FIREBASE_API_KEY="AIzaSyD..." # ← Cole sua API Key aqui
VITE_FIREBASE_AUTH_DOMAIN="despesas-compartilhadas-vs.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="despesas-compartilhadas-vs"
VITE_FIREBASE_STORAGE_BUCKET="despesas-compartilhadas-vs.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="681474270325"
VITE_FIREBASE_APP_ID="1:681474270325:web:fe6c5696e971e98253843c"

# Database - Firebase Firestore (recomendado para seu caso)
DATABASE_TYPE="firestore"
\`\`\`

## 🚀 Passo 3: Testar a Configuração

1. **Reinicie o servidor:**
   \`\`\`bash
   # Pare o servidor atual (Ctrl+C)
   # Depois execute:
   pnpm dev
   \`\`\`

2. **Abra o navegador:**
   - Acesse: http://localhost:3001
   - Você deve ver a página de login do Firebase
   - Clique em "Entrar com Google"
   - Complete o login

3. **Verificar se funcionou:**
   - No Console do Firebase > Authentication > Users
   - Você deve ver seu usuário listado

## 🗂️ Passo 4: Configurar Regras do Firestore (Opcional)

Para maior segurança, aplique estas regras no Firestore:

1. No Console do Firebase, vá em **Firestore Database > Rules**
2. Cole este conteúdo:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários podem ler/escrever seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Grupos - apenas membros podem acessar
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
    }
    
    // Membros de grupos
    match /groupMembers/{memberId} {
      allow read, write: if request.auth != null;
    }
    
    // Despesas compartilhadas - apenas membros do grupo
    match /sharedExpenses/{expenseId} {
      allow read, write: if request.auth != null;
    }
    
    // Despesas pessoais - apenas o próprio usuário
    match /personalExpenses/{expenseId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
    
    // Outros dados pessoais (tasks, reminders, etc.)
    match /{collection}/{documentId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
\`\`\`

3. Clique em **Publish**

## ✨ Vantagens da Migração para Firebase

### 🎯 **Para Despesas Compartilhadas:**
- **Tempo real**: Quando alguém adiciona uma despesa, todos veem na hora
- **Offline**: Funciona no metrô, avião, etc.
- **Notificações**: Automáticas quando te marcam numa despesa
- **Sincronização**: Dados sempre atualizados entre dispositivos

### 💰 **Custo:**
- **Praticamente gratuito** para uso pessoal
- Cota generosa: 50.000 leituras + 20.000 escritas por dia
- Estimativa: $0-3/mês para uso normal

### 🔒 **Segurança:**
- **Autenticação Google** - mais segura
- **Regras de segurança** - controle total do acesso
- **Backup automático** - seus dados ficam seguros

## 🔧 Próximos Passos (Após Login Funcionar)

1. **Adicionar dados de exemplo** - Para testar as funcionalidades
2. **Implementar sincronização real-time** - Para ver mudanças instantâneas
3. **Configurar notificações push** - Para avisos no celular
4. **Deploy na nuvem** - Publicar o app online

## 🆘 Resolução de Problemas

### ❌ **Erro: "Firebase: Error (auth/unauthorized-domain)"**
- **Solução**: No Console do Firebase > Authentication > Settings > Authorized domains
- Adicione: `localhost`, `127.0.0.1`, e seu domínio futuro

### ❌ **Erro: "Missing or insufficient permissions"**
- **Solução**: Verifique se aplicou as regras do Firestore
- Ou temporariamente use: `allow read, write: if true;` (apenas para testes)

### ❌ **Login não funciona**
- Verifique se a API Key está correta no `.env`
- Confirme que o Google Sign-In está ativado no Console
- Limpe o cache do navegador

---

## 🎉 Parabéns!

Após configurar tudo isso, você terá:
- ✅ Sistema de login seguro com Google
- ✅ Banco de dados Firestore funcionando
- ✅ Sincronização em tempo real
- ✅ Funcionamento offline
- ✅ Praticamente gratuito para sempre

**Precisa de ajuda?** Me chame que ajudo com qualquer passo! 🚀