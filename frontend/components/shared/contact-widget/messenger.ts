/**
 * Lazy-loads the Facebook Messenger Customer Chat Plugin on demand.
 * The default launcher stays hidden; we open chat via FB.CustomerChat.showDialog().
 */

declare global {
  interface Window {
    FB?: {
      init: (params: { xfbml: boolean; version: string }) => void;
      CustomerChat: {
        showDialog: () => void;
        show: () => void;
        hide: () => void;
      };
    };
    fbAsyncInit?: () => void;
  }
}

const SDK_ID = 'facebook-jssdk-customerchat';
const SDK_SRC = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
const SDK_VERSION = 'v21.0';

let sdkPromise: Promise<void> | null = null;

function ensureMessengerMarkup(pageId: string): void {
  if (!document.getElementById('fb-root')) {
    const root = document.createElement('div');
    root.id = 'fb-root';
    document.body.appendChild(root);
  }

  if (!document.querySelector('.fb-customerchat')) {
    const chat = document.createElement('div');
    chat.className = 'fb-customerchat';
    chat.setAttribute('data-page_id', pageId);
    chat.setAttribute('data-greeting_dialog_display', 'hide');
    chat.setAttribute('data-attribution', 'elevate_apparel');
    document.body.appendChild(chat);
  }
}

function waitForCustomerChat(timeoutMs = 12_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.FB?.CustomerChat) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Messenger Customer Chat did not become available'));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

export function loadMessengerCustomerChat(pageId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!pageId) return Promise.reject(new Error('Facebook Page ID is not configured'));

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    ensureMessengerMarkup(pageId);

    window.fbAsyncInit = () => {
      window.FB?.init({ xfbml: true, version: SDK_VERSION });
      waitForCustomerChat()
        .then(resolve)
        .catch(reject);
    };

    if (document.getElementById(SDK_ID)) {
      waitForCustomerChat().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_ID;
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Failed to load Messenger Customer Chat SDK'));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export async function openMessengerCustomerChat(pageId: string): Promise<void> {
  await loadMessengerCustomerChat(pageId);
  window.FB?.CustomerChat.showDialog();
}
