// Simple in-app debug overlay for mobile where console is not accessible
// Usage:
//  import { debugLog, debugSetHeader } from '../utils/debugOverlay';
//  debugSetHeader('Router: HashRouter (android)');
//  debugLog('Profile clicked -> /profile');

let overlay: HTMLDivElement | null = null;
let headerEl: HTMLDivElement | null = null;
let listEl: HTMLUListElement | null = null;

function ensureOverlay() {
  if (typeof document === 'undefined') return;
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.left = '8px';
  overlay.style.right = '8px';
  overlay.style.bottom = '8px';
  overlay.style.zIndex = '999999';
  overlay.style.pointerEvents = 'none';

  // Container
  const container = document.createElement('div');
  container.style.background = 'rgba(0,0,0,0.7)';
  container.style.color = '#fff';
  container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  container.style.fontSize = '12px';
  container.style.borderRadius = '10px';
  container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
  container.style.overflow = 'hidden';

  // Header
  headerEl = document.createElement('div');
  headerEl.style.background = 'rgba(30,144,255,0.8)';
  headerEl.style.fontWeight = '600';
  headerEl.style.padding = '6px 10px';
  headerEl.textContent = 'Debug';

  // List
  listEl = document.createElement('ul');
  listEl.style.listStyle = 'none';
  listEl.style.margin = '0';
  listEl.style.padding = '6px 10px';
  listEl.style.maxHeight = '30vh';
  listEl.style.overflowY = 'auto';

  container.appendChild(headerEl);
  container.appendChild(listEl);
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

export function debugSetHeader(text: string) {
  try {
    ensureOverlay();
    if (headerEl) headerEl.textContent = text;
  } catch {}
}

export function debugLog(text: string) {
  try {
    ensureOverlay();
    if (!listEl) return;
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString()} • ${text}`;
    li.style.opacity = '0.95';
    listEl.prepend(li);
    // Keep last 8
    const items = Array.from(listEl.children);
    if (items.length > 8) {
      for (let i = 8; i < items.length; i++) listEl.removeChild(items[i]);
    }
  } catch {}
}
