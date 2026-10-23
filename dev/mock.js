/* Стенд для локальной проверки: направляет приложение на мост-стенд (dev/crm_dev_app.py). В продакшен не загружать. */
(function () {
  var DEV = 'http://127.0.0.1:' + (window.DEV_BRIDGE_PORT || 8795);      // порт моста-стенда задаёт serve.py (второй аргумент)
  try {
    localStorage.setItem('ds_bridge', JSON.stringify({ url: DEV, key: 'demo-key-demo-key-demo-key' }));
  } catch (e) {}
})();
