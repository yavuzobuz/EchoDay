import React, { useState, useRef, useEffect } from 'react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Resimle Görev Oluştur</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">1. Bir Resim Yükleyin</label>
            <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} className="hidden" />
            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-[var(--accent-color-500)] hover:bg-gray-50 dark:hover:bg-gray-700/50">
              {image ? (
                <img src={image.url} alt="Yüklenen görsel" className="max-h-48 mx-auto rounded-md" />
              ) : (
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Resim seçmek için tıklayın</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="img-task-desc" className="font-semibold text-gray-700 dark:text-gray-300 mb-2 block">2. AI'ya Ne Yapmasını İstediğinizi Söyleyin</label>
            <textarea
              id="img-task-desc"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-color-500)] focus:outline-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Bu faturanın son ödeme tarihini görev olarak ekle."
            />
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
              İptal
            </button>
            <button type="submit" className="px-4 py-2 bg-[var(--accent-color-600)] text-white rounded-md hover:bg-[var(--accent-color-700)] disabled:opacity-50" disabled={!image || !description.trim()}>
              Görev Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImageTaskModal;
