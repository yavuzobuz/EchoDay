import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  ServerIcon,
  KeyIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    siteName: 'EchoDay',
    siteUrl: 'https://echoday.com',
    maintenanceMode: false,
    allowRegistration: true,
    emailVerification: true,
    twoFactorAuth: false,
    sessionTimeout: '30',
    maxFileSize: '10',
    enableNotifications: true,
    enableEmailNotifications: true,
    defaultLanguage: 'tr',
    timezone: 'Europe/Istanbul',
  });

  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = () => {
    // Save settings to database
    setSaveMessage('Ayarlar başarıyla kaydedildi!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistem Ayarları</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Genel sistem yapılandırmaları ve ayarları
            </p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckIcon className="w-5 h-5" />
            <span>Ayarları Kaydet</span>
          </button>
        </div>

        {/* Success message */}
        {saveMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-300">{saveMessage}</p>
          </div>
        )}

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <CogIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Genel Ayarlar</h3>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site Adı
                </label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site URL
                </label>
                <input
                  type="text"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Varsayılan Dil
                </label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zaman Dilimi
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Bakım Modu
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Site bakım modunda olduğunda sadece adminler erişebilir
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Güvenlik Ayarları</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Yeni Kayıt İzni
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Yeni kullanıcıların sisteme kayıt olmasına izin ver
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, allowRegistration: !settings.allowRegistration })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowRegistration ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allowRegistration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  E-posta Doğrulama
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Yeni kullanıcılar e-posta adreslerini doğrulamak zorunda
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, emailVerification: !settings.emailVerification })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.emailVerification ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailVerification ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  İki Faktörlü Kimlik Doğrulama
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Kullanıcılar için 2FA'yı etkinleştir
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.twoFactorAuth ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Oturum Zaman Aşımı (dakika)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <BellIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bildirim Ayarları</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Bildirimleri
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tarayıcı push bildirimlerini etkinleştir
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, enableNotifications: !settings.enableNotifications })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  E-posta Bildirimleri
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Kullanıcılara e-posta ile bildirim gönder
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    enableEmailNotifications: !settings.enableEmailNotifications,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enableEmailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Storage Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <ServerIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Depolama Ayarları</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maksimum Dosya Boyutu (MB)
              </label>
              <input
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Kullanıcıların yükleyebileceği maksimum dosya boyutu
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Depolama Kullanımı
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">45.2 GB / 100 GB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full"
                  style={{ width: '45%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* API Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <KeyIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">API Ayarları</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Anahtarı
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value="sk_test_••••••••••••••••••••••"
                  disabled
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Yenile
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    API Rate Limiting
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    1000 istek / saat
                  </p>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Son 1 saat: <span className="font-bold text-gray-900 dark:text-white">243</span>{' '}
                  istek
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
