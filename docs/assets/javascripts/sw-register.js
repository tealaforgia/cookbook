if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(reg => {
        console.log("[SW] Registrazione completata:", reg.scope);
      })
      .catch(err => {
        console.error("[SW] Registrazione fallita:", err);
      });
  });
}
