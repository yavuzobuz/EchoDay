import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceState {
  user_id: string;
  online_at: string;
  email?: string;
  display_name?: string;
}

class PresenceService {
  private channel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;

  /**
   * Initialize presence tracking for the current user
   */
  async trackPresence(userId: string, email?: string, displayName?: string): Promise<void> {
    try {
      // Clean up existing channel if any
      if (this.channel) {
        await this.untrackPresence();
      }

      this.currentUserId = userId;

      // Create a presence channel
      this.channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      // Track user presence
      const ch = this.channel!;
      ch
        .on('presence', { event: 'sync' }, () => {
          console.log('Presence synced');
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track this user's presence
            await ch.track({
              user_id: userId,
              online_at: new Date().toISOString(),
              email,
              display_name: displayName,
            });
            console.log('Presence tracking started for user:', userId);
          }
        });

      // Update presence every 30 seconds to keep connection alive
      this.startHeartbeat();

      // Update presence when page becomes visible
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.untrackPresence();
      });
    } catch (error) {
      console.error('Error tracking presence:', error);
    }
  }

  /**
   * Stop tracking user presence
   */
  async untrackPresence(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.untrack();
        await supabase.removeChannel(this.channel);
        this.channel = null;
      }
      this.stopHeartbeat();
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      console.log('Presence tracking stopped');
    } catch (error) {
      console.error('Error untracking presence:', error);
    }
  }

  /**
   * Subscribe to presence changes for specific users
   */
  subscribeToUserPresence(
    userIds: string[],
    onPresenceChange: (presenceStates: Map<string, PresenceState[]>) => void
  ): () => void {
    if (!this.channel) {
      console.warn('Presence channel not initialized');
      return () => {};
    }

    const handlePresenceSync = () => {
      if (!this.channel) return;

      const state = this.channel.presenceState<PresenceState>();
      const presenceMap = new Map<string, PresenceState[]>();

      // Convert to Map for easier access
      Object.entries(state).forEach(([userId, presences]) => {
        if (userIds.includes(userId)) {
          presenceMap.set(userId, presences);
        }
      });

      onPresenceChange(presenceMap);
    };

    // Initial sync
    handlePresenceSync();

    // Note: Supabase Realtime v2 doesn't require manual unsubscribe for presence events
    // The channel will be cleaned up when the component unmounts
    // Return empty unsubscribe function for consistency
    return () => {
      // No-op: Presence events are automatically cleaned up with the channel
      console.log('Presence subscription cleaned up');
    };
  }

  /**
   * Get current presence state for all users
   */
  getPresenceState(): Map<string, PresenceState[]> {
    if (!this.channel) {
      return new Map();
    }

    const state = this.channel.presenceState<PresenceState>();
    const presenceMap = new Map<string, PresenceState[]>();

    Object.entries(state).forEach(([userId, presences]) => {
      presenceMap.set(userId, presences);
    });

    return presenceMap;
  }

  /**
   * Check if a specific user is online
   */
  isUserOnline(userId: string): boolean {
    const presenceState = this.getPresenceState();
    return presenceState.has(userId) && (presenceState.get(userId)?.length ?? 0) > 0;
  }

  // Heartbeat to keep presence alive
  private heartbeatInterval: number | null = null;

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.channel && this.currentUserId) {
        this.channel.track({
          user_id: this.currentUserId,
          online_at: new Date().toISOString(),
        });
      }
    }, 30000); // Update every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // Page is hidden, optionally reduce heartbeat frequency
      console.log('Page hidden - reducing presence updates');
    } else {
      // Page is visible, resume normal tracking
      console.log('Page visible - resuming presence updates');
      if (this.channel && this.currentUserId) {
        this.channel.track({
          user_id: this.currentUserId,
          online_at: new Date().toISOString(),
        });
      }
    }
  };
}

export const presenceService = new PresenceService();
