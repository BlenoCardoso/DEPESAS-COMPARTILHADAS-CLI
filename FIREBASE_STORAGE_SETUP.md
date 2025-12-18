# Configuração Firebase Storage - Anexos de Comprovantes

## 📋 O que você precisa fazer no Firebase Console

### 1. Ativar Firebase Storage

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**
4. Clique em **Começar** (ou "Get started")
5. Escolha o local do servidor (recomendado: `southamerica-east1` para Brasil)
6. Clique em **Concluir**

### 2. Configurar Regras de Segurança

Após ativar o Storage, você verá uma aba **Rules**. Substitua as regras padrão por estas:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Pasta de anexos de despesas compartilhadas
    match /expense-attachments/{groupId}/{expenseId}/{fileName} {
      // Permitir leitura para membros do grupo
      allow read: if request.auth != null 
        && exists(/databases/(default)/documents/groupMembers/$(request.auth.uid + '_' + groupId));
      
      // Permitir upload (max 10MB) para membros autenticados
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024
        && request.resource.contentType.matches('image/.*')
        && exists(/databases/(default)/documents/groupMembers/$(request.auth.uid + '_' + groupId));
      
      // Permitir delete apenas do criador ou owner do grupo
      allow delete: if request.auth != null
        && (resource.metadata.uploadedBy == request.auth.uid 
            || get(/databases/(default)/documents/groups/$(groupId)).data.ownerId == request.auth.uid);
    }
    
    // Pasta de avatars de usuários (opcional futura)
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
    
    // Negar acesso a tudo que não está especificado
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**O que essas regras fazem:**

- ✅ **Leitura**: Apenas membros do grupo podem ver anexos
- ✅ **Upload**: Apenas membros autenticados, imagens até 10MB
- ✅ **Delete**: Apenas quem enviou ou o dono do grupo
- ✅ **Segurança**: Organização por `groupId/expenseId/fileName`

### 3. Testar a Configuração

1. Na aba **Files** do Storage, você verá a estrutura vazia
2. Após publicar as regras, o app poderá fazer uploads automaticamente
3. A estrutura de pastas será criada conforme os uploads acontecem:
   ```
   expense-attachments/
     └── {groupId}/
         └── {expenseId}/
             ├── comprovante_1.jpg
             ├── nota_fiscal.png
             └── recibo.jpg
   ```

### 4. Obter Configuração do Storage (já está no firebase.json)

Seu arquivo `firebase.json` já deve ter:

```json
{
  "storage": {
    "rules": "storage.rules"
  }
}
```

Se não tiver, adicione essa seção.

## 🔧 Como funciona no App

### Upload de Anexo
1. Usuário clica em "Adicionar Comprovante" ao criar/editar despesa
2. Seleciona foto da galeria ou câmera
3. Imagem é comprimida e enviada para Storage
4. URL do anexo é salva no campo `attachmentUrl` da despesa

### Visualização
1. Lista de despesas mostra ícone 📎 para despesas com anexo
2. Click no ícone abre modal com preview da imagem
3. Opção de baixar ou compartilhar

### Exclusão
1. Ao deletar despesa, anexo também é removido do Storage
2. Ou usar botão "Remover Anexo" ao editar despesa

## 📊 Monitoramento

No Firebase Console > Storage > Files:
- Veja todos os arquivos enviados
- Monitore uso de espaço (plano Spark: 5GB grátis)
- Delete arquivos manualmente se necessário

No Firebase Console > Storage > Usage:
- Tráfego de download/upload
- Espaço usado
- Custos (plano Blaze)

## ⚠️ Importante

- **Plano Spark (grátis)**: 5GB storage, 1GB download/dia
- **Plano Blaze (pago)**: $0.026/GB storage/mês, $0.12/GB download
- Imagens são automaticamente comprimidas no app antes do upload
- Use formatos modernos (WebP) para economizar espaço

## 🚀 Depois de configurar

1. Salve as regras no Firebase Console
2. Copie o bucket name (geralmente `{seu-projeto}.appspot.com`)
3. Teste fazendo upload de uma imagem no app
4. Verifique no Console se apareceu em Storage > Files

---

**Status**: ⏳ Aguardando configuração manual no Firebase Console

Depois de configurar, o sistema de anexos funcionará automaticamente! 🎉
