// Принимает push-уведомления, когда приложение закрыто или свёрнуто (в том числе на iPhone).
// Уведомление показывает сам Firebase: заголовок, текст и ссылка приходят с сервера (Apps Script).
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD8e8r_S4DIsSunECf-gCZLRyPS6dLla40",
  authDomain: "projekt-135fc.firebaseapp.com",
  projectId: "projekt-135fc",
  storageBucket: "projekt-135fc.firebasestorage.app",
  messagingSenderId: "262017734397",
  appId: "1:262017734397:web:52efedd5b90420431a9094"
});

firebase.messaging();
