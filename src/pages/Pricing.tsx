import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import StripeCheckout from '../components/StripeCheckout';
import { supabase } from '../services/supabaseClient';

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
  const { t } = useI18n();
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
              {t('pricing.card.yearlyBilled', 'Billed yearly:')} <span className="font-semibold">{yearlyPrice}</span>
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
  const { t, lang } = useI18n();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{id: string, name: string, amount: number} | null>(null);
  const periodLabel = lang === 'en' ? '/mo' : '/ay';
  const yearlyDiscount = billingPeriod === 'yearly' ? lang === 'en' ? '20% discount' : '%20 indirim' : '';
  
  const handleSelectPlan = (planId: string) => {
    if (!user) {
      navigate('/auth?mode=register&plan=' + planId);
      return;
    }
    
    // Ücretsiz plan
    if (planId === 'free') {
      alert(lang === 'en' ? 'Free plan is already active!' : 'Ücretsiz plan zaten aktif!');
      return;
    }
    
    // Ücretli plan seçildi - ödeme sayfasını aç
    const plans: Record<string, {name: string, price: number}> = {
      'pro': { name: 'Pro', price: billingPeriod === 'monthly' ? 79 : 828 },
      'pro-plus': { name: 'Pro+', price: billingPeriod === 'monthly' ? 149 : 1548 }
    };
    
    const plan = plans[planId];
    if (plan) {
      setSelectedPlan({ id: planId, name: plan.name, amount: plan.price });
      setShowCheckout(true);
    }
  };
  
  const handlePaymentSuccess = async (result: any) => {
    if (!user || !selectedPlan) return;
    
    try {
      // Supabase'e kaydetmeye çalış (RLS/konfig hatalarında fallback yapacağız)
      try {
        const { error } = await supabase.from('subscriptions').insert({
          user_id: user.id,
          plan_type: selectedPlan.id === 'pro' ? 'pro' : 'enterprise',
          status: 'active',
          amount: selectedPlan.amount,
          currency: 'TRY',
          billing_cycle: billingPeriod,
          payment_method: 'demo_card',
          metadata: { transaction_id: result.transactionId }
        });
        if (error) throw error;
      } catch (e) {
        console.warn('[Pricing] Supabase insert failed, falling back to local demo subscription:', e);
      }

      // DEMO fallback: localStorage'a yaz
      const planKey = selectedPlan.id === 'pro' 
        ? (billingPeriod === 'yearly' ? 'pro_yearly' : 'pro_monthly')
        : (billingPeriod === 'yearly' ? 'pro-plus_yearly' : 'pro-plus_monthly');
      try {
        const { saveSubscription } = await import('../services/paymentService');
        saveSubscription(user.id, planKey, result.transactionId);
      } catch {}
      
      alert(lang === 'en' 
        ? '✅ Payment successful! Your plan is now active.' 
        : '✅ Ödeme başarılı! Planınız aktif edildi.');
      setShowCheckout(false);
      setSelectedPlan(null);
      
      // Ana sayfaya yönlendir
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Subscription error:', error);
      alert(lang === 'en' ? '❌ Error activating subscription' : '❌ Abonelik aktifleştirme hatası');
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
          {t('pricing.backHome', 'Home')}
        </button>
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-[hsl(var(--foreground))] mb-4">{lang==='en' ? 'Simple, Powerful Pricing' : 'Basit, Güçlü Fiyatlandırma'}</h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto mb-8">{lang==='en' ? 'Choose the perfect plan for your daily planning. All plans include voice commands, AI analysis, and more.' : 'Günlük planlamanız için ideal planı seçin. Tüm planlar sesli komutlar, AI analizi ve daha fazlasını içerir.'}</p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`font-semibold ${billingPeriod === 'monthly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{lang==='en' ? 'Monthly' : 'Aylık'}</span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-16 h-8 bg-[hsl(var(--muted))] rounded-full p-1 transition-colors"
          >
            <div className={`absolute w-6 h-6 bg-[hsl(var(--primary))] rounded-full transition-transform ${
              billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-0'
            }`} />
          </button>
          <span className={`font-semibold ${billingPeriod === 'yearly' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            {lang==='en' ? 'Yearly' : 'Yıllık'}
            {yearlyDiscount && <span className="ml-2 text-green-600 text-sm">{yearlyDiscount}</span>}
          </span>
        </div>
      </div>
      
      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Free Plan */}
          <PricingCard
            title={lang==='en' ? 'Free' : 'Ücretsiz'}
            price="0₺"
            period={lang==='en' ? 'forever' : 'selamabad'}
            description={lang==='en' ? 'Get started with daily planning' : 'Günlük planlamaya başla'}
            features={lang==='en' ? [
              "Unlimited tasks & notes",
              "Voice commands (ATO)",
              "20 AI analyses per day",
              "Basic time reminders",
              "30-day archive",
              "Full Turkish & English",
              "Light/Dark theme",
              "Community support"
            ] : [
              "Sınırsız görevler ve notlar",
              "Sesli komutlar (ATO)",
              "Günde 20 AI analizi",
              "Temel zaman hatırlatıcıları",
              "30 günlük arşiv",
              "Tam Türkçe & İngilizce",
              "Açık/Koyu tema",
              "Topluluk desteği"
            ]}
            limitations={lang==='en' ? [
              "Image/PDF analysis",
              "Advanced location reminders",
              "AI daily briefing",
              "Priority support"
            ] : [
              "Resim/PDF analizi",
              "Gelişmiş konum hatırlatıcıları",
              "Ai günlük brifing",
              "Öncelikli destek"
            ]}
            buttonText={lang==='en' ? 'Start Free' : 'Ücretsiz Başla'}
            buttonVariant="outline"
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('free')}
          />

          {/* Pro Plan */}
          <PricingCard
            title={lang==='en' ? 'Pro' : 'Pro'}
            price={billingPeriod === 'monthly' ? '79₺' : '69₺'}
            period={periodLabel}
            yearlyPrice="828₺"
            description={lang==='en' ? 'For power users who want advanced AI' : 'Gelişmiş AI isteyenler için'}
            badge={lang==='en' ? 'MOST POPULAR' : 'EN POPÜLİR'}
            isPopular={true}
            features={lang==='en' ? [
              "Everything in Free",
              "Unlimited AI analyses",
              "Image/PDF analysis & OCR",
              "Advanced location reminders",
              "Daily AI briefing",
              "2-year archive",
              "Custom voice wake words",
              "Priority email support"
            ] : [
              "Ücretsiz plana ait her şey",
              "Sınırsız AI analizleri",
              "Resim/PDF analizi & OCR",
              "Gelişmiş konum hatırlatıcıları",
              "Günlük AI brifing",
              "2 yıllık arşiv",
              "Özel sesli uyandırma kelimeleri",
              "Öncelikli email desteği"
            ]}
            buttonText={lang==='en' ? 'Get Pro' : 'Pro Al'}
            buttonVariant="primary"
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('pro')}
          />

          {/* Pro+ Plan */}
          <PricingCard
            title={lang==='en' ? 'Pro+' : 'Pro+'}
            price={billingPeriod === 'monthly' ? '149₺' : '129₺'}
            period={periodLabel}
            yearlyPrice="1,548₺"
            description={lang==='en' ? 'Ultimate planning with max features' : 'Tüm özellikler ile en yüksek planı'}
            badge={lang==='en' ? 'BEST VALUE' : 'EN İYİ DEĞER'}
            badgeColor="bg-amber-500"
            features={lang==='en' ? [
              "Everything in Pro",
              "Unlimited everything",
              "Advanced analytics",
              "Export data (CSV/JSON)",
              "Unlimited archive (no limit)",
              "Custom integrations ready",
              "Early access to new features",
              "24/7 priority support"
            ] : [
              "Pro plana ait her şey",
              "Tüm özellikler sınırsız",
              "Gelişmiş analitiikler",
              "Verileri dışa aktar (CSV/JSON)",
              "Sınırsız arşiv (limite yok)",
              "Özel entegrasyonlara hazır",
              "Yeni özelliklere erken erişim",
              "24/7 Öncelikli destek"
            ]}
            buttonText={lang==='en' ? 'Get Pro+' : 'Pro+ Al'}
            buttonVariant="primary"
            billingPeriod={billingPeriod}
            onSelect={() => handleSelectPlan('pro-plus')}
          />
        </div>
      </div>
      
      {/* Feature Comparison Table */}
      <div className="container mx-auto px-4 py-16 border-t border-[hsl(var(--border))]">
        <h2 className="text-3xl font-bold text-center text-[hsl(var(--foreground))] mb-12">{t('pricing.comparison.title','Detailed Feature Comparison')}</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full max-w-6xl mx-auto">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="text-left py-4 px-4 text-[hsl(var(--foreground))]">{lang==='en' ? 'Features' : 'Özellikler'}</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">{t('pricing.free.title','Free')}</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">{t('pricing.personal.title','Personal')}</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--primary))] font-bold">{t('pricing.team.title','Team')}</th>
                <th className="text-center py-4 px-4 text-[hsl(var(--muted-foreground))]">{t('pricing.enterprise.title','Enterprise')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                lang==='en' ? { feature: 'AI Calls (monthly)', free: '90', starter: '1,000', pro: '1,500/user', business: 'Custom' } : { feature: 'AI çağrısı (aylık)', free: '90', starter: '1.000', pro: '1.500/kullanıcı', business: 'Özel' },
                lang==='en' ? { feature: 'Image/PDF Processing (daily)', free: '❌', starter: '20/day', pro: '25/user/day', business: 'Custom' } : { feature: 'Görsel/PDF İşleme (günlük)', free: '❌', starter: '20/gün', pro: '25/kullanıcı/gün', business: 'Özel' },
                lang==='en' ? { feature: 'Archive Retention', free: '7 days', starter: '1 year', pro: '1 year', business: 'Custom' } : { feature: 'Arşiv Süresi', free: '7 gün', starter: '1 yıl', pro: '1 yıl', business: 'Özel' },
                lang==='en' ? { feature: 'Language Support', free: 'TR & EN', starter: 'TR & EN', pro: 'TR & EN', business: 'TR & EN' } : { feature: 'Dil Desteği', free: 'TR & EN', starter: 'TR & EN', pro: 'TR & EN', business: 'TR & EN' },
                lang==='en' ? { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', business: 'Dedicated' } : { feature: 'Destek', free: 'Topluluk', starter: 'Email', pro: 'Öncelikli', business: 'Adanmış' },
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
        <h2 className="text-3xl font-bold text-center text-[hsl(var(--foreground))] mb-12">{t('pricing.faq.title','Frequently Asked Questions')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'What is EchoDay and how does it work?' : 'EchoDay nedir ve nasıl çalışır?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'EchoDay is a smart planning assistant that helps you manage daily tasks with voice commands and AI. Say “ATO” to add a task and analyze with AI.' : 'EchoDay, sesli komutlar ve AI desteği ile günlük görevlerinizi yönetmenizi sağlayan akıllı bir planlama asistanıdır. "ATO" diyerek görev ekleyebilir, AI ile analiz edebilirsiniz.'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'What is BYOK and how does it work?' : 'BYOK nedir ve nasıl çalışır?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'BYOK (Bring Your Own Key) lets you use your own Google Gemini API key to save up to 50%. API costs are yours; we only provide the platform.' : "BYOK (Bring Your Own Key), kendi Google Gemini API anahtarınızı kullanarak %50'ye varan tasarruf yapmanızı sağlar. API maliyetleri size ait olur, biz sadece platform hizmeti sunarız."}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'Can I change plans anytime?' : 'İstediğim zaman plan değiştirebilir miyim?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'Yes! You can upgrade or downgrade anytime. Changes take effect in the next billing cycle.' : 'Evet! İstediğiniz zaman planınızı yükseltebilir veya düşürebilirsiniz. Değişiklikler bir sonraki faturalama döneminde geçerli olur.'}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'How does the voice command feature work?' : 'Sesli komut özelliği nasıl çalışıyor?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'Say “ATO” (or your custom name) to activate the assistant and add tasks by voice. AI automatically determines date, time, and priority.' : '"ATO" (veya özelleştirdiğiniz isim) diyerek asistanı aktif edin ve görevlerinizi sesli olarak ekleyin. AI otomatik olarak tarih, saat ve öncelik belirler.'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'How do location-based reminders work?' : 'Konum bazlı hatırlatıcılar nasıl çalışır?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'On mobile, you can add a location to tasks. When you approach the location, you get an automatic notification. Save places like home, work, or market for reuse.' : 'Mobil cihazlarda görevlerinize konum ekleyebilirsiniz. Belirlediğiniz konuma yaklastığınızda otomatik bildirim alırsınız. Ev, iş, market gibi konumları kaydedip tekrar kullanabilirsiniz.'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'Which languages do you support?' : 'Hangi dilleri destekliyorsunuz?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'EchoDay currently fully supports Turkish and English. The UI, AI assistant, voice commands, and all features are available in both languages.' : 'EchoDay şu anda Türkçe ve İngilizce dillerini tam olarak desteklemektedir. Arayüz, AI asistan, sesli komutlar ve tüm özellikler her iki dilde de kullanılabilir.'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'Is my data secure?' : 'Verilerim güvende mi?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'Absolutely! Your data is encrypted with AES-256, GDPR compliant, and belongs only to you. You can export or delete it anytime.' : 'Kesinlikle! Verileriniz AES-256 ile şifrelenir, GDPR uyumludur ve sadece size aittir. İstediğiniz zaman dışa aktarabilir veya silebilirsiniz.'}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">{lang==='en' ? 'What is your cancellation policy?' : 'İptal politikanız nedir?'}</h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">{lang==='en' ? 'You can cancel anytime, no restrictions. After cancellation, you can continue to use it until the end of the current period.' : 'İstediğiniz zaman iptal edebilirsiniz, kısıtlama yoktur. İptal ettiğinizde dönem sonuna kadar kullanmaya devam edebilirsiniz.'}</p>
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
            <span className="text-sm font-semibold">{t('pricing.trust.ssl','256-bit SSL Encryption')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">{t('pricing.trust.payment','Secure Payment')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-semibold">{t('pricing.trust.uptime','99.9% Uptime')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="text-sm font-semibold">{t('pricing.trust.support','24/7 Support')}</span>
          </div>
        </div>
      </div>
      
      {/* Final CTA */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-2xl p-8 lg:p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{t('pricing.cta.title','Ready? Try Free for 14 Days!')}</h2>
          <p className="text-white/90 text-lg mb-8">{t('pricing.cta.subtitle','No credit card required • Cancel anytime • Start in 5 minutes')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleSelectPlan('personal')}
              className="px-8 py-4 bg-white text-[hsl(var(--primary))] font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              {t('pricing.cta.freeTrial','Start Free Trial')}
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-8 py-4 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
            >
              {t('pricing.cta.contactSales','Talk to Sales')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Ödeme Modalı */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <StripeCheckout
              planId={selectedPlan.id}
              planName={selectedPlan.name}
              amount={selectedPlan.amount}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowCheckout(false);
                setSelectedPlan(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
