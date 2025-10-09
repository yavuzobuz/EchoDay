import React, { useRef } from 'react';
import { EmailAttachmentFile } from '../types/mail';
import { v4 as uuidv4 } from 'uuid';

interface AttachmentPickerProps {
  attachments: EmailAttachmentFile[];
  onChange: (attachments: EmailAttachmentFile[]) => void;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
}

const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  attachments,
  onChange,
  maxSize = 10, // 10MB default
  maxFiles = 5,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total file count
    if (attachments.length + files.length > maxFiles) {
      alert(`En fazla ${maxFiles} dosya ekleyebilirsiniz!`);
      return;
    }

    const newAttachments: EmailAttachmentFile[] = [];

    for (const file of files) {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        alert(`${file.name} çok büyük! Maksimum dosya boyutu: ${maxSize}MB`);
        continue;
      }

      try {
        // Convert to base64
        const base64 = await fileToBase64(file);
        
        newAttachments.push({
          id: uuidv4(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64,
        });
      } catch (error) {
        console.error('Error reading file:', file.name, error);
        alert(`${file.name} okunamadı!`);
      }
    }

    onChange([...attachments, ...newAttachments]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (type.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-3">
      {/* File Input Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || attachments.length >= maxFiles}
          className="hidden"
          accept="*/*"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= maxFiles}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          📎 Dosya Ekle ({attachments.length}/{maxFiles})
        </button>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Maksimum {maxSize}MB · {maxFiles} dosyaya kadar
        </p>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(attachment.type)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.size)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                disabled={disabled}
                className="flex-shrink-0 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                title="Sil"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total Size */}
      {attachments.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Toplam boyut: {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))}
        </div>
      )}
    </div>
  );
};

export default AttachmentPicker;
