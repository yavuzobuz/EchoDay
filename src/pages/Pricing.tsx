import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PricingCardProps {
  title: string;
  price: string;
  yearlyPrice?: string;
  period: string;
  description: string;
  features: string[];
  limitations?: string[];
  badge?: string;
  badgeColor?: string;
  buttonText: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline';
  onSelect: () => void;
  isPopular?: boolean;
  billingPeriod: 'monthly' | 'yearly';
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  yearlyPrice,
  period,
  description,
  features,
  limitations,
  badge,
  badgeColor = 'bg-green-500',
  buttonText,
  buttonVariant = 'primary',
  onSelect,
  isPopular = false,
  billingPeriod
}) => {
  
  return (
    <div className={`relative bg-[hsl(var(--card))] rounded-2xl shadow-xl p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
      isPopular ? 'ring-2 ring-[hsl(var(--primary))] scale-105' : ''
    }`}>
      {badge && (
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 ${badgeColor} text-white px-4 py-1 rounded-full text-sm font-bold`}>
          {badge}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">{title}</h3>
        <p className="text-[hsl(var(--muted-foreground))] text-sm">{description}</p>
      </div>
      
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl lg:text-5xl font-black text-[hsl(var(--foreground))]">
            {price}
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">{period}</span>
        </div>
        {billingPeriod === 'yearly' && yearlyPrice && (
          <div className="mt-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Yıllık faturalandırılır: <span className="font-semibold">{yearlyPrice}</span>
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-[hsl(var(--foreground))] text-sm">{feature}</span>
          </div>
        ))}
        
        {limitations && limitations.map((limitation, index) => (
          <div key={`limit-${index}`} className="flex items-start gap-3 opacity-60">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-[hsl(var(--muted-foreground))] text-sm line-through">{limitation}</span>
          </div>
        ))}
      </div>
      
      <button
        onClick={onSelect}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
          buttonVariant === 'primary'
            ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90'
            : buttonVariant === 'secondary'
            ? 'bg-[hsl(var(--accent))] text-white hover:bg-[hsl(var(--accent))]/90'
            : 'border-2 border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showBYOK, setShowBYOK] = useState(false);
  
  const handleSelectPlan = (planId: string) => {
    if (user) {
      // TODO: Ödeme sayfasına yönlendir
      alert(`Seçilen plan: ${planId} - Ödeme sistemi yakında eklenecek!`);
      console.log(`Selected plan: ${planId}`);
    } else {
      // Yeni kullanıcıları kayıt sayfasına yönlendir
      navigate('/auth?mode=register&plan=' + planId);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--gradient-from))] via-[hsl(var(--gradient-via))] to-[hsl(var(--gradient-to))]">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Ana Sayfa
        </button>
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-[hsl(var(--foreground))] mb-4">
          EchoDay ile Günlük Planlamanıza Güç Katın
        </h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto mb-8">
          Görevlerinizi sesli komutlar, AI asistanı ve otomatik arşivleme ile yönetin. 14 gün ücretsiz Pro deneme!
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className={`font-semibold ${billingPeriod === 'monthly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            Aylık
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-16 h-8 bg-[hsl(var(--muted))] rounded-full p-1 transition-colors"
          >
            <div className={`absolute w-6 h-6 bg-[hsl(var(--primary))] rounded-full transition-transform ${
              billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-0'
            }`} />
          </button>
          <span className={`font-semibold ${billingPeriod === 'yearly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            Yıllık
            <span className="ml-2 text-green-600 text-sm">2 ay ücretsiz!</span>
          </span>
        </div>
        
        {/* BYOK Toggle */}
        <div className="mb-12">
          <button
            onClick={() => setShowBYOK(!showBYOK)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {showBYOK ? 'Standart Planları Göster' : 'Kendi API Anahtarınızı Kullanın (BYOK)'}
            <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded">%50 TASARRUF</span>
          </button>
        </div>
      </div>
      
      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-20">
        {!showBYOK ? (
          // Standard Pricing
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Free Plan */}
            <PricingCard
              title="Free"
              price="0₺"
              period="/sonsuza kadar"
              description="Kişisel kullanım için başlangıç"
              features={[
                "50 aylık görev limiti",
                "10 not defteri girişi",
                "Günde 3 AI analizi",
                "Günde 5 sesli komut (ATO)",
                "7 günlük arşiv erişimi",
                "Temel zaman hatırlatıcılar",
                "Türkçe & İngilizce dil desteği",
                "Açık/Koyu tema desteği"
              ]}
              limitations={[
                "Görsel/PDF analizi",
                "AI günlük özet",
                "Konum hatırlatıcıları",
                "Takım paylaşımı"
              ]}
              buttonText="Ücretsiz Başla"
              buttonVariant="outline"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('free')}
            />
            
            {/* Starter Plan */}
            <PricingCard
              title="Starter"
              price={billingPeriod === 'monthly' ? "49₺" : "41₺"}
              period="/ay"
              yearlyPrice="490₺"
              description="Günlük verimliliğinizi artırın"
              features={[
                "500 aylık görev limiti",
                "100 not defteri girişi",
                "Günde 50 AI analizi",
                "Günde 30 sesli komut",
                "Günde 10 görsel/PDF işleme",
                "30 günlük arşiv erişimi",
                "AI günlük özet",
                "Konum bazlı hatırlatıcılar (mobil)",
                "Türkçe & İngilizce dil desteği",
                "Otomatik görev kategorileme",
                "Temel AI içgörüleri",
                "Email desteği"
              ]}
              buttonText="Başla"
              buttonVariant="secondary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('starter')}
            />
            
            {/* Professional Plan */}
            <PricingCard
              title="Professional"
              price={billingPeriod === 'monthly' ? "149₺" : "124₺"}
              period="/ay"
              yearlyPrice="1,490₺"
              description="Profesyoneller ve uzman kullanıcılar için"
              badge="EN POPÜLER"
              isPopular={true}
              features={[
                "Sınırsız görev ve not",
                "Sınırsız AI analizi",
                "Sınırsız sesli komut",
                "Sınırsız görsel/PDF işleme",
                "1 yıllık arşiv erişimi",
                "Gelişmiş konum hatırlatıcıları (mobil)",
                "Kaydedilmiş konumlar & geçmiş",
                "Türkçe & İngilizce tam desteği",
                "AI alışkanlık öğrenme & desen algılama",
                "Gelişmiş analitik & raporlama",
                "AI içgörüleri ve öneriler",
                "Kategori & zaman analizi",
                "Haftalık/Aylık performans raporları",
                "Otomatik görev kategorileme",
                "Öncelikli destek"
              ]}
              buttonText="Professional'ı Seç"
              buttonVariant="primary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('professional')}
            />
            
            {/* Business Plan */}
            <PricingCard
              title="Business"
              price={billingPeriod === 'monthly' ? "299₺" : "249₺"}
              period="/ay"
              yearlyPrice="2,990₺"
              description="Takımlar ve işletmeler için"
              badge="KURUMSAL"
              badgeColor="bg-purple-500"
              features={[
                "Professional'ın tüm özellikleri",
                "Sınırsız arşiv erişimi",
                "5 kullanıcıya kadar takım",
                "Takım görev paylaşımı",
                "Takım performans analitiği",
                "API erişimi",
                "Özel AI model eğitimi",
                "White-label seçeneği",
                "SLA garantisi (99.9% uptime)",
                "7/24 öncelikli telefon desteği",
                "Özel entegrasyon desteği"
              ]}
              buttonText="İletişime Geç"
              buttonVariant="primary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('business')}
            />
          </div>
        ) : (
          // BYOK Pricing
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              title="BYOK Starter"
              price={billingPeriod === 'monthly' ? "19₺" : "16₺"}
              period="/ay"
              yearlyPrice="190₺"
              description="Kendi Gemini API anahtarınızla başlayın"
              features={[
                "500 aylık görev limiti",
                "100 not defteri girişi",
                "Kendi API limitiniz kadar AI kullanımı",
                "30 günlük arşiv",
                "Türkçe & İngilizce dil desteği",
                "API kullanım monitörü",
                "Temel analitik",
                "Email desteği",
                "💡 Gemini Free: 1,500 istek/gün ücretsiz"
              ]}
              buttonText="BYOK Starter"
              buttonVariant="secondary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('byok-starter')}
            />
            
            <PricingCard
              title="BYOK Professional"
              price={billingPeriod === 'monthly' ? "59₺" : "49₺"}
              period="/ay"
              yearlyPrice="590₺"
              description="Tam kontrol ve esneklik"
              badge="EN EKONOMİK"
              isPopular={true}
              features={[
                "Sınırsız görev ve not",
                "Kendi API limitiniz kadar AI kullanımı",
                "1 yıllık arşiv",
                "Türkçe & İngilizce tam desteği",
                "Gelişmiş analitik",
                "Multi-model desteği (Gemini Pro/Flash)",
                "API failover (yedek API key)",
                "Detaylı API kullanım raporu",
                "Öncelikli destek",
                "💡 Tahmini maliyet: ~$5-10/ay"
              ]}
              buttonText="BYOK Professional"
              buttonVariant="primary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('byok-professional')}
            />
            
            <PricingCard
              title="BYOK Business"
              price={billingPeriod === 'monthly' ? "119₺" : "99₺"}
              period="/ay"
              yearlyPrice="1,190₺"
              description="Kurumsal kontrol ve güvenlik"
              badge="KURUMSAL"
              badgeColor="bg-purple-500"
              features={[
                "BYOK Professional özellikleri",
                "Sınırsız arşiv",
                "5 kullanıcıya kadar takım",
                "Çoklu API key yönetimi",
                "API load balancing",
                "Özel model fine-tuning",
                "Platform API erişimi",
                "SLA garantisi",
                "7/24 telefon desteği",
                "💡 Kurumsal API indirimleri mevcut"
              ]}
              buttonText="BYOK Business"
              buttonVariant="primary"
              billingPeriod={billingPeriod}
              onSelect={() => handleSelectPlan('byok-business')}
            />
          </div>
        )}
      </div>
      
      {/* Feature Comparison Table */}
      <div className="container mx-auto px-4 py-16 border-t border-[hsl(var(--border))]">
        <h2 className="text-3xl font-bold text-center text-[hsl(var(--foreground))] mb-12">
          Detaylı Özellik Karşılaştırması
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full max-w-6xl mx-auto">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="text-left py-4 px-4 text-[hsl(var(--foreground))]">Özellikler</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">Free</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">Starter</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--primary))] font-bold">Professional</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">Business</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { feature: 'Aylık Görev Limiti', free: '50', starter: '500', pro: 'Sınırsız', business: 'Sınırsız' },
                { feature: 'Not Defteri Girişi', free: '10', starter: '100', pro: 'Sınırsız', business: 'Sınırsız' },
                { feature: 'AI Analizi (günlük)', free: '3', starter: '50', pro: 'Sınırsız', business: 'Sınırsız' },
                { feature: 'Sesli Komut (günlük)', free: '5', starter: '30', pro: 'Sınırsız', business: 'Sınırsız' },
                { feature: 'Görsel/PDF İşleme', free: '❌', starter: '10/gün', pro: 'Sınırsız', business: 'Sınırsız' },
                { feature: 'Arşiv Süresi', free: '7 gün', starter: '30 gün', pro: '1 yıl', business: 'Sınırsız' },
                { feature: 'AI Günlük Özet', free: '❌', starter: '✅', pro: '✅', business: '✅' },
                { feature: 'Otomatik Arşivleme', free: '✅', starter: '✅', pro: '✅', business: '✅' },
                { feature: 'Dil Desteği', free: 'TR & EN', starter: 'TR & EN', pro: 'TR & EN', business: 'TR & EN' },
                { feature: 'Konum Bazlı Hatırlatıcılar', free: '❌', starter: 'Temel', pro: 'Gelişmiş', business: 'Gelişmiş' },
                { feature: 'Alışkanlık Öğrenme & Desen Algılama', free: '❌', starter: 'Temel', pro: 'Gelişmiş', business: 'Gelişmiş+' },
                { feature: 'AI İçgörüleri ve Öneriler', free: '❌', starter: 'Temel', pro: 'Gelişmiş', business: 'Gelişmiş+' },
                { feature: 'Kategori & Zaman Analizi', free: '❌', starter: 'Temel', pro: 'Gelişmiş', business: 'Gelişmiş+' },
                { feature: 'Periyodik Performans Raporları', free: '❌', starter: '❌', pro: '✅', business: '✅' },
                { feature: 'API Erişimi', free: '❌', starter: '❌', pro: '❌', business: '✅' },
                { feature: 'Takım Paylaşımı', free: '❌', starter: '❌', pro: '❌', business: '5 kişi' },
                { feature: 'White-label', free: '❌', starter: '❌', pro: '❌', business: '✅' },
                { feature: 'Destek', free: 'Topluluk', starter: 'Email', pro: 'Öncelikli', business: '7/24 Telefon' },
              ].map((row, index) => (
                <tr key={index} className="border-b border-[hsl(var(--border))]/50">
                  <td className="py-3 px-4 text-[hsl(var(--foreground))]">{row.feature}</td>
                  <td className="text-center py-3 px-4 text-[hsl(var(--muted-foreground))]">{row.free}</td>
                  <td className="text-center py-3 px-4 text-[hsl(var(--muted-foreground))]">{row.starter}</td>
                  <td className="text-center py-3 px-4 text-[hsl(var(--foreground))] font-semibold bg-[hsl(var(--primary))]/5">{row.pro}</td>
                  <td className="text-center py-3 px-4 text-[hsl(var(--muted-foreground))]">{row.business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 border-t border-[hsl(var(--border))]">
        <h2 className="text-3xl font-bold text-center text-[hsl(var(--foreground))] mb-12">
          Sıkça Sorulan Sorular
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                EchoDay nedir ve nasıl çalışır?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                EchoDay, sesli komutlar ve AI desteği ile günlük görevlerinizi yönetmenizi sağlayan akıllı bir planlama asistanıdır. "ATO" diyerek görev ekleyebilir, AI ile analiz edebilirsiniz.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                BYOK nedir ve nasıl çalışır?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                BYOK (Bring Your Own Key), kendi Google Gemini API anahtarınızı kullanarak %50'ye varan tasarruf yapmanızı sağlar. API maliyetleri size ait olur, biz sadece platform hizmeti sunarız.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                İstediğim zaman plan değiştirebilir miyim?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Evet! İstediğiniz zaman planınızı yükseltebilir veya düşürebilirsiniz. Değişiklikler bir sonraki faturalama döneminde geçerli olur.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                Sesli komut özelliği nasıl çalışıyor?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                "ATO" (veya özelleştirdiğiniz isim) diyerek asistanı aktif edin ve görevlerinizi sesli olarak ekleyin. AI otomatik olarak tarih, saat ve öncelik belirler.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                Konum bazlı hatırlatıcılar nasıl çalışır?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Mobil cihazlarda görevlerinize konum ekleyebilirsiniz. Belirlediğiniz konuma yaklastığınızda otomatik bildirim alırsınız. Ev, iş, market gibi konumları kaydedip tekrar kullanabilirsiniz.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                Hangi dilleri destekliyorsunuz?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                EchoDay şu anda Türkçe ve İngilizce dillerini tam olarak desteklemektedir. Arayüz, AI asistan, sesli komutlar ve tüm özellikler her iki dilde de kullanılabilir.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                Verilerim güvende mi?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Kesinlikle! Verileriniz AES-256 ile şifrelenir, GDPR uyumludur ve sadece size aittir. İstediğiniz zaman dışa aktarabilir veya silebilirsiniz.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                İptal politikanız nedir?
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                İstediğiniz zaman iptal edebilirsiniz, kısıtlama yoktur. İptal ettiğinizde dönem sonuna kadar kullanmaya devam edebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trust Badges */}
      <div className="container mx-auto px-4 py-12 border-t border-[hsl(var(--border))]">
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">256-bit SSL Şifreleme</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">Güvenli Ödeme</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">%99.9 Uptime</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="text-sm font-semibold">7/24 Destek</span>
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl p-8 lg:p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Hazır mısınız? 14 Gün Ücretsiz Deneyin!
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Kredi kartı gerekmez • İstediğiniz zaman iptal edin • 5 dakikada başlayın
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleSelectPlan('professional')}
              className="px-8 py-4 bg-white text-[hsl(var(--primary))] font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              Ücretsiz Denemeye Başla
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-8 py-4 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
            >
              Satış Ekibiyle Konuş
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;