import React, { useState } from 'react';
// import { loadStripe } from '@stripe/stripe-js';

// DEMO: Test mode public key (gerçek uygulamada .env'den gelecek)
// const STRIPE_PUBLIC_KEY = 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz'; // Kendi test key'inizi buraya koyun

interface StripeCheckoutProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: (paymentResult: any) => void;
  onCancel: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo ödeme simülasyonu (gerçek Stripe entegrasyonu için)
  const handleDemoPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Gerçek Stripe entegrasyonu burada olacak
      // const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
      
      // DEMO: 2 saniye bekle ve başarılı ödeme simüle et
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Demo başarı
      const demoResult = {
        success: true,
        transactionId: `demo_txn_${Date.now()}`,
        planId,
        planName,
        amount,
        paymentMethod: 'demo_card',
        timestamp: new Date().toISOString(),
      };

      onSuccess(demoResult);
    } catch (err: any) {
      setError(err.message || 'Ödeme işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ödeme Bilgileri
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {planName} planı için ödeme yapıyorsunuz
        </p>
      </div>

      {/* Plan Özeti */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700 dark:text-gray-300">Plan:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{planName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">Tutar:</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₺{amount}
          </span>
        </div>
      </div>

      {/* Demo Ödeme Formu */}
      <div className="space-y-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>🎮 DEMO MOD:</strong> Bu demo bir ödeme sistemidir. Gerçek para çekilmeyecektir.
            "Ödeme Yap" butonuna tıklayarak demo ödemeyi tamamlayabilirsiniz.
          </p>
        </div>

        {/* Demo Kart Bilgileri */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kart Numarası (Demo)
          </label>
          <input
            type="text"
            value="4242 4242 4242 4242"
            disabled
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Son Kullanma (MM/YY)
            </label>
            <input
              type="text"
              value="12/25"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CVC
            </label>
            <input
              type="text"
              value="123"
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          İptal
        </button>
        <button
          onClick={handleDemoPayment}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              İşleniyor...
            </span>
          ) : (
            'Ödeme Yap'
          )}
        </button>
      </div>

      {/* Güvenlik Notı */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
          <svg
            className="w-4 h-4 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Güvenli Demo Ödeme Sistemi
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
