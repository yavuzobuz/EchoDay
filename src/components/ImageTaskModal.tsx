import React, { useState, useRef, useEffect } from 'react';
import { MobileModal, ModalSection, ModalActions } from './MobileModal';

interface ImageTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (description: string, imageBase64: string, imageMimeType: string) => void;
}

const ImageTaskModal: React.FC<ImageTaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<{ b64: string, mime: string, url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setImage(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1];
        const mime = result.match(/:(.*?);/)?.[1] || 'image/png';
        setImage({ b64, mime, url: URL.createObjectURL(file) });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (image && description.trim()) {
      onAddTask(description.trim(), image.b64, image.mime);
      onClose();
    }
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Resimle Görev Oluştur"
      fullScreen={false}
      swipeToClose={true}
    >
      <form onSubmit={handleSubmit}>
        <ModalSection title="1. Bir Resim Yükleyin">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange} 
            ref={fileInputRef} 
            className="hidden" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="
              cursor-pointer border-2 border-dashed 
              border-gray-300 dark:border-gray-600 
              rounded-xl p-6 md:p-4 text-center 
              hover:border-[var(--accent-color-500)] 
              hover:bg-gray-50 dark:hover:bg-gray-700/50
              active:scale-[0.98]
              transition-all duration-150
              min-h-[200px] flex items-center justify-center
            "
          >
            {image ? (
              <div className="w-full">
                <img 
                  src={image.url} 
                  alt="Yüklenen görsel" 
                  className="max-h-56 md:max-h-48 mx-auto rounded-lg shadow-md" 
                />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Değiştirmek için tıklayın
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 md:w-12 md:h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-6 md:w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Resim seçmek için tıklayın
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG, HEIC desteklenir
                  </p>
                </div>
              </div>
            )}
          </div>
        </ModalSection>

        <ModalSection title="2. AI'ya Ne Yapmasını İstediğinizi Söyleyin">
          <textarea
            id="img-task-desc"
            className="
              w-full p-4 md:p-3
              border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-white
              text-base md:text-sm
              focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none
              transition-colors duration-300
              min-h-[100px]
            "
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Örn: Bu faturanın son ödeme tarihini görev olarak ekle."
          />
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
            disabled={!image || !description.trim()}
          >
            Görev Oluştur
          </button>
        </ModalActions>
      </form>
    </MobileModal>
  );
};

export default ImageTaskModal;
