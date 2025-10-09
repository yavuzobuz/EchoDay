/**
 * EchoDay Logger Utility
 * Development'ta console'a yazar, production'da sessiz kalır
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

interface LoggerConfig {
  enableInProduction?: boolean;
  remoteLogging?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enableInProduction: false,
      remoteLogging: false,
      ...config
    };
  }

  /**
   * Log bilgi mesajı (sadece development)
   */
  log(...args: any[]): void {
    if (isDevelopment) {
      console.log('[EchoDay]', ...args);
    }
  }

  /**
   * Log uyarı mesajı (sadece development)
   */
  warn(...args: any[]): void {
    if (isDevelopment) {
      console.warn('[EchoDay]', ...args);
    }
  }

  /**
   * Log hata mesajı (development ve production)
   * Production'da remote logging yapılabilir
   */
  error(...args: any[]): void {
    if (isDevelopment) {
      console.error('[EchoDay]', ...args);
    } else if (isProduction && this.config.remoteLogging) {
      // Future: Sentry veya başka bir servise gönder
      this.sendToRemote('error', args);
    }
  }

  /**
   * Debug mesajları (sadece development)
   */
  debug(...args: any[]): void {
    if (isDevelopment) {
      console.debug('[EchoDay Debug]', ...args);
    }
  }

  /**
   * Performance ölçümü
   */
  time(label: string): void {
    if (isDevelopment) {
      console.time(`[EchoDay] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (isDevelopment) {
      console.timeEnd(`[EchoDay] ${label}`);
    }
  }

  /**
   * Grup başlat (sadece development)
   */
  group(label: string): void {
    if (isDevelopment) {
      console.group(`[EchoDay] ${label}`);
    }
  }

  groupEnd(): void {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Remote logging (future implementation)
   */
  private sendToRemote(level: string, args: any[]): void {
    // Future: Implement remote logging
    // Example: Send to Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureMessage(
        args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '),
        level
      );
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for custom configurations
export { Logger };
