import React, { useEffect, useState } from 'react';
import { MobileModal, ModalActions } from './MobileModal';
import { getCurrentCoords } from '../services/locationService';
import { LocationHistoryService } from '../services/locationHistoryService';
import { useAuth } from '../contexts/AuthContext';
import type { Todo, GeoReminder, SavedLocation } from '../types';

interface GeoReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  todo: Todo;
  onSave: (geo: GeoReminder | null) => void;
}

const GeoReminderModal: React.FC<GeoReminderModalProps> = ({ isOpen, onClose, todo, onSave }) => {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  
  const [enabled, setEnabled] = useState<boolean>(!!todo.locationReminder?.enabled);
  const [lat, setLat] = useState<number>(todo.locationReminder?.lat || 0);
  const [lng, setLng] = useState<number>(todo.locationReminder?.lng || 0);
  const [radius, setRadius] = useState<number>(todo.locationReminder?.radius || 200);
  const [trigger, setTrigger] = useState<'near' | 'enter' | 'exit'>(todo.locationReminder?.trigger || 'near');
  const [address, setAddress] = useState<string>(todo.locationReminder?.address || '');
  
  // Location history states
  const [showLocationHistory, setShowLocationHistory] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SavedLocation['category']>('other');
  const [showSaveLocationForm, setShowSaveLocationForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEnabled(!!todo.locationReminder?.enabled);
      setLat(todo.locationReminder?.lat || 0);
      setLng(todo.locationReminder?.lng || 0);
      setRadius(todo.locationReminder?.radius || 200);
      setTrigger(todo.locationReminder?.trigger || 'near');
      setAddress(todo.locationReminder?.address || '');
      
      // Load saved locations
      const locations = LocationHistoryService.getSavedLocations(userId);
      setSavedLocations(locations);
    }
  }, [isOpen, todo, userId]);

  const handleUseCurrentLocation = async () => {
    const coords = await getCurrentCoords();
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
    }
  };

  // Handler functions for location history
  const handleSelectSavedLocation = (location: SavedLocation) => {
    setLat(location.lat);
    setLng(location.lng);
    setAddress(location.address || location.name);
    setShowLocationHistory(false);
    
    // Increment usage count
    LocationHistoryService.incrementUsage(userId, location.id);
  };
  
  const handleSaveCurrentLocation = async () => {
    if (!lat || !lng || !newLocationName.trim()) return;
    
    try {
      LocationHistoryService.saveLocation(userId, {
        name: newLocationName.trim(),
        lat,
        lng,
        address,
        category: selectedCategory
      });
      
      // Update local state
      const locations = LocationHistoryService.getSavedLocations(userId);
      setSavedLocations(locations);
      
      // Reset form
      setNewLocationName('');
      setSelectedCategory('other');
      setShowSaveLocationForm(false);
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };
  
  const handleDeleteSavedLocation = (locationId: string) => {
    const success = LocationHistoryService.deleteLocation(userId, locationId);
    if (success) {
      const locations = LocationHistoryService.getSavedLocations(userId);
      setSavedLocations(locations);
    }
  };

  const handleSave = () => {
    if (!enabled) {
      onSave(null);
      onClose();
      return;
    }
    if (!lat || !lng) return;
    const geo: GeoReminder = {
      lat,
      lng,
      radius: radius || 200,
      trigger,
      address,
      enabled: true,
      lastTriggeredAt: todo.locationReminder?.lastTriggeredAt,
    };
    onSave(geo);
    onClose();
  };
  
  // Filter locations based on search query
  const filteredLocations = locationSearchQuery
    ? savedLocations.filter(loc => 
        loc.name.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
        (loc.address && loc.address.toLowerCase().includes(locationSearchQuery.toLowerCase()))
      )
    : savedLocations;
  
  const recentLocations = LocationHistoryService.getRecentLocations(userId, 5);
  const popularLocations = LocationHistoryService.getPopularLocations(userId, 5);

  return (
    <MobileModal isOpen={isOpen} onClose={onClose} title="Konum Hatırlatıcısı" fullScreen={false}>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-sm font-medium">Bu görev için konum hatırlatıcısını etkinleştir</span>
        </label>

        {enabled && (
          <>
            {/* Location Selection */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  📍 Şu anki konumumu kullan
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocationHistory(!showLocationHistory)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  🕒 Kayıtlı konumlar
                </button>
                {(lat && lng) && (
                  <button
                    type="button"
                    onClick={() => setShowSaveLocationForm(!showSaveLocationForm)}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    💾 Konumu kaydet
                  </button>
                )}
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <div>📍 <strong>Konum:</strong> {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Seçilmedi'}</div>
                {address && <div>🏠 <strong>Adres:</strong> {address}</div>}
              </div>
            </div>

            {/* Save Location Form */}
            {showSaveLocationForm && (lat && lng) && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-md space-y-2">
                <h4 className="font-medium text-sm">Bu konumu kaydet</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Konum adı (örn: Ev, İş yeri)"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="flex-1 p-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as SavedLocation['category'])}
                    className="p-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  >
                    <option value="home">🏠 Ev</option>
                    <option value="work">🏢 İş</option>
                    <option value="shopping">🛒 Alışveriş</option>
                    <option value="education">🎓 Eğitim</option>
                    <option value="healthcare">🏥 Sağlık</option>
                    <option value="entertainment">🎬 Eğlence</option>
                    <option value="other">📍 Diğer</option>
                  </select>
                  <button
                    onClick={handleSaveCurrentLocation}
                    disabled={!newLocationName.trim()}
                    className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Location History */}
            {showLocationHistory && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Kayıtlı Konumlar</h4>
                  <button
                    onClick={() => setShowLocationHistory(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                {savedLocations.length > 5 && (
                  <input
                    type="text"
                    placeholder="Konum ara..."
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    className="w-full p-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  />
                )}
                
                {/* Recent Locations */}
                {recentLocations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">🕒 Son Kullanılanlar</div>
                    <div className="space-y-1">
                      {recentLocations.slice(0, 3).map((location) => (
                        <button
                          key={location.id}
                          onClick={() => handleSelectSavedLocation(location)}
                          className="w-full text-left p-2 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{location.name}</span>
                            <span className="text-gray-500">{location.usageCount}x</span>
                          </div>
                          {location.address && (
                            <div className="text-gray-500 truncate">{location.address}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Popular Locations */}
                {popularLocations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">⭐ Sık Kullanılanlar</div>
                    <div className="space-y-1">
                      {popularLocations.slice(0, 3).map((location) => (
                        <button
                          key={location.id}
                          onClick={() => handleSelectSavedLocation(location)}
                          className="w-full text-left p-2 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{location.name}</span>
                            <span className="text-gray-500">{location.usageCount}x</span>
                          </div>
                          {location.address && (
                            <div className="text-gray-500 truncate">{location.address}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* All Locations */}
                {filteredLocations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">📍 Tüm Konumlar</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {filteredLocations.map((location) => (
                        <div key={location.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelectSavedLocation(location)}
                            className="flex-1 text-left p-2 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{location.name}</span>
                              <span className="text-gray-500">{location.usageCount}x</span>
                            </div>
                            {location.address && (
                              <div className="text-gray-500 truncate">{location.address}</div>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedLocation(location.id)}
                            className="p-1 text-red-500 hover:text-red-700 text-xs"
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {savedLocations.length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-2">
                    Henüz kayıtlı konum yok
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Yarıçap (m)</label>
                <input 
                  type="number" 
                  min={50} 
                  step={50} 
                  value={radius} 
                  onChange={(e) => setRadius(parseInt(e.target.value || '200', 10))} 
                  className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Tetikleme</label>
                <select 
                  value={trigger} 
                  onChange={(e) => setTrigger(e.target.value as any)} 
                  className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
                >
                  <option value="near">🎯 Yakındayken</option>
                  <option value="enter">▶️ Bölgeye girince</option>
                  <option value="exit">◀️ Bölgeden çıkınca</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <ModalActions className="mt-6">
        <button onClick={onClose} className="flex-1 px-4 py-3 md:py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95 transition-all duration-150 min-h-[48px] md:min-h-[44px]">
          İptal
        </button>
        <button onClick={handleSave} className="flex-1 px-4 py-3 md:py-2 bg-[var(--accent-color-600)] text-white rounded-lg font-medium hover:bg-[var(--accent-color-700)] active:scale-95 transition-all duration-150 min-h-[48px] md:min-h-[44px]">
          Kaydet
        </button>
      </ModalActions>
    </MobileModal>
  );
};

export default GeoReminderModal;
