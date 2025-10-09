import { SavedLocation } from '../types';

const STORAGE_KEY = 'saved_locations';

export class LocationHistoryService {
  /**
   * Get all saved locations for a user
   */
  static getSavedLocations(userId: string): SavedLocation[] {
    try {
      const key = `${STORAGE_KEY}_${userId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[LocationHistory] Failed to get saved locations:', error);
      return [];
    }
  }

  /**
   * Save a new location or update existing one
   */
  static saveLocation(userId: string, location: Omit<SavedLocation, 'id' | 'createdAt' | 'usageCount' | 'lastUsedAt'>): SavedLocation {
    try {
      const locations = this.getSavedLocations(userId);
      
      // Check if location already exists (within 100m radius)
      const existing = locations.find(loc => 
        this.calculateDistance(loc.lat, loc.lng, location.lat, location.lng) < 100
      );

      if (existing) {
        // Update existing location
        existing.name = location.name;
        existing.address = location.address;
        existing.category = location.category;
        existing.usageCount += 1;
        existing.lastUsedAt = new Date().toISOString();
        
        this.saveLocations(userId, locations);
        return existing;
      } else {
        // Create new location
        const newLocation: SavedLocation = {
          id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          address: location.address,
          createdAt: new Date().toISOString(),
          usageCount: 1,
          lastUsedAt: new Date().toISOString(),
          category: location.category || 'other',
        };

        locations.unshift(newLocation);
        
        // Keep only last 50 locations
        if (locations.length > 50) {
          locations.splice(50);
        }

        this.saveLocations(userId, locations);
        return newLocation;
      }
    } catch (error) {
      console.error('[LocationHistory] Failed to save location:', error);
      throw error;
    }
  }

  /**
   * Delete a saved location
   */
  static deleteLocation(userId: string, locationId: string): boolean {
    try {
      const locations = this.getSavedLocations(userId);
      const filtered = locations.filter(loc => loc.id !== locationId);
      
      if (filtered.length === locations.length) {
        return false; // Location not found
      }

      this.saveLocations(userId, filtered);
      return true;
    } catch (error) {
      console.error('[LocationHistory] Failed to delete location:', error);
      return false;
    }
  }

  /**
   * Get popular locations (sorted by usage)
   */
  static getPopularLocations(userId: string, limit: number = 10): SavedLocation[] {
    const locations = this.getSavedLocations(userId);
    return locations
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recent locations
   */
  static getRecentLocations(userId: string, limit: number = 10): SavedLocation[] {
    const locations = this.getSavedLocations(userId);
    return locations
      .filter(loc => loc.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
      .slice(0, limit);
  }

  /**
   * Search locations by name or address
   */
  static searchLocations(userId: string, query: string): SavedLocation[] {
    const locations = this.getSavedLocations(userId);
    const lowerQuery = query.toLowerCase();
    
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(lowerQuery) ||
      (loc.address && loc.address.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Update location usage when used
   */
  static incrementUsage(userId: string, locationId: string): void {
    try {
      const locations = this.getSavedLocations(userId);
      const location = locations.find(loc => loc.id === locationId);
      
      if (location) {
        location.usageCount += 1;
        location.lastUsedAt = new Date().toISOString();
        this.saveLocations(userId, locations);
      }
    } catch (error) {
      console.error('[LocationHistory] Failed to increment usage:', error);
    }
  }

  /**
   * Get location categories with counts
   */
  static getLocationCategories(userId: string): { category: string; count: number }[] {
    const locations = this.getSavedLocations(userId);
    const categoryCount: { [key: string]: number } = {};

    locations.forEach(loc => {
      const category = loc.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Save locations to localStorage
   */
  private static saveLocations(userId: string, locations: SavedLocation[]): void {
    try {
      const key = `${STORAGE_KEY}_${userId}`;
      localStorage.setItem(key, JSON.stringify(locations));
    } catch (error) {
      console.error('[LocationHistory] Failed to save locations:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Auto-save current location if user enables it
   */
  static async autoSaveCurrentLocation(userId: string, name?: string): Promise<SavedLocation | null> {
    try {
      const { getCurrentCoords } = await import('./locationService');
      const coords = await getCurrentCoords();
      
      if (!coords) {
        console.warn('[LocationHistory] Could not get current coordinates for auto-save');
        return null;
      }

      // Try to get address via reverse geocoding (if available)
      let address: string | undefined;
      try {
        // This would require a geocoding service - for now, just use coordinates
        address = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      } catch (e) {
        // Ignore geocoding errors
      }

      const locationName = name || `Konum ${new Date().toLocaleDateString('tr-TR')}`;
      
      const savedLocation = this.saveLocation(userId, {
        name: locationName,
        lat: coords.lat,
        lng: coords.lng,
        address,
        category: 'other'
      });

      return savedLocation;
    } catch (error) {
      console.error('[LocationHistory] Auto-save failed:', error);
      return null;
    }
  }

  /**
   * Import locations from exported data
   */
  static importLocations(userId: string, importedLocations: SavedLocation[]): number {
    try {
      const existingLocations = this.getSavedLocations(userId);
      let importedCount = 0;

      importedLocations.forEach(importedLoc => {
        // Check if location already exists
        const exists = existingLocations.some(existing => 
          this.calculateDistance(existing.lat, existing.lng, importedLoc.lat, importedLoc.lng) < 50
        );

        if (!exists) {
          // Generate new ID to avoid conflicts
          const newLocation: SavedLocation = {
            ...importedLoc,
            id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            usageCount: 1,
          };
          existingLocations.push(newLocation);
          importedCount++;
        }
      });

      // Sort by creation date and limit to 50
      existingLocations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (existingLocations.length > 50) {
        existingLocations.splice(50);
      }

      this.saveLocations(userId, existingLocations);
      return importedCount;
    } catch (error) {
      console.error('[LocationHistory] Import failed:', error);
      return 0;
    }
  }

  /**
   * Export locations for backup
   */
  static exportLocations(userId: string): SavedLocation[] {
    return this.getSavedLocations(userId);
  }
}