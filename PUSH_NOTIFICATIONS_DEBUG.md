# 🔔 Guia de Debug - Notificações Push

## ✅ APK Atualizado com Debug

**Localização**: `android\app\build\outputs\apk\debug\app-debug.apk`

**O que mudou:**
- ✅ Logs detalhados com emojis no console
- ✅ Alertas visuais em cada etapa (você verá popups)
- ✅ Valores agora em **REAIS** (ex: "25,99" ou "25.99")

---

## 📱 Passo a passo para testar AGORA:

### 1. Desinstalar versão antiga (importante!)
```
Configurações → Apps → Despesas Compartilhadas → Desinstalar
```

### 2. Instalar novo APK
- Transferir `app-debug.apk` para o celular
- Clicar no arquivo e instalar

### 3. Abrir o app e observar os alertas:

Você verá uma sequência de popups:

**🔔 Alert 1**: "Solicitando permissão..."
- **Ação**: Clique em **PERMITIR** quando aparecer o popup do Android

**✅ Alert 2**: "Permissão concedida! Registrando..."
- Significa que você aceitou as notificações

**✅ Alert 3**: "Notificações ativadas! Token: ey..."
- **IMPORTANTE**: Copie esse token! Você vai precisar dele

---

## 🧪 Enviar notificação de teste:

### Opção 1: Firebase Console (MELHOR para testar)

1. Abra [Firebase Console](https://console.firebase.google.com)
2. Selecione projeto: **despesas-compartilhadas-vs**
3. Menu → **Messaging** (ou "Envio de mensagens")
4. Botão **"Nova campanha"** → **"Mensagens de notificação do Firebase"**
5. Preencher:
   - **Título**: "Teste Funcionou!"
   - **Texto**: "Você recebeu esta notificação 🎉"
6. Clicar **"Próxima"**
7. Em **"Selecionar público-alvo"**:
   
   **IMPORTANTE**: Escolha uma das opções:
   
   **Opção A** - Enviar para o app inteiro:
   - Selecione: `com.despesas.compartilhadas (Android app)`
   - Prós: Envia para todos os celulares
   - Contras: Se houver múltiplos celulares testando, todos receberão
   
   **Opção B** - Enviar só para SEU celular (RECOMENDADO):
   - Clique em **"Enviar mensagem de teste"** (link azul no topo)
   - Cole o **token FCM** que apareceu no popup do app
   - Clique no **+** para adicionar
   - Clique em **"Testar"**

8. Se escolheu Opção A, clique em **"Revisar"** → **"Publicar"**

---

## 🎯 O que você DEVE ver:

### App FECHADO ou em BACKGROUND:
1. **Notificação aparece na barra de status do Android** (topo)
2. Som de notificação (se não estiver no silencioso)
3. Ícone do app com badge
4. Ao clicar: app abre + alert "Você clicou em: Teste Funcionou!"

### App ABERTO:
1. Alert imediato: "Nova notificação: Teste Funcionou!"
2. Não aparece na barra de status (comportamento normal)

---

## 🚨 Se NÃO funcionar:

### Checklist completo:

#### 1. **Verificar permissões no Android**
```
Configurações → Apps → Despesas Compartilhadas → Permissões → Notificações
```
- Deve estar **ATIVADO**
- Se estiver desativado, ative manualmente

#### 2. **Verificar se o token foi gerado**

Conecte o celular no PC via USB e rode:
```bash
# Ativar depuração USB no Android
# Depois rodar no PC:
adb logcat | findstr "FCM\|Token\|Push"
```

Procure por linhas como:
```
✅ Token FCM recebido: eyJhbG...
```

**Se NÃO aparecer token:**
- Google Services está configurado? Verifique `android/app/google-services.json`
- Internet está funcionando no celular?
- Firebase Cloud Messaging está ATIVADO no console?

#### 3. **Verificar se o app está conectando ao Firebase**

No Firebase Console → Project Settings → General:
- **Nome do projeto**: despesas-compartilhadas-vs
- **Project ID**: despesas-compartilhadas-vs
- **Web API Key**: confere com o do app?

#### 4. **Verificar SHA1 do app**

O `google-services.json` precisa ter o SHA1 correto. Rode:

```bash
cd android
.\gradlew signingReport
```

Procure pela linha `SHA1: ...` em **debug**.

No Firebase Console → Project Settings → SHA certificate fingerprints:
- **Adicione esse SHA1** se não estiver lá!

#### 5. **Testar com curl (sem o app)**

```bash
# Pegar Server Key do Firebase:
# Firebase Console → Project Settings → Cloud Messaging → Server Key

curl -X POST \
  https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=SEU_SERVER_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "TOKEN_FCM_DO_SEU_CELULAR",
    "notification": {
      "title": "Teste Direto",
      "body": "Se chegou, FCM está OK!"
    }
  }'
```

Se funcionar = Firebase OK, problema está no app.
Se NÃO funcionar = Firebase ou token incorreto.

---

## 💡 Valores em REAIS - Como usar:

### Criar despesa:
- **Antes**: Digite "2599" para R$ 25,99
- **AGORA**: Digite "25,99" ou "25.99" ✅

**Aceita:**
- `25,99` (formato BR)
- `25.99` (formato US)
- `1.234,56` (mil duzentos e trinta e quatro reais)
- `1234.56` (sem separador de milhares)
- `25` (vinte e cinco reais)

**Conversão automática para centavos no backend!**

---

## 📊 Próximos passos (depois de funcionar):

1. **Salvar token FCM no backend** (código já está preparado)
2. **Enviar notificações automáticas**:
   - Nova despesa compartilhada
   - Pagamento registrado
   - Convite para grupo
   - Despesa recorrente vencendo

3. **Customizar notificações**:
   - Som personalizado
   - Ícone customizado
   - Cores e badges

---

## 🆘 Ainda não funciona?

**Me envie essas informações:**

1. Output do alert quando abrir o app (tire screenshot)
2. Versão do Android
3. Marca/modelo do celular
4. Tem outras apps com notificação funcionando? (WhatsApp, etc)
5. Se conectar via USB, rode: `adb logcat -s PushNotifications:V`

**Possíveis problemas:**
- ❌ Modo economia de bateria bloqueando o app
- ❌ Otimizador de bateria matando serviços em background
- ❌ App está em "lista de bloqueio" do Android
- ❌ Firewall ou VPN bloqueando FCM (porta 5228-5230)

**Soluções:**
```
Configurações → Bateria → Otimização de bateria → 
  Despesas Compartilhadas → NÃO OTIMIZAR
```

---

**Status**: 🔧 Testando com logs detalhados

Se você ver o alert com o token, FCM está funcionando! 🎉
