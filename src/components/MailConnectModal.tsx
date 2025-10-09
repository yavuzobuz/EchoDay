import React, { useState, useEffect } from 'react';
import { mailService } from '../services/mailService';
import { EmailProvider } from '../types/mail';

function ManualImapForm({ onSuccess }: { onSuccess: () => void }) {
  const [protocol, setProtocol] = React.useState<'imap'|'pop3'>('imap');
  const [host, setHost] = React.useState('imap.yandex.com');
  const [port, setPort] = React.useState(993);
  const [secure, setSecure] = React.useState(true);
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [testing, setTesting] = React.useState(false);
  const [error, setError] = React.useState<string|null>(null);
  const [ok, setOk] = React.useState(false);

  const BRIDGE = (import.meta as any).env?.VITE_MAIL_BRIDGE_URL || 'http://localhost:5123';

  const handleTest = async () => {
    try {
      setTesting(true); setError(null);
      // Basic client-side validation for better UX
      if (!host || !user || !pass) {
        setError('Sunucu, kullanıcı adı ve şifre zorunludur.');
        setOk(false);
        return;
      }
      const url = protocol === 'imap' ? `${BRIDGE}/imap/test` : `${BRIDGE}/pop/test`;
      const body: any = { host, port, secure, user, pass };
      console.log('[MailConnectModal] Testing connection with:', { host, port, secure, user: user?.substring(0, 3) + '***', hasPass: !!pass });
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let j: any = null;
      try { j = await r.json(); } catch {}
      console.log('[MailConnectModal] Server response:', { status: r.status, ok: r.ok, body: j });
      console.log('[MailConnectModal] Full error details:', JSON.stringify(j, null, 2));
      if (!r.ok || (j && j.success === false)) {
        const msg = (j && (j.error || j.message)) || `HTTP ${r.status}`;
        throw new Error(msg);
      }
      setOk(true);
    } catch (e:any) {
      setError(e.message || 'Bağlantı hatası'); setOk(false);
    } finally { setTesting(false); }
  };

  const handleSave = () => {
    const key = 'customMailAccounts';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ id: crypto.randomUUID(), provider: 'custom', protocol, host, port, secure, user, pass, createdAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list));
    onSuccess();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className={`px-3 py-1 rounded-full text-sm cursor-pointer ${protocol==='imap'?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700'}`}>IMAP
          <input type="radio" className="hidden" checked={protocol==='imap'} onChange={()=>setProtocol('imap')} /></label>
        <label className={`px-3 py-1 rounded-full text-sm cursor-pointer ${protocol==='pop3'?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700'}`}>POP3
          <input type="radio" className="hidden" checked={protocol==='pop3'} onChange={()=>setProtocol('pop3')} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-sm">Sunucu</label>
          <input className="w-full p-2 rounded border dark:bg-gray-700" value={host} onChange={e=>setHost(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Port</label>
          <input type="number" className="w-full p-2 rounded border dark:bg-gray-700" value={port} onChange={e=>setPort(Number(e.target.value))} />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={secure} onChange={e=>setSecure(e.target.checked)} /> SSL/TLS</label>
        </div>
        <div className="col-span-2">
          <label className="text-sm">E-posta Kullanıcı Adı</label>
          <input className="w-full p-2 rounded border dark:bg-gray-700" value={user} onChange={e=>setUser(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-sm">Şifre / Uygulama Şifresi</label>
          <input type="password" className="w-full p-2 rounded border dark:bg-gray-700" value={pass} onChange={e=>setPass(e.target.value)} />
        </div>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      {ok && <div className="text-sm text-green-600 dark:text-green-400">✓ Bağlantı başarılı! Şimdi kaydedebilirsiniz.</div>}
      <div className="flex gap-2">
        <button onClick={handleTest} disabled={testing || !host || !user || !pass} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed">Bağlantıyı Test Et</button>
        <button onClick={handleSave} disabled={!ok} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed">Kaydet</button>
      </div>
      <p className="text-xs text-gray-500">Not: IMAP/POP bağlantısı için yerel köprü sunucusu gerekir. {BRIDGE}</p>
    </div>
  );
}

interface MailConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultShowHelp?: boolean;
}

const MailConnectModal: React.FC<MailConnectModalProps> = ({ isOpen, onClose, onSuccess, defaultShowHelp }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(!!defaultShowHelp);
  const guideOnly = !!defaultShowHelp && showHelp;
  useEffect(() => {
    if (isOpen) setShowHelp(!!defaultShowHelp);
  }, [defaultShowHelp, isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (provider: EmailProvider) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (provider === 'gmail') {
        await mailService.connectGmail();
      } else {
        await mailService.connectOutlook();
      }
      // OAuth redirect will happen here
    } catch (err) {
      console.error('Connection error:', err);
      setError('Bağlantı başlatılamadı. Lütfen tekrar deneyin.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {guideOnly ? 'Mail Rehberi' : 'Mail Hesabı Bağla'}
            </h2>
            <div className="flex items-center gap-2">
              {guideOnly && (
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Bağlanmaya Geç
                </button>
              )}
              <button
                onClick={onClose}
                disabled={isConnecting}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {guideOnly ? 'Aşağıdaki adımları izleyin.' : 'E-postalarınıza erişmek için bir hesap seçin'}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Connect UI (hidden in guide-only mode) */}
          {!guideOnly && (
            <>
              {/* Gmail Button */}
              <button
                onClick={() => handleConnect('gmail')}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"
                  />
                  <path
                    fill="#4A90E2"
                    d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z"
                  />
                </svg>
                <span className="text-base font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Gmail ile Bağlan
                </span>
              </button>

              {/* Outlook Button */}
              <button
                onClick={() => handleConnect('outlook')}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#0078D4"
                    d="M22.5 0h-21C.673 0 0 .673 0 1.5v21c0 .827.673 1.5 1.5 1.5h21c.827 0 1.5-.673 1.5-1.5v-21c0-.827-.673-1.5-1.5-1.5z"
                  />
                  <path
                    fill="#FFF"
                    d="M6 6h5v5H6V6zm7 0h5v5h-5V6zM6 13h5v5H6v-5zm7 0h5v5h-5v-5z"
                  />
                </svg>
                <span className="text-base font-semibold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Outlook ile Bağlan
                </span>
              </button>

              {/* IMAP/POP3 (Manuel) */}
              <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold mb-3">IMAP / POP3 (Manuel)</h3>
                <ManualImapForm onSuccess={onSuccess} />
              </div>
            </>
          )}

          {/* Help & Guide */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowHelp(v => !v)}
              className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium"
            >
              {showHelp ? 'Yardımı Gizle' : 'Yardım ve Rehber (Adım Adım)'}
            </button>

            {showHelp && (
              <div className="mt-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 space-y-5 text-sm leading-6">
                {/* Hangi yolu seçmeliyim */}
                <div className="p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2">Hangi yolu seçmeliyim?</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><b>Gmail</b> hesabınız varsa: Yukarıdaki <b>Gmail ile Bağlan</b> düğmesi (en kolay ve önerilen).</li>
                    <li><b>Outlook/Hotmail/Office365</b>: <b>Outlook ile Bağlan</b> düğmesi.</li>
                    <li><b>Kurumsal/Diğer</b> (Yahoo, Yandex vb.): <b>IMAP / POP3 (Manuel)</b> bölümünü kullanın.</li>
                  </ul>
                </div>

                {/* Adımların özeti */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold">Adım 1 — Yöntemi Seç</h4>
                    <p>Gmail / Outlook için ilgili düğmeye tıklayın. Diğer sağlayıcılar için aşağıdaki Manuel adımları izleyin.</p>
                  </div>
                  <div className="p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold">Adım 2 — Bağlan</h4>
                    <p>Yetkilendirme ekranında izinleri onaylayın. Manuel kurulumda sunucu bilgilerini girin ve <b>Bağlantıyı Test Et</b>'e tıklayın.</p>
                  </div>
                  <div className="p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold">Adım 3 — Kontrol</h4>
                    <p>Başarılı ise <b>Kaydet</b> deyin ve profil sayfasından <b>📬 Maillerimi Gör</b> ile gelen kutunuzu açın.</p>
                  </div>
                </div>

                {/* Görsel Şema */}
                <div className="p-3 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2">Mimari Şema (Özet)</h4>
                  <div className="overflow-x-auto">
                    <svg width="760" height="200" viewBox="0 0 760 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mail akış diyagramı">
                      <defs>
                        <marker id="arrow-modal" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L0,6 L6,3 z" fill="#1f2937" />
                        </marker>
                      </defs>
                      <rect x="30" y="50" width="220" height="70" rx="10" fill="#e6f4ff" stroke="#1f2937" />
                      <text x="140" y="85" textAnchor="middle" fontSize="14" fill="#111827">İstemci (EchoDay)</text>
                      <rect x="270" y="50" width="220" height="70" rx="10" fill="#ecfdf5" stroke="#065f46" />
                      <text x="380" y="75" textAnchor="middle" fontSize="14" fill="#064e3b">Mail Bridge (HTTP)</text>
                      <text x="380" y="95" textAnchor="middle" fontSize="12" fill="#065f46">Varsayılan: http://localhost:5123</text>
                      <rect x="510" y="50" width="220" height="70" rx="10" fill="#fff7ed" stroke="#9a3412" />
                      <text x="620" y="75" textAnchor="middle" fontSize="14" fill="#7c2d12">IMAP/POP Sunucusu</text>
                      <text x="620" y="95" textAnchor="middle" fontSize="12" fill="#9a3412">(Gmail, Yandex, Kurumsal vs.)</text>
                      <line x1="250" y1="85" x2="270" y2="85" stroke="#1f2937" strokeWidth="2" markerEnd="url(#arrow-modal)" />
                      <text x="260" y="75" textAnchor="middle" fontSize="12" fill="#374151">JSON/HTTPS</text>
                      <line x1="490" y1="85" x2="510" y2="85" stroke="#1f2937" strokeWidth="2" markerEnd="url(#arrow-modal)" />
                      <text x="500" y="75" textAnchor="middle" fontSize="12" fill="#374151">IMAPS/POP3S</text>
                    </svg>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Detaylı adımlar ve ek SVG'ler için proje içinde: <code>server/docs/mail-ekleme-rehberi.md</code></p>
                </div>

                {/* Gmail */}
                <div>
                  <h4 className="font-semibold mb-1">Gmail (En Kolay)</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><b>Gmail ile Bağlan</b>'a tıklayın.</li>
                    <li>Hesabınızı seçin ve izinleri onaylayın.</li>
                    <li>Uygulama otomatik olarak size geri döner.</li>
                  </ol>
                  <div className="mt-3 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h5 className="font-bold text-red-700 dark:text-red-300 mb-1">⚠️ ÖNEMLİ: Manuel Gmail IMAP için</h5>
                    <p className="text-sm text-red-600 dark:text-red-400">Normal Gmail şifrenizi <b>ASLA</b> kullanmayın! <b>Uygulama Şifresi</b> gerekli:</p>
                    <ol className="list-decimal pl-4 mt-2 text-sm text-red-600 dark:text-red-400 space-y-1">
                      <li><a className="underline font-bold" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">🔗 myaccount.google.com/apppasswords</a></li>
                      <li>"Mail" seç → "EchoDay" yaz → <b>Oluştur</b></li>
                      <li><b>16 haneli kodu kopyala</b> (örn: abcdefghijklmnop)</li>
                      <li>Bu kodu şifre alanına yapıştır</li>
                    </ol>
                    <p className="text-xs mt-2 text-red-500 dark:text-red-400">⚠️ 2-Aşamalı Doğrulama aktif olmalı!</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Gmail IMAP bilgisi: <a className="text-blue-600 dark:text-blue-400 underline" href="https://support.google.com/mail/answer/7126229?hl=tr" target="_blank" rel="noopener noreferrer">Google destek</a></p>
                </div>

                {/* Outlook */}
                <div>
                  <h4 className="font-semibold mb-1">Outlook / Hotmail / Office365</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><b>Outlook ile Bağlan</b>'a tıklayın.</li>
                    <li>Microsoft hesabınızla giriş yapın ve <b>Mail.Read</b> iznini onaylayın.</li>
                    <li>Bağlantı tamamlandığında otomatik dönüş yapılır.</li>
                  </ol>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Hesap güvenliği: <a className="text-blue-600 dark:text-blue-400 underline" href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer">Microsoft güvenlik</a></p>
                </div>

                {/* Manuel */}
                <div>
                  <h4 className="font-semibold mb-1">IMAP / POP3 (Manuel) — En Basit Yol</h4>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li><b>Köprü sunucuyu başlatın</b> (geliştirme ortamında gereklidir):
                        <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded select-all overflow-x-auto">npm run mail:server</pre>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Varsayılan: http://localhost:5123 — Farklıysa <code>VITE_MAIL_BRIDGE_URL</code> ile eşleşmeli.</span>
                      </li>
                      <li><b>Sunucu bilgilerini girin</b> (sağlayıcınıza göre):
                        <div className="mt-2 grid grid-cols-1 gap-1">
                          <div className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><code>Gmail IMAP</code>: imap.gmail.com • 993 • SSL</div>
                          <div className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><code>Outlook</code>: outlook.office365.com • 993 • SSL</div>
                          <div className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><code>Yandex</code>: imap.yandex.com • 993 • SSL</div>
                          <div className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"><code>POP3</code>: pop.gmail.com • 995 • SSL</div>
                        </div>
                      </li>
                      <li><b>Kullanıcı adı</b> alanına tam e‑posta adresinizi yazın; <b>şifre</b> için çoğu zaman <b>Uygulama Şifresi</b> gerekir:
                        <div className="mt-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300">⚠️ GMAIL KULLANICILARI DİKKAT:</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">Normal şifre ÇALIŞMaz! Mutlaka <b>uygulama şifresi</b> oluşturun:</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">🔗 <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a></p>
                        </div>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li><b>Gmail</b>: 2 Aşamalı Doğrulama açık → <a className="text-blue-600 dark:text-blue-400 underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">Uygulama şifreleri</a> (16 haneli kod)</li>
                          <li><b>Microsoft/Outlook</b>: <a className="text-blue-600 dark:text-blue-400 underline" href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer">Güvenlik</a> sayfasından oluşturun</li>
                          <li><b>Yandex</b>: Genelde normal şifre yeter, <a className="text-blue-600 dark:text-blue-400 underline" href="https://yandex.com/support/mail/mail-clients/others.html" target="_blank" rel="noopener noreferrer">rehber</a></li>
                        </ul>
                      </li>
                      <li><b>Bağlantıyı Test Et</b> → başarılı ise <b>Kaydet</b>.</li>
                    </ol>
                  </div>

                {/* SSS */}
                <div>
                  <h4 className="font-semibold mb-1">Sık Sorulanlar</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><b>"🔴 Application-specific password required"</b> (Gmail): Normal şifre kullanıyorsunuz! <b>Uygulama şifresi</b> oluşturun: <a className="text-red-600 dark:text-red-400 underline font-bold" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">myaccount.google.com/apppasswords</a></li>
                    <li><b>"Giriş reddedildi"</b>: Şifre doğru mu? Gmail için mutlaka uygulama şifresi gerekli!</li>
                    <li><b>"Bağlantı başarısız"</b>: Port/SSL doğru mu? Güvenlik duvarı engelliyor olabilir.</li>
                    <li><b>Köprü bulunamadı</b>: Terminalde <code>npm run mail:server</code> çalışıyor mu? URL doğru mu?</li>
                  </ul>
                </div>

                {/* Bağlantılar */}
                <div>
                  <h4 className="font-semibold mb-1">Faydalı bağlantılar</h4>
                  <ul className="list-disc pl-5 space-y-1 text-blue-700 dark:text-blue-400">
                    <li><a className="underline" href="https://support.google.com/mail/answer/7126229?hl=tr" target="_blank" rel="noopener noreferrer">Gmail IMAP ayarları</a></li>
                    <li><a className="underline" href="https://support.microsoft.com/tr-tr/office/outlook-imap-ayarlar%C4%B1-" target="_blank" rel="noopener noreferrer">Outlook IMAP ayarları</a></li>
                    <li><a className="underline" href="https://yandex.com/support/mail/mail-clients/others.html" target="_blank" rel="noopener noreferrer">Yandex Mail istemci ayarları</a></li>
                  </ul>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Not: Yerel IMAP/POP köprüsü yalnızca geliştirme içindir. İnternete açık ortamlarda kimlik doğrulaması olmadan çalıştırmayın.
                </div>
              </div>
            )}
          </div>

          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Yönlendiriliyor...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            🔒 Güvenli OAuth 2.0 ile bağlanıyorsunuz. Şifreleriniz saklanmaz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MailConnectModal;
