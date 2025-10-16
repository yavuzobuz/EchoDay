import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import Logo from '../components/Logo';

const FAQ: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: t('faq.q1', 'EchoDay nedir?'),
      answer: t('faq.a1', 'EchoDay, yapay zeka destekli sesli görev yönetimi ve planlama asistanınızdır. Sesli komutlarla görev ekleyebilir, PDF\'lerden otomatik görev çıkarabilir, e-postalarınızı analiz edebilir ve günlük rutinlerinizi optimize edebilirsiniz.')
    },
    {
      question: t('faq.q2', 'Nasıl kullanmaya başlarım?'),
      answer: t('faq.a2', '1. Uygulamayı indirin (Windows, Mac, Linux veya Android)\n2. Ücretsiz hesap oluşturun\n3. Gemini API anahtarınızı ekleyin (ücretsiz alabilirsiniz)\n4. Sesli komutla ilk görevinizi ekleyin!')
    },
    {
      question: t('faq.q3', 'Gemini API anahtarı nereden alırım?'),
      answer: t('faq.a3', 'Google AI Studio\'ya gidin (ai.google.dev), Google hesabınızla giriş yapın ve "Get API Key" butonuna tıklayın. Ücretsiz olarak günlük 60 istek hakkınız var.')
    },
    {
      question: t('faq.q4', 'Sesli komutlar hangi dillerde çalışıyor?'),
      answer: t('faq.a4', 'Şu an Türkçe ve İngilizce tam destekleniyor. PDF analizi ve görev çıkarma özelliği ise 10+ dilde çalışıyor (Almanca, Fransızca, İspanyolca, İtalyanca vb.)')
    },
    {
      question: t('faq.q5', 'Verilerim güvende mi?'),
      answer: t('faq.a5', 'Evet! Tüm verileriniz yerel cihazınızda saklanır. İsteğe bağlı Supabase senkronizasyonu kullanırsanız, veriler şifreli olarak bulutta yedeklenir. API anahtarınız hiçbir zaman sunuculara gönderilmez.')
    },
    {
      question: t('faq.q6', 'PDF\'den görev çıkarma nasıl çalışır?'),
      answer: t('faq.a6', 'PDF dosyanızı yükleyin, AI otomatik olarak:\n- Tarihleri ve zamanları tespit eder\n- Önemli görevleri çıkarır\n- Notları kategorize eder\n- Kişi ve kurum isimlerini tanır\nMahkeme celbi, fatura, toplantı notları gibi belgelerden anında görev oluşturur.')
    },
    {
      question: t('faq.q7', 'E-posta entegrasyonu nasıl çalışır?'),
      answer: t('faq.a7', 'IMAP/POP3 ayarlarınızı girerek e-postalarınızı bağlayabilirsiniz. AI:\n- E-postaları özetler\n- Aksiyon maddelerini çıkarır\n- Tek tıkla görev veya not oluşturur\n- Zengin editör ile yanıt yazmanıza yardımcı olur')
    },
    {
      question: t('faq.q8', 'Hatırlatıcılar nasıl çalışır?'),
      answer: t('faq.a8', 'Her görev için:\n- Belirli bir zamanda hatırlatma\n- X dakika/saat/gün önce hatırlatma\n- Konum bazlı hatırlatma (yaklaştığınızda bildirim)\n- Sesli bildirim ve alarm seçenekleri mevcuttur.')
    },
    {
      question: t('faq.q9', 'Yinelenen görevler oluşturabilir miyim?'),
      answer: t('faq.a9', 'Evet! Günlük, haftalık, aylık tekrarlayan görevler oluşturabilirsiniz. Görev tamamlandığında otomatik olarak bir sonraki oluşum eklenir.')
    },
    {
      question: t('faq.q10', 'Ücretsiz mi?'),
      answer: t('faq.a10', 'Temel özellikler tamamen ücretsiz! Premium özelliklerde:\n- Sınırsız AI kullanımı\n- Öncelikli destek\n- Gelişmiş analitik\n- Takım çalışma alanları bulunur.')
    },
    {
      question: t('faq.q11', 'Offline çalışır mı?'),
      answer: t('faq.a11', 'Evet! Temel görev yönetimi offline çalışır. Verileriniz yerel cihazda saklanır. AI özellikleri ve senkronizasyon için internet gereklidir.')
    },
    {
      question: t('faq.q12', 'Hangi platformlarda kullanabilirim?'),
      answer: t('faq.a12', 'Windows, macOS, Linux (masaüstü), Android (mobil) ve Web tarayıcıda çalışır. iOS sürümü yakında!')
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[hsl(var(--gradient-from))] via-[hsl(var(--gradient-via))] to-[hsl(var(--gradient-to))]">
      {/* Header Navigation - Glassmorphic */}
      <header className="sticky top-0 z-50 px-4 py-4 bg-white/10 dark:bg-gray-900/30 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t('faq.back', 'Ana Sayfa')}</span>
          </button>
          
          <div className="flex items-center gap-4">
            {/* Contact Button */}
            <a
              href="mailto:support@echoday.com"
              className="group flex items-center gap-2 px-4 py-2.5 bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-gray-700/50 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{t('faq.contact', 'İletişim')}</span>
            </a>
            
            {/* Start Button */}
            <button
              onClick={() => navigate('/app')}
              className="group relative px-5 py-2.5 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white rounded-xl font-semibold shadow-lg shadow-[hsl(var(--primary))]/25 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/30 transition-all duration-300 hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('faq.startNow', 'Hemen Başla')}
              </span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 mt-8">
            <div className="inline-block p-6 bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl rounded-3xl mb-6">
              <Logo className="w-20 h-20" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
              {t('faq.title', 'Sıkça Sorulan Sorular')}
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
              {t('faq.subtitle', 'EchoDay hakkında merak ettiğiniz her şey')}
            </p>
          </div>

          {/* FAQ Items with Magical Design */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-[hsl(var(--border))] shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/0 via-[hsl(var(--primary))]/10 to-[hsl(var(--accent))]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <button
                  onClick={() => toggleAccordion(index)}
                  className="relative w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Question Number Badge */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-[hsl(var(--foreground))] text-lg pr-4">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {openIndex === index && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full font-semibold">
                        {t('faq.open', 'Açık')}
                      </span>
                    )}
                    <svg
                      className={`w-6 h-6 text-[hsl(var(--primary))] transition-all duration-300 ${
                        openIndex === index ? 'rotate-180 scale-110' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}>
                  <div className="px-6 pb-5 pt-2 border-t border-[hsl(var(--border))]/50">
                    <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap leading-relaxed pl-12">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section with Gradient Background */}
          <div className="mt-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))]/10 via-[hsl(var(--accent))]/10 to-[hsl(var(--primary))]/10 blur-3xl" />
            <div className="relative text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-12 border border-[hsl(var(--border))] shadow-2xl">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-4">
                {t('faq.cta.title', 'Başka sorunuz mu var?')}
              </h2>
              <p className="text-lg text-[hsl(var(--muted-foreground))] mb-8 max-w-2xl mx-auto">
                {t('faq.cta.desc', 'Destek ekibimiz size yardımcı olmaktan mutluluk duyar.')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/app')}
                  className="group relative px-8 py-4 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white rounded-xl font-semibold shadow-lg shadow-[hsl(var(--primary))]/25 hover:shadow-xl hover:shadow-[hsl(var(--primary))]/30 transition-all duration-300 hover:scale-105"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {t('faq.cta.tryNow', 'Hemen Deneyin')}
                  </span>
                </button>
                <a
                  href="mailto:support@echoday.com"
                  className="group px-8 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl text-[hsl(var(--foreground))] rounded-xl font-semibold border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('faq.cta.contact', 'İletişime Geçin')}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gradient-to-b from-transparent to-black/20 dark:to-black/40 border-t border-white/10 dark:border-gray-700/30 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl shadow-lg">
                  <Logo className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
                    EchoDay
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('footer.tagline', 'Echo of Your Day')}</p>
                </div>
              </div>
              
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
                {t('footer.description', 'AI destekli görev yönetimi ve günlük planlama asistanınız. Sesli komutlarla hayatınızı organize edin.')}
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-2">
                <a href="https://github.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="GitHub">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a href="https://twitter.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Twitter">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="https://discord.gg/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Discord">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/company/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="LinkedIn">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="https://instagram.com/echoday" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-gray-800/30 hover:dark:bg-gray-800/50 transition-all group" title="Instagram">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-[hsl(var(--primary))] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">
                {t('footer.contactTitle', 'İletişim')}
              </h4>
              <div className="space-y-3">
                <a href="mailto:support@echoday.com" className="group flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--primary))]/20 transition-colors">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span>support@echoday.com</span>
                </a>
                
                <a href="tel:+905555555555" className="group flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--primary))]/20 transition-colors">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span>+90 555 555 55 55</span>
                </a>
                
                <div className="flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span>{t('footer.address', 'İstanbul, Türkiye')}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">{t('footer.quickLinks', 'Hızlı Bağlantılar')}</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => navigate('/')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.home', 'Ana Sayfa')}
                  </button>
                </li>
                <li>
                  <button onClick={() => {
                    const element = document.getElementById('new-features');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.features', 'Özellikler')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/pricing')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.pricing', 'Fiyatlandırma')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/faq')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.faq', 'SSS')}
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/app')} className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.app', 'Uygulamayı Başlat')}
                  </button>
                </li>
                <li>
                  <a href="https://github.com/echoday/docs" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.docs', 'Dokümantasyon')}
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Support & Legal */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-bold text-[hsl(var(--foreground))] mb-6 uppercase tracking-wider">{t('footer.support', 'Destek & Yasal')}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:support@echoday.com" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.contact', 'İletişim')}
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.privacy', 'Gizlilik Politikası')}
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.terms', 'Kullanım Koşulları')}
                  </a>
                </li>
                <li>
                  <a href="/cookies" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.cookies', 'Çerez Politikası')}
                  </a>
                </li>
                <li>
                  <a href="/sitemap" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-2 group">
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('footer.sitemap', 'Site Haritası')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Newsletter Section */}
          <div className="mt-12 pt-8 border-t border-white/10 dark:border-gray-700/30">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                {t('footer.newsletter.title', 'Yeniliklerden Haberdar Olun!')}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                {t('footer.newsletter.desc', 'Yeni özellikler ve güncellemelerden ilk siz haberdar olun.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t('footer.newsletter.placeholder', 'E-posta adresiniz')}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
                <button className="px-6 py-3 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  {t('footer.newsletter.button', 'Abone Ol')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/10 dark:border-gray-700/30 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                © 2024 EchoDay. {t('footer.rights', 'Tüm hakları saklıdır.')}
              </p>
              <div className="flex items-center gap-6">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  {t('footer.madeWith', 'Made with')} ❤️ {t('footer.in', 'in')} İstanbul
                </span>
                <div className="flex items-center gap-2">
                  <img src="/turkey-flag.svg" alt="Turkey" className="w-5 h-5" />
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t('footer.country', 'Türkiye')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FAQ;