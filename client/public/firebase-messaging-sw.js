/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker used in development and production builds.
// Needs to live at the web root so the SDK can auto-register it.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC6v-W4ivObIkXO9TMGyrT6W5xJrSjJ5uY",
  authDomain: "despesas-compartilhadas-vs.firebaseapp.com",
  projectId: "despesas-compartilhadas-vs",
  storageBucket: "despesas-compartilhadas-vs.firebasestorage.app",
  messagingSenderId: "681474270325",
  appId: "1:681474270325:web:fe6c5696e971e98253843c",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title ?? "Nova notificação";
  const options = {
    body: payload.notification?.body ?? "Você recebeu um novo alerta.",
    icon: payload.notification?.icon ?? "/icons/icon-192.png",
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});
