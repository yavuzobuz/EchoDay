import React from 'react';
import Logo from '../components/Logo';

interface WelcomeProps {
  onGetStarted: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block p-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
            <Logo className="w-12 h-12 text-[var(--accent-color-600)]" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Akıllı Görev Asistanınıza Hoş Geldiniz
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Sesli komutlar, akıllı öneriler ve güçlü not alma özellikleriyle gününüzü kolayca planlayın. Gemini AI desteği ile verimliliğinizi en üst seviyeye çıkarın.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--accent-color-600)] text-white text-lg font-semibold rounded-lg shadow-md hover:bg-[var(--accent-color-700)] transition-transform transform hover:scale-105"
          >
            <span>Kullanmaya Başla</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          
          <a
            href="/sesli-asistan.apk"
            download="sesli-asistan.apk"
            className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-green-700 transition-transform transform hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Android APK İndir</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Welcome;