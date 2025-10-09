import { Geolocation, PermissionStatus } from '@capacitor/geolocation';

export async function ensureLocationPermission(): Promise<boolean> {
  try {
    const perm = await Geolocation.checkPermissions();
    if (perm.location === 'granted' || perm.coarseLocation === 'granted') return true;
    const req: PermissionStatus = await Geolocation.requestPermissions();
    return (req.location === 'granted' || (req as any).coarseLocation === 'granted');
  } catch (e) {
    console.warn('[Geo] Permission error:', e);
    return false;
  }
}

export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const ok = await ensureLocationPermission();
    if (!ok) return null;
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (e) {
    console.warn('[Geo] getCurrentPosition failed:', e);
    return null;
  }
}

export function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function isWithinRadius(current: { lat: number; lng: number }, target: { lat: number; lng: number }, radiusMeters: number): boolean {
  return haversineDistanceMeters(current, target) <= radiusMeters;
}
