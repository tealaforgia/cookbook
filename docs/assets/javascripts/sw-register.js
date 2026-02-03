let deferredPrompt = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(reg => console.log("[SW] Registrato:", reg.scope))
      .catch(err => console.error("[SW] Errore:", err));
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  updateInstallButton();
});

function isIOS() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isStandalone() {
  const isStandaloneIOS = ('standalone' in window.navigator) && (window.navigator.standalone);
  const isStandaloneModern = window.matchMedia('(display-mode: standalone)').matches;
  return isStandaloneIOS || isStandaloneModern;
}

function setButtonState(btn, state) {
  const currentText = btn.textContent;
  const isCurrentlyDisabled = btn.hasAttribute("disabled");
  const isCurrentlyPrimary = btn.classList.contains("md-button--primary");

  if (currentText !== state.text) btn.textContent = state.text;
  
  if (state.disabled && !isCurrentlyDisabled) {
    btn.setAttribute("disabled", true);
  } else if (!state.disabled && isCurrentlyDisabled) {
    btn.removeAttribute("disabled");
  }

  if (state.primary && !isCurrentlyPrimary) {
    btn.classList.add("md-button--primary");
  } else if (!state.primary && isCurrentlyPrimary) {
    btn.classList.remove("md-button--primary");
  }

  btn.onclick = state.action;
}

function openIOSModal() {
  if (!document.querySelector('.ios-modal-overlay')) {
    const modalHTML = `
      <div class="ios-modal-overlay" onclick="closeIOSModal(event)">
        <div class="ios-modal-content">
          <div class="ios-modal-title">Hello Friend. 🍎</div>
          
          <p class="ios-intro-text">
            La Evil Corp (ehm, Apple) blocca l'installazione automatica.<br>Non lasciare che vincano loro:
          </p>
          
          <div class="ios-instructions-list">
            <div class="ios-instruction-step">
              <span class="ios-step-number">1</span>
              <span>Tocca <strong>Condividi</strong> nella barra in basso</span>
              <svg class="ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
            </div>
            
            <div class="ios-instruction-step">
              <span class="ios-step-number">2</span>
              <span>Scorri sotto e clicca <strong>Aggiungi alla schermata Home</strong></span>
              <svg class="ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                 <line x1="12" y1="8" x2="12" y2="16"></line>
                 <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
          </div>

          <button class="ios-modal-btn" onclick="closeIOSModal(event, true)">
            Ho capito
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  setTimeout(() => {
    document.querySelector('.ios-modal-overlay').classList.add('active');
  }, 10);
}

window.closeIOSModal = function(e, force = false) {
  if (force || e.target.classList.contains('ios-modal-overlay')) {
    const overlay = document.querySelector('.ios-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  }
}

function updateInstallButton() {
  const btn = document.getElementById("pwa-install-btn");
  if (!btn) return;

  if (isStandalone()) {
    setButtonState(btn, {
      text: "App aperta",
      disabled: true,
      primary: false,
      action: null
    });
    return;
  }

  if (isIOS()) {
    setButtonState(btn, {
      text: "Installa su iOS",
      disabled: false,
      primary: true,
      action: () => {
         openIOSModal();
      }
    });
    return;
  }

  if (deferredPrompt) {
    setButtonState(btn, {
      text: "Installa App",
      disabled: false,
      primary: true,
      action: handleInstallClick
    });
    return;
  }

  setButtonState(btn, {
    text: "App non disponibile o già installata",
    disabled: true,
    primary: false,
    action: null
  });
}

async function handleInstallClick() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  updateInstallButton();
}

const observer = new MutationObserver(() => updateInstallButton());
observer.observe(document.body, { childList: true, subtree: true });

updateInstallButton();