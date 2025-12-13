# Publicar o backend (tRPC) para o APK funcionar sem seu PC ligado

O APK **não consegue** executar o backend Node (Express/tRPC) dentro do app. Hoje o projeto usa o backend para **criar/listar** grupos, despesas, notificações etc.

Para o APK ser independente do seu PC, você precisa **publicar o backend na nuvem** (por exemplo Cloud Run) e embutir a URL no build do app via `VITE_API_URL`.

## 1) Pré-requisitos
- Conta Google com acesso ao projeto `despesas-compartilhadas-vs`
- Google Cloud SDK (`gcloud`) instalado
- Docker instalado

## 2) Autenticar e escolher projeto
```bash
gcloud auth login
gcloud config set project despesas-compartilhadas-vs
```

## 3) Criar um Service Account para o backend (recomendado)
Crie um service account no Google Cloud Console e dê permissões mínimas para Firestore/Auth.
Depois, configure no Cloud Run como variável de ambiente `FIREBASE_SERVICE_ACCOUNT` (JSON do service account) OU use "Workload Identity".

> Dica: NÃO coloque a chave dentro do APK.

## 4) Build e deploy no Cloud Run
```bash
gcloud run deploy despesas-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

Após isso, o Cloud Run vai mostrar uma URL HTTPS, tipo:
`https://despesas-api-xxxxx-uc.a.run.app`

## 5) Apontar o APK para o backend publicado
Edite `.env.production`:
```dotenv
VITE_API_URL="https://despesas-api-xxxxx-uc.a.run.app"
```

Depois gere o APK:
```bash
pnpm run build
pnpm exec cap sync android
cd android
./gradlew.bat assembleDebug
```

O APK sai em:
`android/app/build/outputs/apk/debug/app-debug.apk`
