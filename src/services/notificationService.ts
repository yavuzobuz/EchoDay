// Notification Service for Message Alerts

type CustomToastCallback = (title: string, message: string, avatar?: string, duration?: number) => void;

export class NotificationService {
  private static permission: NotificationPermission = 'default';
  private static enabled: boolean = false;
  private static audioContext: AudioContext | null = null;
  private static customToastCallback: CustomToastCallback | null = null;
  private static useCustomToasts: boolean = true;

  /**
   * Check if running in Electron
   */
  static isElectron(): boolean {
    return !!(window as any).electronAPI?.isElectron;
  }

  /**
   * Initialize notification service
   */
  static async initialize(): Promise<boolean> {
    try {
      // Check if we're in Electron
      if (this.isElectron()) {
        console.log('[Notification] Electron environment detected');
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.notification) {
          const isSupported = await electronAPI.notification.isSupported();
          this.enabled = isSupported;
          this.permission = isSupported ? 'granted' : 'denied';
          console.log('[Notification] Electron notifications supported:', isSupported);
          return isSupported;
        }
      }

      // Browser notification fallback
      if (!('Notification' in window)) {
        console.warn('Bu tarayıcı bildirimleri desteklemiyor');
        return false;
      }

      // Check current permission
      this.permission = Notification.permission;

      if (this.permission === 'granted') {
        this.enabled = true;
        return true;
      }

      if (this.permission === 'default') {
        // Request permission
        const result = await Notification.requestPermission();
        this.permission = result;
        this.enabled = result === 'granted';
        return this.enabled;
      }

      // Permission denied
      this.enabled = false;
      return false;
    } catch (error) {
      console.error('Bildirim servisi başlatılamadı:', error);
      return false;
    }
  }

  /**
   * Show message notification
   */
  static async showMessageNotification(senderName: string, message: string, senderEmail?: string) {
    if (!this.enabled) return;

    try {
      // Use Electron native notifications if available
      if (this.isElectron()) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.notification) {
          const success = await electronAPI.notification.show({
            title: `Yeni mesaj - ${senderName}`,
            body: message,
            icon: undefined, // Electron will use app icon
            silent: false,
            urgency: 'normal'
          });
          
          if (success) {
            console.log('[Notification] Electron notification shown');
            return;
          }
        }
      }

      // Fallback to web notification
      const notification = new Notification(`Yeni mesaj - ${senderName}`, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'message',
        renotify: true,
        requireInteraction: false,
        silent: false
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Click handler
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Bildirim gösterilemedi:', error);
    }
  }

  /**
   * Play notification sound
   */
  static playNotificationSound() {
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Create a simple notification sound
      this.createNotificationBeep();
    } catch (error) {
      console.error('Bildirim sesi çalınamadı:', error);
      // Fallback: try with HTML5 audio
      this.playFallbackSound();
    }
  }

  /**
   * Create notification beep sound
   */
  private static createNotificationBeep() {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  /**
   * Fallback sound using HTML5 audio
   */
  private static playFallbackSound() {
    try {
      // Create a data URL for a simple beep sound
      const audioData = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBziF0fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzhiAFV1AH1hiFhG9pBJrNhZsW5IcVBo3K+hfh5KbsL3cU5zN2RmVnNJZGJHdElyTm91dGtmc4jHb2ZNZG92dW1kc4jJbWRNZE52dW1lc4jNbWNLY091dW1mc4jPbGJJYE1zdW1nc4nRbGJKYE1ydG5nc4fWaWRMXk1xdG5pc4fZaWNLXk1wdG5pc4jYaWNKXk5wdG9pcojXaWJKXk9wcnBpcYjUaGJLX1Jwc3BqcYjSaGJLYFNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJLYVNxc3FqcYjRaGJL";
      const audio = new Audio(audioData);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors in fallback
      });
    } catch (error) {
      // Silent fail for fallback
    }
  }

  /**
   * Check if notifications are enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get permission status
   */
  static getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Set custom toast callback
   */
  static setCustomToastCallback(callback: CustomToastCallback) {
    this.customToastCallback = callback;
  }

  /**
   * Enable/disable custom toasts
   */
  static setUseCustomToasts(use: boolean) {
    this.useCustomToasts = use;
  }

  /**
   * Show notification with sound
   */
  static notifyMessage(senderName: string, message: string, senderEmail?: string) {
    // Play sound first
    this.playNotificationSound();
    
    // Show custom toast if enabled and callback is set
    if (this.useCustomToasts && this.customToastCallback) {
      const avatar = senderName.charAt(0).toUpperCase();
      this.customToastCallback(senderName, message, avatar, 7000);
      return;
    }
    
    // Fallback to browser notification only if page is not in focus
    if (document.hidden || !document.hasFocus()) {
      this.showMessageNotification(senderName, message, senderEmail);
    }
  }

  /**
   * Request permission if not already granted
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      this.enabled = result === 'granted';
      return this.enabled;
    } catch (error) {
      console.error('Bildirim izni alınamadı:', error);
      return false;
    }
  }
}

// Auto-initialize on import
NotificationService.initialize();