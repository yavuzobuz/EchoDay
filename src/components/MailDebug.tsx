import React from 'react';
import { GMAIL_OAUTH_CONFIG } from '../types/mail';

const MailDebug: React.FC = () => {
  const gmailClientId = import.meta.env.VITE_GMAIL_CLIENT_ID || 'NOT SET';
  const expectedRedirectUri = GMAIL_OAUTH_CONFIG.redirectUri;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold">🔍 OAuth Debug Bilgileri</h2>
      
      <div className="space-y-2 text-sm font-mono">
        <div>
          <strong>Client ID:</strong>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 break-all">
            {gmailClientId}
          </div>
        </div>
        
        <div>
          <strong>Redirect URI (Kod):</strong>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 break-all">
            {expectedRedirectUri}
          </div>
        </div>
        
        <div>
          <strong>window.location.origin:</strong>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 break-all">
            {window.location.origin}
          </div>
        </div>

        <div>
          <strong>Full Auth URL:</strong>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded mt-1 break-all text-xs">
            {`${GMAIL_OAUTH_CONFIG.authUrl}?client_id=${gmailClientId}&redirect_uri=${encodeURIComponent(expectedRedirectUri)}&response_type=code&scope=${encodeURIComponent(GMAIL_OAUTH_CONFIG.scopes.join(' '))}&access_type=offline&prompt=consent`}
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Google Console'da kayıtlı olması gereken:</strong><br/>
          <code className="text-xs">{expectedRedirectUri}</code>
        </p>
      </div>
    </div>
  );
};

export default MailDebug;
