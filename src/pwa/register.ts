export async function registerPuzzleServiceWorker(canActivateUpdate: boolean) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  const registration = await navigator.serviceWorker.register('/service-worker.js');
  if (canActivateUpdate && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  return registration;
}
