import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptic Feedback Utility
 * Provides native haptic feedback for better UX on mobile devices
 */

class HapticFeedbackService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = Capacitor.getPlatform() !== 'web';
  }

  /**
   * Light impact - for subtle interactions
   * Use for: Button taps, list item selections
   */
  async light(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('[Haptics] Light feedback failed:', error);
    }
  }

  /**
   * Medium impact - for standard interactions
   * Use for: Toggle switches, confirmations
   */
  async medium(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('[Haptics] Medium feedback failed:', error);
    }
  }

  /**
   * Heavy impact - for important actions
   * Use for: Delete actions, errors, critical alerts
   */
  async heavy(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('[Haptics] Heavy feedback failed:', error);
    }
  }

  /**
   * Success notification - for positive outcomes
   * Use for: Task completion, successful saves
   */
  async success(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('[Haptics] Success feedback failed:', error);
    }
  }

  /**
   * Warning notification - for caution situations
   * Use for: Validation errors, warnings
   */
  async warning(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.warn('[Haptics] Warning feedback failed:', error);
    }
  }

  /**
   * Error notification - for error situations
   * Use for: Failed operations, critical errors
   */
  async error(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('[Haptics] Error feedback failed:', error);
    }
  }

  /**
   * Selection changed - for picker/selector changes
   * Use for: Scrolling through options, date pickers
   */
  async selection(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.selectionStart();
      // Small delay for better feel
      setTimeout(async () => {
        await Haptics.selectionEnd();
      }, 50);
    } catch (error) {
      console.warn('[Haptics] Selection feedback failed:', error);
    }
  }

  /**
   * Vibrate with custom pattern (Android only)
   * @param duration Duration in milliseconds
   */
  async vibrate(duration: number = 100): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('[Haptics] Vibrate failed:', error);
    }
  }

  /**
   * Long press feedback - combination of light + medium
   * Use for: Long press actions, drag start
   */
  async longPress(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await this.light();
      setTimeout(async () => {
        await this.medium();
      }, 100);
    } catch (error) {
      console.warn('[Haptics] Long press feedback failed:', error);
    }
  }

  /**
   * Voice recording start - special feedback
   */
  async voiceStart(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 80);
    } catch (error) {
      console.warn('[Haptics] Voice start feedback failed:', error);
    }
  }

  /**
   * Voice recording stop - special feedback
   */
  async voiceStop(): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }, 80);
    } catch (error) {
      console.warn('[Haptics] Voice stop feedback failed:', error);
    }
  }
}

// Export singleton instance
export const haptics = new HapticFeedbackService();

// Export convenience functions
export const triggerHaptic = {
  light: () => haptics.light(),
  medium: () => haptics.medium(),
  heavy: () => haptics.heavy(),
  success: () => haptics.success(),
  warning: () => haptics.warning(),
  error: () => haptics.error(),
  selection: () => haptics.selection(),
  vibrate: (duration?: number) => haptics.vibrate(duration),
  longPress: () => haptics.longPress(),
  voiceStart: () => haptics.voiceStart(),
  voiceStop: () => haptics.voiceStop(),
};

export default haptics;
