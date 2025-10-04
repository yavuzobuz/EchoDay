import React from 'react';
import Logo from '../components/Logo';

interface WelcomeProps {
  onGetStarted: () => void;
}

const Feature: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="flex flex-col items-center p-6 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-center h-full">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--accent-color-100)] dark:bg-[var(--accent-color-900)] text-[var(--accent-color-600)] dark:text-[var(--accent-color-300)] mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm">{children}</p>
  </div>
);


const Welcome: React.FC<WelcomeProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 transition-colors duration-300">
      <div className="text-center max-w-4xl mx-auto">
        <div className="inline-block p-4 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
            <Logo className="w-12 h-12 text-[var(--accent-color-600)]" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold mb-2 bg-gradient-to-r from-[var(--accent-color-600)] to-[var(--accent-color-700)] bg-clip-text text-transparent">
          EchoDay
        </h1>
        <p className="text-2xl text-gray-700 dark:text-gray-300 mb-6">
          Gününüzün Yankısı
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Sesli komutlar, akıllı öneriler ve güçlü not alma özellikleriyle gününüzü kolayca planlayın. Gemini AI desteği ile verimliliğinizi en üst seviyeye çıkarın.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
            title="Sesle Yönetim"
          >
            Görevlerinizi ve notlarınızı sesli komutlarla ekleyin, asistanınızla sohbet edin.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
            title="Akıllı Analiz"
          >
            Yapay zeka, görevlerinizden tarih, öncelik ve konum gibi detayları otomatik olarak çıkarır.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title="Görselden Görev"
          >
            Bir faturanın, posterin veya el yazısı notun fotoğrafından anında görevler oluşturun.
          </Feature>
          <Feature
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            title="Günlük Özet"
          >
            Güne başlarken günün görevleri, odak noktaları ve olası zamanlama çakışmaları hakkında özet alın.
          </Feature>
        </div>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--accent-color-600)] text-white text-lg font-semibold rounded-lg shadow-md hover:bg-[var(--accent-color-700)] transition-transform transform hover:scale-105"
        >
          <span>Kullanmaya Başla</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Welcome;