import { PushNotifications } from '@capacitor/push-notifications';
import type { Token } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  try {
    // Solicitar permissão
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Permissão de notificações negada');
      return null;
    }

    // Registrar para receber notificações
    await PushNotifications.register();

    return new Promise<string | null>((resolve) => {
      // Listener para quando o token for recebido
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        resolve(token.value);
      });

      // Listener para erros de registro
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
        resolve(null);
      });

      // Timeout de 10 segundos
      setTimeout(() => resolve(null), 10000);
    });
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
    return null;
  }
}

export function setupPushNotificationListeners() {
  // Notificação recebida quando app está em foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ', notification);
    
    // Você pode mostrar uma notificação customizada aqui
    // ou atualizar a UI do app
  });

  // Notificação clicada (app em background ou fechado)
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ', notification);
    
    // Aqui você pode navegar para uma tela específica
    // baseado nos dados da notificação
    const data = notification.notification.data;
    
    if (data?.screen) {
      // Exemplo: navegar para uma tela
      // window.location.href = data.screen;
    }
  });
}

// Remover todos os listeners quando não precisar mais
export function removePushNotificationListeners() {
  PushNotifications.removeAllListeners();
}
