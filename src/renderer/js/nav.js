// Sign It — navigation + camera session policy.
import * as camera from './camera.js';
import { store } from './storage.js';
import { sfx, stopVoice } from './audio.js';
import { parentGate, toast } from './ui.js';
import { t } from './i18n.js';

const screens = {};
let current = null, currentName = null, currentParams = null;
let consent = false; // parent permission — valid for this play session only

export function register(name, fn) { screens[name] = fn; }
export function currentScreen() { return currentName; }

export function go(name, params = {}) {
  if (current && current.destroy) current.destroy();
  stopVoice();
  const app = document.getElementById('app');
  app.innerHTML = '';
  currentName = name; currentParams = params;
  current = screens[name](params) || {};
  app.append(current.el);
  // The camera runs only on screens that need it; everywhere else it is OFF.
  if (current.usesCamera && store.settings.camera && consent) camera.start();
  else camera.stop();
  sfx.whoosh();
}
export function refresh() { go(currentName, currentParams); }

export function hasConsent() { return consent; }

/** Called by the title-screen toggle. Asks a parent before enabling. */
export async function setCameraEnabled(on) {
  if (!on) {
    store.set('camera', false);
    consent = false;
    camera.stop();
    sfx.cameraOff();
    return false;
  }
  const ok = await parentGate({ text: t('gateText'), consentText: t('gateConsent'), allowLabel: t('gateAllow') });
  if (!ok) return false;
  consent = true;
  store.set('camera', true);
  sfx.cameraOn();
  toast('📷 ' + t('cameraHint'), 3200);
  return true;
}

/** Re-start the camera for the current screen after the window comes back. */
export function resumeIfNeeded() {
  if (current && current.usesCamera && store.settings.camera && consent && !camera.isOn()) camera.start();
}

/** Fully end the camera session (game stopped / closed). */
export function endCameraSession() {
  camera.stop();
}
