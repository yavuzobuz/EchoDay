/* Geofence service wrapper. Uses cordova-plugin-geofence if present; otherwise no-op.
   This safely runs on web/Electron without errors. */

export type TransitionType = 'enter' | 'exit' | 'near';

function hasCordovaGeofence(): boolean {
  return typeof (window as any).geofence !== 'undefined';
}

export async function initGeofence(): Promise<boolean> {
  try {
    if (!hasCordovaGeofence()) return false;
    await (window as any).geofence.initialize();
    // Optionally subscribe to transitions
    (window as any).geofence.onTransitionReceived = function(_geofences: any[]) {
      // We rely on LocalNotifications in-app; many geofence plugins can also show native notifications themselves.
      // Keep this hook in case we want to handle transitions inside the app later.
    };
    return true;
  } catch (e) {
    console.warn('[Geofence] init failed:', e);
    return false;
  }
}

export async function addOrUpdateGeofence(params: { id: string; lat: number; lng: number; radius: number; transition: TransitionType; title: string; text: string; }): Promise<boolean> {
  try {
    if (!hasCordovaGeofence()) return false;
    const transitionType = params.transition === 'exit' ? 2 : 1; // 1 = enter, 2 = exit
    await (window as any).geofence.addOrUpdate([{
      id: params.id,
      latitude: params.lat,
      longitude: params.lng,
      radius: params.radius,
      transitionType,
      notification: {
        title: params.title,
        text: params.text,
        openAppOnClick: true
      }
    }]);
    return true;
  } catch (e) {
    console.warn('[Geofence] addOrUpdate failed:', e);
    return false;
  }
}

export async function removeGeofence(id: string): Promise<boolean> {
  try {
    if (!hasCordovaGeofence()) return false;
    await (window as any).geofence.remove(id);
    return true;
  } catch (e) {
    console.warn('[Geofence] remove failed:', e);
    return false;
  }
}

export async function removeAllGeofences(): Promise<boolean> {
  try {
    if (!hasCordovaGeofence()) return false;
    await (window as any).geofence.removeAll();
    return true;
  } catch (e) {
    console.warn('[Geofence] removeAll failed:', e);
    return false;
  }
}
