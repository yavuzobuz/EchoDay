// Singleton manager for Web Speech API
// This ensures only one initialization log regardless of how many hooks are created

class SpeechRecognitionManager {
  private static instance: SpeechRecognitionManager;
  private supportChecked = false;
  private hasSupport = false;
  private isElectron = false;
  
  private constructor() {}
  
  static getInstance(): SpeechRecognitionManager {
    if (!SpeechRecognitionManager.instance) {
      SpeechRecognitionManager.instance = new SpeechRecognitionManager();
    }
    return SpeechRecognitionManager.instance;
  }
  
  checkSupport(): { hasSupport: boolean; isElectron: boolean } {
    if (this.supportChecked) {
      return { hasSupport: this.hasSupport, isElectron: this.isElectron };
    }
    
    this.supportChecked = true;
    this.isElectron = !!(window as any).isElectron || !!(window as any).electronAPI;
    
    const WebSpeechRecognitionAPI = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (WebSpeechRecognitionAPI) {
      this.hasSupport = true;
      console.log('[SpeechManager] Web Speech API destekleniyor:', {
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
    } else {
      this.hasSupport = false;
      console.warn('[SpeechManager] Web Speech API desteklenmiyor:', {
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol
      });
    }
    
    return { hasSupport: this.hasSupport, isElectron: this.isElectron };
  }
  
  createRecognitionInstance() {
    const WebSpeechRecognitionAPI = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!WebSpeechRecognitionAPI) {
      throw new Error('Web Speech API not supported');
    }
    
    return new WebSpeechRecognitionAPI();
  }
}

export const speechRecognitionManager = SpeechRecognitionManager.getInstance();