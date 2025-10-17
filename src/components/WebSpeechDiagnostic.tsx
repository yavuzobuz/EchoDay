import React, { useState, useCallback, useRef } from 'react';
import { diagnoseWebSpeech, WebSpeechDiagnostic } from '../utils/webSpeechFix';
import { useI18n } from '../contexts/I18nContext';

const WebSpeechDiagnosticComponent: React.FC = () => {
  const { lang } = useI18n();
  const [diagnostic, setDiagnostic] = useState<WebSpeechDiagnostic | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    micTest: 'pending' | 'success' | 'failed';
    speakTest: 'pending' | 'success' | 'failed';
    recognitionTest: 'pending' | 'success' | 'failed';
  }>({
    micTest: 'pending',
    speakTest: 'pending',
    recognitionTest: 'pending'
  });
  const [recognizedText, setRecognizedText] = useState('');
  const recognitionRef = useRef<any>(null);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setTestResults({
      micTest: 'pending',
      speakTest: 'pending',
      recognitionTest: 'pending'
    });
    setRecognizedText('');

    try {
      // Run basic diagnostic
      const result = await diagnoseWebSpeech();
      setDiagnostic(result);

      // Test 1: Microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setTestResults(prev => ({ ...prev, micTest: 'success' }));
      } catch (e) {
        setTestResults(prev => ({ ...prev, micTest: 'failed' }));
      }

      // Test 2: Speech Synthesis (TTS)
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(
            lang === 'tr' ? 'Test sesi çalıyor' : 'Test sound playing'
          );
          utterance.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
          utterance.volume = 0.5;
          
          await new Promise<void>((resolve, reject) => {
            utterance.onend = () => resolve();
            utterance.onerror = () => reject();
            window.speechSynthesis.speak(utterance);
            
            setTimeout(() => reject(new Error('Timeout')), 5000);
          });
          
          setTestResults(prev => ({ ...prev, speakTest: 'success' }));
        } catch (e) {
          setTestResults(prev => ({ ...prev, speakTest: 'failed' }));
        }
      } else {
        setTestResults(prev => ({ ...prev, speakTest: 'failed' }));
      }

      // Test 3: Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || 
                                 (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          
          recognition.lang = lang === 'tr' ? 'tr-TR' : 'en-US';
          recognition.continuous = false;
          recognition.interimResults = true;
          
          await new Promise<void>((resolve, reject) => {
            recognition.onresult = (event: any) => {
              const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');
              setRecognizedText(transcript);
            };
            
            recognition.onend = () => resolve();
            recognition.onerror = (e: any) => {
              console.error('Recognition error:', e);
              reject(e);
            };
            
            recognition.start();
            
            // Auto-stop after 5 seconds
            setTimeout(() => {
              try {
                recognition.stop();
              } catch {}
              resolve();
            }, 5000);
          });
          
          setTestResults(prev => ({ ...prev, recognitionTest: 'success' }));
        } catch (e) {
          console.error('Recognition test failed:', e);
          setTestResults(prev => ({ ...prev, recognitionTest: 'failed' }));
        }
      } else {
        setTestResults(prev => ({ ...prev, recognitionTest: 'failed' }));
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
    } finally {
      setIsRunning(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    }
  }, [lang]);

  const getStatusIcon = (status: 'pending' | 'success' | 'failed') => {
    switch (status) {
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'failed':
        return <span className="text-red-500">✗</span>;
      default:
        return <span className="text-yellow-500">⚠</span>;
    }
  };

  const getStatusText = (status: 'pending' | 'success' | 'failed') => {
    if (lang === 'tr') {
      switch (status) {
        case 'success': return 'Başarılı';
        case 'failed': return 'Başarısız';
        default: return 'Bekleniyor';
      }
    } else {
      switch (status) {
        case 'success': return 'Success';
        case 'failed': return 'Failed';
        default: return 'Pending';
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        {lang === 'tr' ? 'Web Speech API Tanılama' : 'Web Speech API Diagnostic'}
      </h2>

      <button
        onClick={runDiagnostic}
        disabled={isRunning}
        className="w-full mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
      >
        {isRunning 
          ? (lang === 'tr' ? 'Test Çalışıyor...' : 'Running Tests...') 
          : (lang === 'tr' ? 'Tanılama Testini Başlat' : 'Start Diagnostic Test')}
      </button>

      {/* Test Results */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎤</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {lang === 'tr' ? 'Mikrofon Erişimi' : 'Microphone Access'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.micTest)}
            <span className="text-sm">{getStatusText(testResults.micTest)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔊</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {lang === 'tr' ? 'Ses Sentezi (TTS)' : 'Speech Synthesis (TTS)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.speakTest)}
            <span className="text-sm">{getStatusText(testResults.speakTest)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎙️</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {lang === 'tr' ? 'Ses Tanıma' : 'Speech Recognition'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.recognitionTest)}
            <span className="text-sm">{getStatusText(testResults.recognitionTest)}</span>
          </div>
        </div>
      </div>

      {/* Recognized Text */}
      {recognizedText && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
            {lang === 'tr' ? 'Tanınan Metin:' : 'Recognized Text:'}
          </p>
          <p className="text-gray-800 dark:text-gray-200">{recognizedText}</p>
        </div>
      )}

      {/* Diagnostic Details */}
      {diagnostic && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'tr' ? 'Sistem Bilgileri' : 'System Information'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'tr' ? 'Güvenli Bağlantı' : 'Secure Context'}
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {diagnostic.isSecureContext ? '✓ HTTPS' : '✗ HTTP'}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'tr' ? 'Kullanılabilir Sesler' : 'Available Voices'}
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {diagnostic.availableVoices}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'tr' ? 'Mikrofon Durumu' : 'Microphone Status'}
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {diagnostic.microphoneStatus || 'unknown'}
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'tr' ? 'Tarayıcı' : 'Browser'}
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                 navigator.userAgent.includes('Safari') ? 'Safari' :
                 navigator.userAgent.includes('Firefox') ? 'Firefox' :
                 navigator.userAgent.includes('Edge') ? 'Edge' : 'Other'}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {diagnostic.recommendedFixes.length > 0 && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">
                {lang === 'tr' ? 'Öneriler' : 'Recommendations'}
              </h3>
              <ul className="space-y-2">
                {diagnostic.recommendedFixes.map((fix, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-yellow-500 mt-1 flex-shrink-0">⚠</span>
                    <span className="text-sm">{fix}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Platform-specific info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>{lang === 'tr' ? 'Not:' : 'Note:'}</strong>{' '}
              {lang === 'tr' 
                ? 'Mobil cihazlarda ses tanıma ve sentez özellikleri tarayıcıya ve işletim sistemine göre değişebilir. En iyi deneyim için Chrome veya Safari kullanın.'
                : 'Speech recognition and synthesis features may vary on mobile devices depending on browser and OS. Use Chrome or Safari for best experience.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSpeechDiagnosticComponent;