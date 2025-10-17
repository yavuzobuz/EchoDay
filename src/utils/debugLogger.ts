// Debug Logger Utility for Development
// Provides detailed logging with categorization and mobile-friendly output

interface LogContext {
  module?: string;
  function?: string;
  error?: any;
  data?: any;
  timestamp?: string;
}

class DebugLogger {
  private isDebugMode: boolean = false;
  private logs: Array<{ level: string; message: string; context?: LogContext; timestamp: string }> = [];
  private maxLogs: number = 500;

  constructor() {
    // Check if debug mode is enabled
    this.isDebugMode = this.checkDebugMode();
    
    // Initialize debug mode from environment or localStorage
    if (typeof window !== 'undefined') {
      // Listen for debug mode toggle
      window.addEventListener('toggle-debug', () => {
        this.isDebugMode = !this.isDebugMode;
        localStorage.setItem('debug-mode', this.isDebugMode ? 'true' : 'false');
        this.info('Debug Mode', `Debug mode ${this.isDebugMode ? 'enabled' : 'disabled'}`);
      });

      // Add global error handler for uncaught errors
      window.addEventListener('error', (event) => {
        this.error('Uncaught Error', event.error?.message || event.message, {
          error: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          }
        });
      });

      // Add unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', event.reason, {
          error: event.reason
        });
      });

      // Expose debug functions to window for easy access
      (window as any).debugLogger = this;
      (window as any).toggleDebug = () => this.toggleDebugMode();
      (window as any).getLogs = () => this.getLogs();
      (window as any).clearLogs = () => this.clearLogs();
      (window as any).exportLogs = () => this.exportLogs();
    }
  }

  private checkDebugMode(): boolean {
    // Check multiple sources for debug mode
    if (typeof window !== 'undefined') {
      // Check localStorage
      const localDebug = localStorage.getItem('debug-mode');
      if (localDebug === 'true') return true;
      
      // Check URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('debug') === 'true') return true;
      
      // Check environment variable (for development)
      if (process.env.NODE_ENV === 'development') return true;
    }
    
    return false;
  }

  toggleDebugMode(): boolean {
    this.isDebugMode = !this.isDebugMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-mode', this.isDebugMode ? 'true' : 'false');
    }
    console.log(`🐛 Debug mode ${this.isDebugMode ? 'ENABLED' : 'DISABLED'}`);
    return this.isDebugMode;
  }

  private addLog(level: string, message: string, context?: LogContext) {
    const logEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    };

    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(_level: string, module: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const moduleTag = context?.module ? `[${context.module}]` : `[${module}]`;
    const functionTag = context?.function ? `::${context.function}` : '';
    
    return `${timestamp} ${moduleTag}${functionTag} ${message}`;
  }

  private getEmoji(level: string): string {
    switch (level) {
      case 'INFO': return '💡';
      case 'DEBUG': return '🔍';
      case 'WARN': return '⚠️';
      case 'ERROR': return '❌';
      case 'SUCCESS': return '✅';
      case 'API': return '🌐';
      case 'SPEECH': return '🎤';
      case 'STORAGE': return '💾';
      case 'NETWORK': return '📡';
      default: return '📝';
    }
  }

  private log(level: string, module: string, message: string, context?: LogContext, forceLog: boolean = false) {
    if (!this.isDebugMode && !forceLog) return;

    const formattedMessage = this.formatMessage(level, module, message, context);
    const emoji = this.getEmoji(level);
    
    // Add to internal log storage
    this.addLog(level, message, { ...context, module });

    // Console output with appropriate styling
    const style = this.getConsoleStyle(level);
    
    console.log(
      `%c${emoji} ${formattedMessage}`,
      style
    );

    // Log additional data if provided
    if (context?.data) {
      console.log('%c  📦 Data:', 'color: #666; font-size: 11px;', context.data);
    }

    if (context?.error) {
      console.error('%c  🔴 Error Details:', 'color: #ff0000; font-weight: bold;', context.error);
      if (context.error.stack) {
        console.log('%c  📚 Stack Trace:', 'color: #999; font-size: 10px;', context.error.stack);
      }
    }
  }

  private getConsoleStyle(level: string): string {
    const baseStyle = 'padding: 2px 5px; border-radius: 3px; font-weight: 500;';
    
    switch (level) {
      case 'INFO':
        return `${baseStyle} background: #e3f2fd; color: #1976d2;`;
      case 'DEBUG':
        return `${baseStyle} background: #f3e5f5; color: #7b1fa2;`;
      case 'WARN':
        return `${baseStyle} background: #fff3e0; color: #f57c00;`;
      case 'ERROR':
        return `${baseStyle} background: #ffebee; color: #c62828;`;
      case 'SUCCESS':
        return `${baseStyle} background: #e8f5e9; color: #2e7d32;`;
      case 'API':
        return `${baseStyle} background: #e0f7fa; color: #00838f;`;
      case 'SPEECH':
        return `${baseStyle} background: #fce4ec; color: #c2185b;`;
      default:
        return `${baseStyle} background: #f5f5f5; color: #424242;`;
    }
  }

  // Public logging methods
  info(module: string, message: string, context?: LogContext) {
    this.log('INFO', module, message, context);
  }

  debug(module: string, message: string, context?: LogContext) {
    this.log('DEBUG', module, message, context);
  }

  warn(module: string, message: string, context?: LogContext) {
    this.log('WARN', module, message, context);
  }

  error(module: string, message: string, context?: LogContext) {
    // Errors are always logged regardless of debug mode
    this.log('ERROR', module, message, context, true);
  }

  success(module: string, message: string, context?: LogContext) {
    this.log('SUCCESS', module, message, context);
  }

  api(module: string, message: string, context?: LogContext) {
    this.log('API', module, message, context);
  }

  speech(module: string, message: string, context?: LogContext) {
    this.log('SPEECH', module, message, context);
  }

  storage(module: string, message: string, context?: LogContext) {
    this.log('STORAGE', module, message, context);
  }

  network(module: string, message: string, context?: LogContext) {
    this.log('NETWORK', module, message, context);
  }

  // Log management methods
  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    console.log('🗑️ Debug logs cleared');
  }

  exportLogs(): string {
    const logsJson = JSON.stringify(this.logs, null, 2);
    
    // Create a blob and download link
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('📥 Logs exported successfully');
    }
    
    return logsJson;
  }

  // Performance monitoring
  startTimer(label: string): void {
    if (!this.isDebugMode) return;
    console.time(`⏱️ ${label}`);
  }

  endTimer(label: string): void {
    if (!this.isDebugMode) return;
    console.timeEnd(`⏱️ ${label}`);
  }

  // Memory monitoring
  logMemory(module: string): void {
    if (!this.isDebugMode) return;
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.debug(module, 'Memory Usage', {
        data: {
          usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
        }
      });
    }
  }

  // Group logging for complex operations
  group(label: string, collapsed: boolean = true) {
    if (!this.isDebugMode) return;
    
    if (collapsed) {
      console.groupCollapsed(`📁 ${label}`);
    } else {
      console.group(`📂 ${label}`);
    }
  }

  groupEnd() {
    if (!this.isDebugMode) return;
    console.groupEnd();
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Export for use throughout the application
export default debugLogger;

// Export convenience functions
export const {
  info,
  debug,
  warn,
  error,
  success,
  api,
  speech,
  storage,
  network,
  toggleDebugMode,
  getLogs,
  clearLogs,
  exportLogs,
  startTimer,
  endTimer,
  logMemory,
  group,
  groupEnd
} = debugLogger;