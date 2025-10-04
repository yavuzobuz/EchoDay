import React, { useState, useEffect } from 'react';

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

  const handleUseCurrentLocation = () => {
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude},${longitude}`;
        setLocation(locationString);
        setIsFetchingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Konum alınamadı. Lütfen manuel olarak girin veya tarayıcı izinlerinizi kontrol edin.");
        setIsFetchingLocation(false);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Rota Oluştur</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-[var(--accent-color-600)] dark:text-[var(--accent-color-500)]">{destination}</span> için yol tarifi oluşturmak üzere lütfen başlangıç noktanızı belirtin.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Örn: Beşiktaş Meydanı"
              autoFocus
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isFetchingLocation}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label="Mevcut konumu kullan"
              title="Mevcut konumu kullan"
            >
              {isFetchingLocation ? (
                 <svg className="animate-spin h-5 w-5 text-[var(--accent-color-500)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-[var(--accent-color-500)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50"
              disabled={!location.trim()}
            >
              Rota Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationPromptModal;