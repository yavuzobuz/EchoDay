// Web Speech API Fix and Diagnostic Utility

export interface WebSpeechDiagnostic {
  hasRecognitionSupport: boolean;
  hasSynthesisSupport: boolean;
  isSecureContext: boolean;
  recognitionError?: string;
  synthesisError?: string;
  microphoneStatus?: 'granted' | 'denied' | 'prompt' | 'error';
  availableVoices: number;
  recommendedFixes: string[];
}

export async function diagnoseWebSpeech(): Promise<WebSpeechDiagnostic> {
  const diagnostic: WebSpeechDiagnostic = {
    hasRecognitionSupport: false,
    hasSynthesisSupport: false,
    isSecureContext: window.isSecureContext,
    availableVoices: 0,
    recommendedFixes: []
  };

  // Check Speech Recognition
  try {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      diagnostic.hasRecognitionSupport = true;
      
      // Test instantiation
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'tr-TR';
        // Don't start it, just test creation
      } catch (e) {
        diagnostic.recognitionError = `Recognition init error: ${e}`;
        diagnostic.recommendedFixes.push('Speech Recognition API mevcut ama başlatılamıyor');
      }
    } else {
      diagnostic.recognitionError = 'SpeechRecognition API not found';
      diagnostic.recommendedFixes.push('Tarayıcınız Speech Recognition API desteklemiyor');
    }
  } catch (e) {
    diagnostic.recognitionError = `Check failed: ${e}`;
  }

  // Check microphone permission
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      diagnostic.microphoneStatus = result.state as any;
      
      if (result.state === 'denied') {
        diagnostic.recommendedFixes.push('Mikrofon izni reddedilmiş - tarayıcı ayarlarından izin verin');
      }
    } else {
      // Try getUserMedia to check permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        diagnostic.microphoneStatus = 'granted';
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          diagnostic.microphoneStatus = 'denied';
          diagnostic.recommendedFixes.push('Mikrofon erişimi reddedildi');
        } else {
          diagnostic.microphoneStatus = 'error';
        }
      }
    }
  } catch (e) {
    diagnostic.microphoneStatus = 'error';
  }

  // Check Speech Synthesis
  try {
    if ('speechSynthesis' in window) {
      diagnostic.hasSynthesisSupport = true;
      
      // Get voices (may be async)
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        // Wait for voices to load
        await new Promise<void>((resolve) => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
          
          // Timeout after 2 seconds
          setTimeout(resolve, 2000);
        });
      }
      
      diagnostic.availableVoices = voices.length;
      
      if (voices.length === 0) {
        diagnostic.synthesisError = 'No voices available';
        diagnostic.recommendedFixes.push('Ses sentezi sesleri yüklenemedi - internet bağlantınızı kontrol edin');
      }
    } else {
      diagnostic.synthesisError = 'SpeechSynthesis API not found';
      diagnostic.recommendedFixes.push('Tarayıcınız Speech Synthesis API desteklemiyor');
    }
  } catch (e) {
    diagnostic.synthesisError = `Synthesis check failed: ${e}`;
  }

  // Check secure context
  if (!window.isSecureContext) {
    diagnostic.recommendedFixes.push('Güvenli bağlantı (HTTPS) gerekli - HTTP üzerinde çalışmıyor');
  }

  // Browser-specific recommendations
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox')) {
    diagnostic.recommendedFixes.push('Firefox sınırlı destek sunuyor - Chrome veya Edge önerilir');
  }

  return diagnostic;
}

// Enhanced Speech Recognition Factory
export function createEnhancedRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    throw new Error('Speech Recognition API not supported');
  }

  const recognition = new SpeechRecognition();
  
  // Enhanced configuration for better compatibility
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  recognition.lang = 'tr-TR';
  
  // Add error recovery
  let restartAttempts = 0;
  const maxRestartAttempts = 3;
  
  recognition.onerror = (event: any) => {
    console.error('[EnhancedRecognition] Error:', event.error);
    
    // Auto-restart on certain errors
    if (event.error === 'network' && restartAttempts < maxRestartAttempts) {
      restartAttempts++;
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error('[EnhancedRecognition] Restart failed:', e);
        }
      }, 1000);
    }
  };
  
  // Reset restart counter on success
  const originalOnResult = recognition.onresult;
  recognition.onresult = function(event: any) {
    restartAttempts = 0;
    if (originalOnResult) {
      originalOnResult.call(this, event);
    }
  };
  
  return recognition;
}

// Fix for mobile Web Speech API
export function initializeMobileWebSpeech() {
  // Force load speech synthesis voices on mobile
  if ('speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    
    // Trigger voice loading
    synth.getVoices();
    
    // Keep synthesis active
    const keepAlive = () => {
      if (synth.speaking) return;
      
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      synth.speak(utterance);
    };
    
    // Call keepAlive periodically to prevent mobile browser from unloading
    setInterval(keepAlive, 30000);
  }
  
  // Add visibility change handler to resume on tab focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  });
  
  // Handle audio context for mobile browsers
  let audioContextInitialized = false;
  let audioContext: AudioContext | null = null;
  
  const initAudioContext = () => {
    if (audioContextInitialized) return;
    
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        // Only create AudioContext after user gesture to prevent autoplay violations
        if (!audioContext) {
          audioContext = new AudioContext();
        }
        
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            // Sessiz log - autoplay policy normal davranış
            audioContextInitialized = true;
          }).catch(() => {
            // Completely silent - this is expected browser behavior
          });
        } else if (audioContext && audioContext.state === 'running') {
          audioContextInitialized = true;
        }
      }
    } catch (error) {
      // Completely silent - autoplay policy is expected behavior
    }
  };
  
  // Initialize on user interaction
  document.addEventListener('click', initAudioContext, { once: true, passive: true });
  document.addEventListener('touchstart', initAudioContext, { once: true, passive: true });
}

// Polyfill for missing Web Speech API features
export function applyWebSpeechPolyfills() {
  // Add missing event handlers if needed
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
    
    const originalConstructor = SpeechRecognition;
    
    (window as any).SpeechRecognition = function() {
      const instance = new originalConstructor();
      
      // Add missing properties
      if (!('maxAlternatives' in instance)) {
        instance.maxAlternatives = 1;
      }
      
      return instance;
    };
    
    // Copy static properties
    Object.setPrototypeOf((window as any).SpeechRecognition, originalConstructor);
    Object.setPrototypeOf((window as any).SpeechRecognition.prototype, originalConstructor.prototype);
  }
}