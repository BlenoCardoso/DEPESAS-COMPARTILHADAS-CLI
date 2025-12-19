import { PushNotifications } from '@capacitor/push-notifications';
import type { Token } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  try {
    console.log('🔔 Iniciando configuração de notificações push...');
    
    // Solicitar permissão
    let permStatus = await PushNotifications.checkPermissions();
    console.log('📱 Status de permissão:', permStatus);

    if (permStatus.receive === 'prompt') {
      console.log('⏳ Solicitando permissão ao usuário...');
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.error('❌ Permissão de notificações negada');
      alert('Permissão de notificações negada. Ative nas configurações do app.');
      return null;
    }

    console.log('✅ Permissão concedida! Registrando para receber notificações...');
    
    // Registrar para receber notificações
    await PushNotifications.register();

    return new Promise<string | null>((resolve) => {
      // Listener para quando o token for recebido
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('✅ Token FCM recebido:', token.value);
        alert('Notificações ativadas! Token: ' + token.value.substring(0, 20) + '...');
        resolve(token.value);
      });

      // Listener para erros de registro
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Erro ao registrar notificações:', error);
        alert('Erro ao ativar notificações: ' + JSON.stringify(error));
        resolve(null);
      });

      // Timeout de 10 segundos
      setTimeout(() => {
        console.warn('⚠️ Timeout ao aguardar token FCM');
        resolve(null);
      }, 10000);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar notificações:', error);
    alert('Erro ao inicializar notificações: ' + error);
    return null;
  }
}

export function setupPushNotificationListeners() {
  console.log('🎧 Configurando listeners de notificações...');
  
  // Notificação recebida quando app está em foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('📩 Notificação recebida (app aberto):', notification);
    alert('Nova notificação: ' + notification.title + '\n' + notification.body);
    
    // Você pode mostrar uma notificação customizada aqui
    // ou atualizar a UI do app
  });

  // Notificação clicada (app em background ou fechado)
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('👆 Notificação clicada:', notification);
    alert('Você clicou em: ' + notification.notification.title);
    
    // Aqui você pode navegar para uma tela específica
    // baseado nos dados da notificação
    const data = notification.notification.data;
    
    if (data?.screen) {
      // Exemplo: navegar para uma tela
      // window.location.href = data.screen;
    }
  });
  
  console.log('✅ Listeners configurados com sucesso!');
}

// Remover todos os listeners quando não precisar mais
export function removePushNotificationListeners() {
  PushNotifications.removeAllListeners();
}
