/**
 * PDF Service
 * PDF dosyalarını yükleme, validasyon ve base64 dönüşüm işlemleri
 */

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

export interface PdfFileData {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  buffer?: string;
}

// Electron API'nin varlığını kontrol et
const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electronAPI;
};

export const pdfService = {
  /**
   * PDF dosyası seç (Electron native dialog veya web file input)
   * @returns PDF dosya verileri veya null
   */
  async selectPdfFile(): Promise<PdfFileData | null> {
    if (isElectron()) {
      try {
        const pdfData = await (window as any).electronAPI.selectPdfFile();
        return pdfData;
      } catch (error) {
        console.error('Error selecting PDF with Electron:', error);
        return null;
      }
    }
    // Web ortamında kullanılamaz, File input kullanılmalı
    return null;
  },

  /**
   * File objesini PdfFileData'ya çevirir
   */
  async fileToData(file: File): Promise<PdfFileData> {
    const dataUrl = await this.convertToBase64(file);
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: dataUrl,
    };
  },
  /**
   * PDF dosyasını base64 formatına çevirir
   */
  async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        reject(new Error('Dosya okunamadı: ' + error));
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * PDF dosyasını validate eder
   * @param file - Kontrol edilecek dosya
   * @param maxPages - Maksimum sayfa sayısı (default: 15)
   * @param maxSizeMB - Maksimum dosya boyutu MB cinsinden (default: 10)
   */
  validatePdf(
    file: File,
    _maxPages: number = 15,
    maxSizeMB: number = 10
  ): PdfValidationResult {
    // Dosya tipi kontrolü
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'Sadece PDF dosyaları yüklenebilir (.pdf)',
      };
    }

    // Dosya boyutu kontrolü
    const maxSize = maxSizeMB * 1024 * 1024; // MB to bytes
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Dosya boyutu ${maxSizeMB}MB'dan küçük olmalıdır. Mevcut boyut: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      };
    }

    // Boş dosya kontrolü
    if (file.size === 0) {
      return {
        valid: false,
        error: 'Dosya boş görünüyor. Lütfen geçerli bir PDF dosyası seçin.',
      };
    }

    return { valid: true };
  },

  /**
   * Dosya boyutunu okunabilir formata çevirir
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * PDF dosya adından uzantıyı kaldırır
   */
  getFileNameWithoutExtension(fileName: string): string {
    return fileName.replace(/\.pdf$/i, '');
  },
};
