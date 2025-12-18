# Configuração de Notificações Push - Android

## ✅ O que já está feito:

1. ✅ Plugin `@capacitor/push-notifications` instalado
2. ✅ Código de inicialização no `App.tsx`
3. ✅ Listeners configurados para receber notificações
4. ✅ `google-services.json` já está no projeto

---

## 📱 Como testar (NÃO precisa publicar na Play Store):

### 1. Rebuild do APK com plugin de notificações

Execute no terminal:

```bash
cd "c:\Users\bleno\Downloads\DEPESAS-COMPARTILHADAS-CLI-main"
pnpm build
npx cap sync android
cd android
.\gradlew assembleDebug
```

### 2. Instalar o APK no celular

O APK estará em: `android\app\build\outputs\apk\debug\app-debug.apk`

### 3. Ao abrir o app pela primeira vez:

- O app vai pedir permissão para enviar notificações
- **ACEITE a permissão**
- No console do navegador (se conectado via USB debug), você verá:
  ```
  FCM Token: ey...
  ```

---

## 🔔 Como enviar notificações de teste:

### Opção 1: Firebase Console (mais fácil)

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto: **despesas-compartilhadas-vs**
3. Menu lateral → **Messaging** (ou "Cloud Messaging")
4. Clique em **"Send your first message"** ou **"Nova campanha"**
5. Preencha:
   - **Título**: "Teste de notificação"
   - **Texto**: "Sua primeira notificação push!"
6. Clique em **"Avançar"**
7. Em **"Público-alvo"**, selecione:
   - **App**: `com.despesas.compartilhadas`
   - Ou cole o FCM Token específico do seu celular
8. Clique em **"Revisar"** → **"Publicar"**

**Resultado**: Notificação aparece na barra de notificações do Android! 🎉

---

### Opção 2: API REST (para integrar no backend)

Use o Node.js no backend para enviar notificações programaticamente:

#### Instalar SDK Admin:

```bash
cd functions  # ou onde está seu backend
pnpm add firebase-admin
```

#### Código para enviar notificação:

```typescript
import admin from 'firebase-admin';

// Inicializar (se ainda não estiver)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Função para enviar notificação
async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Notificação enviada:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return { success: false, error };
  }
}

// Exemplo de uso:
await sendPushNotification(
  'ey...token-do-usuario...',
  'Nova despesa!',
  'João adicionou R$ 150,00 em "Mercado"',
  { screen: '/shared-expenses', expenseId: '123' }
);
```

---

## 🎯 Casos de uso no seu app:

### 1. Nova despesa adicionada

Quando alguém criar uma despesa compartilhada, enviar notificação para todos do grupo:

```typescript
// No backend, após criar despesa (server/routers.ts)
const members = await db.getGroupMembers(groupId);

for (const member of members) {
  if (member.user.fcmToken && member.user.id !== ctx.user.id) {
    await sendPushNotification(
      member.user.fcmToken,
      'Nova despesa compartilhada',
      `${ctx.user.name} adicionou "${input.title}" - ${formatCents(input.amount)}`,
      { screen: '/shared-expenses', groupId, expenseId }
    );
  }
}
```

### 2. Acerto de contas registrado

```typescript
await sendPushNotification(
  toUser.fcmToken,
  'Pagamento registrado',
  `${fromUser.name} registrou um pagamento de R$ ${amount/100}`,
  { screen: '/group-balances', settlementId }
);
```

### 3. Convite para grupo

```typescript
await sendPushNotification(
  invitedUser.fcmToken,
  'Novo convite de grupo',
  `${inviter.name} te convidou para "${groupName}"`,
  { screen: '/invitations', invitationId }
);
```

---

## 💾 Salvar FCM Token no backend:

### 1. Adicionar campo no Firestore:

Na collection `users`, adicione campo `fcmToken`:

```typescript
// server/db-firestore.ts
export async function updateUserFcmToken(userId: string, fcmToken: string) {
  const db = adminDb();
  await db.collection('users').doc(userId).set({ 
    fcmToken,
    fcmTokenUpdatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}
```

### 2. Criar endpoint no backend:

```typescript
// server/routers.ts - adicionar em auth router
saveFcmToken: protectedProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await db.updateUserFcmToken(ctx.user.id!, input.token);
    return { success: true };
  }),
```

### 3. Chamar do frontend:

```typescript
// client/src/App.tsx - já está no código
useEffect(() => {
  if (Capacitor.isNativePlatform()) {
    initPushNotifications().then((token) => {
      if (token) {
        // Salvar no backend
        trpc.auth.saveFcmToken.mutate({ token });
      }
    });
  }
}, []);
```

---

## 🧪 Testando localmente:

### Via USB Debug (Chrome DevTools):

1. Conecte celular via USB
2. Ative **Depuração USB** no Android
3. Chrome → `chrome://inspect`
4. Inspecione o app
5. No Console, veja o FCM Token registrado
6. Use esse token para enviar notificação de teste pelo Firebase Console

### Via Logcat:

```bash
adb logcat | grep -i "fcm\|push\|token"
```

---

## ⚙️ Configurações avançadas:

### Customizar ícone da notificação:

Crie ícone em `android/app/src/main/res/drawable/`:
- `ic_stat_notification.png` (48x48px, branco transparente)

### Customizar som:

Adicione arquivo `.mp3` em `android/app/src/main/res/raw/notification_sound.mp3`

### Canais de notificação (Android 8+):

```typescript
// No código nativo Android (MainActivity.java)
NotificationChannel channel = new NotificationChannel(
    "default",
    "Notificações Gerais",
    NotificationManager.IMPORTANCE_HIGH
);
channel.setDescription("Despesas, pagamentos e convites");
```

---

## 🚨 Troubleshooting:

### Notificação não aparece:

1. **Verificar permissão**: Configurações → Apps → Despesas Compartilhadas → Notificações → Ativado?
2. **Verificar token**: Console do app deve mostrar `FCM Token: ey...`
3. **Verificar Firebase**: Projeto correto? `google-services.json` atualizado?
4. **Modo Não Perturbe**: Desative temporariamente

### Token não é gerado:

1. Rebuild completo: `pnpm build && npx cap sync android`
2. Verificar `google-services.json` está no `android/app/`
3. Limpar cache: `cd android && .\gradlew clean`

### Notificação só aparece com app aberto:

- Normal! Firebase envia notificações diferentes dependendo do estado do app
- Use `data-only messages` para controle total

---

## 📊 Monitoramento:

Firebase Console → Cloud Messaging → Relatórios:
- Notificações enviadas
- Taxa de entrega
- Taxa de abertura
- Erros

---

## 🎉 Resultado Final:

✅ Usuário recebe notificação **na barra de status do Android**  
✅ Som + vibração (se configurado)  
✅ Clicar na notificação abre o app na tela certa  
✅ Funciona com app **fechado, em background ou aberto**  
✅ **NÃO precisa publicar na Play Store para testar!**

---

**Próximos passos:**
1. Rebuild do APK (comandos acima)
2. Instalar no celular
3. Aceitar permissão de notificações
4. Copiar FCM Token do console
5. Testar enviando via Firebase Console

Depois de testar, integre no backend para enviar notificações automáticas! 🚀
