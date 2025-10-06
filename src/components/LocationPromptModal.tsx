import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MobileModal, ModalSection, ModalActions } from './MobileModal';

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (location: string) => void;
  destination: string;
}

const LocationPromptModal: React.FC<LocationPromptModalProps> = ({ isOpen, onClose, onSubmit, destination }) => {
  const [location, setLocation] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocation('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onSubmit(location.trim());
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
            const permissionResult = await Geolocation.requestPermissions();
            if (permissionResult.location !== 'granted' && permissionResult.coarseLocation !== 'granted') {
                throw new Error("User denied geolocation permission.");
            }
        }
        
        const position = await Geolocation.getCurrentPosition();
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude},${longitude}`;
        setLocation(locationString);
    } catch (error) {
        console.error("Geolocation error:", error);
        alert("Konum alınamadı. Lütfen manuel olarak girin veya cihazınızın konum izinlerini kontrol edin.");
    } finally {
        setIsFetchingLocation(false);
    }
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rota Oluştur"
      fullScreen={false}
      swipeToClose={true}
    >
      <form onSubmit={handleSubmit}>
        <ModalSection>
          <p className="text-sm md:text-xs text-gray-600 dark:text-gray-300 mb-4">
            <span className="font-semibold text-[var(--accent-color-600)] dark:text-[var(--accent-color-500)]">
              {destination}
            </span>
            {' '}için yol tarifi oluşturmak üzere lütfen başlangıç noktanızı belirtin.
          </p>

          <div className="relative">
            <input
              type="text"
              className="
                w-full px-4 py-3 md:px-3 md:py-2 pr-12
                text-base md:text-sm
                border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none
                transition-colors duration-200
                min-h-[48px] md:min-h-[40px]
              "
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Beşiktaş Meydanı"
              autoFocus
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isFetchingLocation}
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                p-2 rounded-lg
                hover:bg-gray-100 dark:hover:bg-gray-600
                active:scale-95
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[44px] min-w-[44px]
                flex items-center justify-center
              "
              aria-label="Mevcut konumu kullan"
              title="Mevcut konumu kullan"
            >
              {isFetchingLocation ? (
                <svg className="animate-spin h-5 w-5 text-[var(--accent-color-500)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            📍 Konum ikonuna tıklayarak mevcut konumunuzu otomatik olarak alabilirsiniz.
          </p>
        </ModalSection>

        <ModalActions>
          <button
            type="button"
            onClick={onClose}
            className="
              flex-1 px-4 py-3 md:py-2
              bg-gray-200 dark:bg-gray-600
              text-gray-800 dark:text-gray-200
              rounded-lg font-medium
              hover:bg-gray-300 dark:hover:bg-gray-500
              active:scale-95
              transition-all duration-150
              min-h-[48px] md:min-h-[44px]
            "
          >
            İptal
          </button>
          <button
            type="submit"
            className="
              flex-1 px-4 py-3 md:py-2
              bg-[var(--accent-color-600)] text-white
              rounded-lg font-medium
              hover:bg-[var(--accent-color-700)]
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
              transition-all duration-150
              min-h-[48px] md:min-h-[44px]
            "
            disabled={!location.trim()}
          >
            Rota Oluştur
          </button>
        </ModalActions>
      </form>
    </MobileModal>
  );
};

export default LocationPromptModal;
