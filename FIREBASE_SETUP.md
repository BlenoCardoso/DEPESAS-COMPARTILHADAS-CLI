# 🔥 Configuração Completa do Firebase

Este documento contém todas as instruções para configurar o Firebase para o projeto **Despesas Compartilhadas**.

## 📋 Informações do Projeto

- **Project ID**: `despesas-compartilhadas-vs`
- **Web App ID**: `1:681474270325:web:fe6c5696e971e98253843c`
- **Android App ID**: `1:681474270325:android:73d53bd72a0ba12453843c`

## 🔑 1. Obter a API Key do Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `despesas-compartilhadas-vs`
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Role até a seção **Seus aplicativos**
5. Clique no app Web (`1:681474270325:web:fe6c5696e971e98253843c`)
6. Copie o valor de `apiKey` do objeto `firebaseConfig`
7. Cole no arquivo `client/src/lib/firebase.ts` substituindo `AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

## 🔐 2. Configurar Authentication

### 2.1. Ativar Google Sign-In

1. No Console do Firebase, vá em **Authentication**
2. Clique na aba **Sign-in method**
3. Clique em **Google**
4. Ative o provedor Google
5. Escolha um email de suporte
6. Clique em **Salvar**

### 2.2. Adicionar domínios autorizados

1. Ainda em **Authentication** > **Settings**
2. Na seção **Authorized domains**, adicione:
   - `localhost` (já deve estar)
   - `manusvm.computer` (para desenvolvimento)
   - Seu domínio personalizado (se tiver)

## 🗄️ 3. Configurar Firestore Database

### 3.1. Criar o banco de dados

1. No Console do Firebase, vá em **Firestore Database**
2. Clique em **Create database**
3. Escolha **Start in production mode** (vamos configurar as regras depois)
4. Escolha a localização: **southamerica-east1 (São Paulo)**
5. Clique em **Enable**

### 3.2. Aplicar regras de segurança

Você tem duas opções:

**Opção A: Via Console (Manual)**

1. No Firestore Database, vá na aba **Rules**
2. Cole o conteúdo do arquivo `firestore.rules` deste projeto
3. Clique em **Publish**

**Opção B: Via Firebase CLI (Recomendado)**

```bash
# No diretório do projeto
firebase deploy --only firestore:rules
```

### 3.3. Configurar índices compostos

**Opção A: Via Console (Manual)**

Os índices serão criados automaticamente quando você fizer as primeiras queries. O Firebase mostrará um link no console para criar os índices necessários.

**Opção B: Via Firebase CLI (Recomendado)**

```bash
# No diretório do projeto
firebase deploy --only firestore:indexes
```

## 📱 4. Configurar o App Android

### 4.1. Baixar google-services.json

1. No Console do Firebase, vá em **Configurações do Projeto**
2. Role até **Seus aplicativos**
3. Clique no app Android (`1:681474270325:android:73d53bd72a0ba12453843c`)
4. Clique em **Baixar google-services.json**
5. Salve o arquivo em `android/app/google-services.json`

### 4.2. Configurar SHA-1 (para Google Sign-In)

```bash
# Gerar SHA-1 de debug
cd android
./gradlew signingReport

# Copie o SHA-1 que aparece
```

Depois:
1. No Console do Firebase, vá em **Configurações do Projeto**
2. Role até o app Android
3. Clique em **Adicionar impressão digital**
4. Cole o SHA-1 copiado
5. Clique em **Salvar**

## 🚀 5. Deploy via Firebase CLI

### 5.1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 5.2. Fazer login

```bash
firebase login:ci
```

Use um token gerado na sua conta (NÃO versionar tokens reais). Exemplo de formato:
```
1//EXEMPLO_DE_TOKEN_AQUI
```

### 5.3. Inicializar Firebase no projeto

```bash
# No diretório do projeto
firebase init

# Selecione:
# - Firestore
# - Authentication (opcional)
# - Use o projeto existente: despesas-compartilhadas-vs
# - Aceite os arquivos padrão (firestore.rules e firestore.indexes.json)
```

### 5.4. Deploy completo

```bash
# Deploy de regras e índices
firebase deploy --only firestore

# Ou deploy completo
firebase deploy
```

## ✅ 6. Verificar Configuração

### 6.1. Testar autenticação

1. Rode o projeto: `npm run dev`
2. Abra no navegador
3. Clique em "Entrar com Google"
4. Verifique se o login funciona
5. No Console do Firebase > Authentication > Users, você deve ver seu usuário

### 6.2. Testar Firestore

1. Crie um grupo no aplicativo
2. No Console do Firebase > Firestore Database
3. Você deve ver a coleção `groups` com seu grupo

### 6.3. Verificar regras

1. No Console do Firebase > Firestore Database > Rules
2. Clique em **Simulator**
3. Teste algumas operações para verificar se as regras estão funcionando

## 🔧 7. Troubleshooting

### Erro: "Firebase: Error (auth/unauthorized-domain)"

**Solução**: Adicione o domínio em Authentication > Settings > Authorized domains

### Erro: "Missing or insufficient permissions"

**Solução**: Verifique se as regras do Firestore foram aplicadas corretamente

### Erro: "The query requires an index"

**Solução**: Clique no link fornecido pelo Firebase no console ou aplique os índices via CLI

### Google Sign-In não funciona no Android

**Solução**: Verifique se:
1. O arquivo `google-services.json` está no lugar certo
2. O SHA-1 foi adicionado no Console do Firebase
3. O package name está correto

## 📚 Recursos Adicionais

- [Documentação do Firebase](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Capacitor Firebase Plugin](https://capacitorjs.com/docs/apis/firebase)

## 🎉 Pronto!

Após seguir todos esses passos, seu Firebase estará completamente configurado e pronto para uso!
