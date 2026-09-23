import { registerPuzzleServiceWorker } from '../../src/pwa/register';

describe('service worker update activation boundary', () => {
  test('E05: a waiting update activates only when no session owns the current content', async () => {
    const postMessage = jest.fn();
    const register = jest.fn(async () => ({ waiting: { postMessage } }));
    const originalWindow = Object.getOwnPropertyDescriptor(global, 'window');
    const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
    Object.defineProperty(global, 'window', { configurable: true, value: {} });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { serviceWorker: { register } }
    });
    try {
      await registerPuzzleServiceWorker(false);
      expect(register).toHaveBeenCalledWith('/service-worker.js');
      expect(postMessage).not.toHaveBeenCalled();
      await registerPuzzleServiceWorker(true);
      expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    } finally {
      if (originalWindow) Object.defineProperty(global, 'window', originalWindow);
      else Reflect.deleteProperty(global, 'window');
      if (originalNavigator) Object.defineProperty(global, 'navigator', originalNavigator);
      else Reflect.deleteProperty(global, 'navigator');
    }
  });
});
