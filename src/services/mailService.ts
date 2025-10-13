// Use the same Supabase instance as the AuthProvider to share session
import { supabase } from './supabaseClient';
import {
  EmailAccount,
  EmailMessage,
  EmailProvider,
  GmailMessage,
  OutlookMessage,
  TokenResponse,
  MailServiceResponse,
  GMAIL_OAUTH_CONFIG,
  OUTLOOK_OAUTH_CONFIG,
  SendEmailRequest,
  ReplyEmailRequest,
} from '../types/mail';

// Supabase client is imported from supabaseClient.ts (shared session)

// OAuth Client IDs from environment
const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = import.meta.env.VITE_GMAIL_CLIENT_SECRET || '';
const OUTLOOK_CLIENT_ID = import.meta.env.VITE_OUTLOOK_CLIENT_ID || '';
const OUTLOOK_CLIENT_SECRET = import.meta.env.VITE_OUTLOOK_CLIENT_SECRET || '';

class MailService {
  // ==================== Helpers ====================

  private mapDbEmailAccount(row: any): EmailAccount {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      emailAddress: row.email_address,
      displayName: row.display_name,
      accessToken: row.access_token,
      refreshToken: row.refresh_token || '',
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } as EmailAccount;
  }

  // ==================== OAuth Authentication ====================

  /**
   * Initiate Gmail OAuth flow
   */
  async connectGmail(): Promise<void> {
    const config = GMAIL_OAUTH_CONFIG;
    config.clientId = GMAIL_CLIENT_ID;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'token', // Changed from 'code' to 'token' (Implicit Flow)
      scope: config.scopes.join(' '),
      // access_type: 'offline', // Not supported in implicit flow
      prompt: 'consent',
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Initiate Outlook OAuth flow
   */
  async connectOutlook(): Promise<void> {
    const config = OUTLOOK_OAUTH_CONFIG;
    config.clientId = OUTLOOK_CLIENT_ID;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      response_mode: 'query',
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    provider: EmailProvider,
    code: string
  ): Promise<MailServiceResponse<EmailAccount>> {
    try {
      if (provider === 'gmail') {
        return await this.handleGmailCallback(code);
      } else {
        return await this.handleOutlookCallback(code);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error: 'OAuth authentication failed' };
    }
  }

  /**
   * Handle Gmail OAuth callback
   */
  private async handleGmailCallback(code: string): Promise<MailServiceResponse<EmailAccount>> {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(GMAIL_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GMAIL_CLIENT_ID,
          // client_secret: GMAIL_CLIENT_SECRET, // Removed for web apps (PKCE)
          redirect_uri: GMAIL_OAUTH_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      // Save to database
      const account = await this.saveEmailAccount({
        provider: 'gmail',
        emailAddress: userInfo.email,
        displayName: userInfo.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });

      return { success: true, data: account };
    } catch (error) {
      console.error('Gmail callback error:', error);
      return { success: false, error: 'Failed to connect Gmail account' };
    }
  }

  /**
   * Handle Outlook OAuth callback
   */
  private async handleOutlookCallback(code: string): Promise<MailServiceResponse<EmailAccount>> {
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(OUTLOOK_OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: OUTLOOK_CLIENT_ID,
          client_secret: OUTLOOK_CLIENT_SECRET,
          redirect_uri: OUTLOOK_OAUTH_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens: TokenResponse = await tokenResponse.json();

      // Get user info
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      // Save to database
      const account = await this.saveEmailAccount({
        provider: 'outlook',
        emailAddress: userInfo.mail || userInfo.userPrincipalName,
        displayName: userInfo.displayName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });

      return { success: true, data: account };
    } catch (error) {
      console.error('Outlook callback error:', error);
      return { success: false, error: 'Failed to connect Outlook account' };
    }
  }

  /**
   * Save email account directly (for implicit flow without refresh token)
   */
  async saveEmailAccountDirect(data: {
    provider: EmailProvider;
    emailAddress: string;
    displayName: string;
    accessToken: string;
    expiresIn: number;
  }): Promise<MailServiceResponse<EmailAccount>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();

      let { data: account, error } = await supabase
        .from('email_accounts')
        .upsert({
          user_id: user.id,
          provider: data.provider,
          email_address: data.emailAddress,
          display_name: data.displayName,
          access_token: data.accessToken,
          refresh_token: '', // No refresh token in implicit flow
          expires_at: expiresAt,
          is_active: true,
        }, { onConflict: 'user_id,email_address' })
        .select()
        .single();

      // If unique violation still occurs (older PostgREST), fallback to update
      if (error && (error as any).code === '23505') {
        const { data: existing, error: findErr } = await supabase
          .from('email_accounts')
          .select('id')
          .eq('user_id', user.id)
          .eq('email_address', data.emailAddress)
          .single();
        if (!findErr && existing) {
          const { data: updated, error: updErr } = await supabase
            .from('email_accounts')
            .update({
              display_name: data.displayName,
              access_token: data.accessToken,
              expires_at: expiresAt,
              is_active: true,
            })
            .eq('id', (existing as any).id)
            .select()
            .single();
          if (updErr) throw updErr;
          return { success: true, data: updated as EmailAccount };
        }
      }

      if (error) throw error;
      return { success: true, data: account as EmailAccount };
    } catch (error) {
      console.error('Save email account error:', error);
      return { success: false, error: 'Failed to save email account' };
    }
  }

  /**
   * Save email account to Supabase
   */
  private async saveEmailAccount(data: {
    provider: EmailProvider;
    emailAddress: string;
    displayName: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): Promise<EmailAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();

    let { data: account, error } = await supabase
      .from('email_accounts')
      .upsert({
        user_id: user.id,
        provider: data.provider,
        email_address: data.emailAddress,
        display_name: data.displayName,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: expiresAt,
        is_active: true,
      }, { onConflict: 'user_id,email_address' })
      .select()
      .single();

    if (error && (error as any).code === '23505') {
      const { data: existing, error: findErr } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_address', data.emailAddress)
        .single();
      if (!findErr && existing) {
        const { data: updated, error: updErr } = await supabase
          .from('email_accounts')
          .update({
            display_name: data.displayName,
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
            expires_at: expiresAt,
            is_active: true,
          })
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (updErr) throw updErr;
        return updated as EmailAccount;
      }
    }

    if (error) throw error;
    return account as EmailAccount;
  }

  // ==================== Token Management ====================

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(account: EmailAccount): Promise<string> {
    try {
      const now = new Date();
      const expiresAtStr = (account as any).expiresAt || (account as any).expires_at;
      const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

      // If we don't have a refresh token (implicit flow), just return current token.
      if (!account.refreshToken || account.refreshToken.length === 0) {
        // Optional: if expired, caller should trigger re-connect flow.
        return account.accessToken || '';
      }

      // If token is still valid, return it
      if (expiresAt && now < expiresAt) {
        return account.accessToken || '';
      }

      // Refresh the token (requires refresh_token)
      const config = account.provider === 'gmail' ? GMAIL_OAUTH_CONFIG : OUTLOOK_OAUTH_CONFIG;
      const clientId = account.provider === 'gmail' ? GMAIL_CLIENT_ID : OUTLOOK_CLIENT_ID;
      const clientSecret = account.provider === 'gmail' ? GMAIL_CLIENT_SECRET : OUTLOOK_CLIENT_SECRET;

      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokens: TokenResponse = await tokenResponse.json();
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update token in database
      await supabase
        .from('email_accounts')
        .update({
          access_token: tokens.access_token,
          expires_at: newExpiresAt,
        })
        .eq('id', account.id);

      return tokens.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // ==================== Email Fetching ====================

  /**
   * Get all connected email accounts for current user
   */
  async getEmailAccounts(): Promise<MailServiceResponse<EmailAccount[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((row: any) => this.mapDbEmailAccount(row));
      return { success: true, data: mapped as EmailAccount[] };
    } catch (error) {
      console.error('Get email accounts error:', error);
      return { success: false, error: 'Failed to fetch email accounts' };
    }
  }

  // ==================== Custom IMAP/POP over local bridge ====================

  private getBridgeUrl() {
    // Development'ta local mail server, Production'da Vercel API
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      // Local mail server kullan
      return (import.meta.env.VITE_LOCAL_MAIL_SERVER || import.meta.env.VITE_MAIL_BRIDGE_URL || 'http://localhost:5123').replace(/\/$/, '');
    }
    
    // Production'da (Vercel) API routes kullan
    if (import.meta.env.VITE_MAIL_API_URL) {
      return import.meta.env.VITE_MAIL_API_URL;
    }
    
    // Default olarak /api/mail (Vercel)
    return '/api/mail';
  }

  async testIMAP(config: { host: string; port?: number; secure?: boolean; user: string; pass: string; }): Promise<boolean> {
    try {
      const bridgeUrl = this.getBridgeUrl();
      const endpoint = bridgeUrl.includes('/api/mail') ? `${bridgeUrl}/imap-test` : `${bridgeUrl}/imap/test`;
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
      const j = await r.json();
      return j.success;
    } catch { return false; }
  }

  async listIMAP(config: any, limit = 20) {
    // Validate required IMAP config fields
    if (!config || !config.host || !config.user || !config.pass) {
      console.error('Invalid IMAP config:', { host: !!config?.host, user: !!config?.user, pass: !!config?.pass });
      return { success: false, error: 'Invalid IMAP configuration. Missing required fields (host, user, pass).' };
    }
    
    try {
      const bridgeUrl = this.getBridgeUrl();
      const endpoint = bridgeUrl.includes('/api/mail') ? `${bridgeUrl}/imap-list` : `${bridgeUrl}/imap/list`;
      const r = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...config, limit }) 
      });
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error('IMAP list fetch failed:', r.status, errorText);
        return { success: false, error: `Failed to fetch messages: ${r.status} ${r.statusText}` };
      }
      
      return r.json();
    } catch (error) {
      console.error('IMAP list error:', error);
      return { success: false, error: 'Network error while fetching messages' };
    }
  }

  async imapMessage(config: any, uid: string) {
    // Debug: log what we're receiving
    console.log('[mailService] imapMessage called with:', { 
      hasConfig: !!config, 
      configKeys: config ? Object.keys(config) : [], 
      host: config?.host, 
      user: config?.user?.substring(0, 3) + '***',
      uid 
    });
    
    // Validate required IMAP config fields
    if (!config || !config.host || !config.user || !config.pass) {
      console.error('Invalid IMAP config:', { host: !!config?.host, user: !!config?.user, pass: !!config?.pass });
      return { success: false, error: 'Invalid IMAP configuration. Missing required fields (host, user, pass).' };
    }
    
    try {
      const bridgeUrl = this.getBridgeUrl();
      const endpoint = bridgeUrl.includes('/api/mail') ? `${bridgeUrl}/imap-message` : `${bridgeUrl}/imap/message`;
      const r = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...config, uid }) 
      });
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error('IMAP message fetch failed:', r.status, errorText);
        return { success: false, error: `Failed to fetch message: ${r.status} ${r.statusText}` };
      }
      
      return r.json();
    } catch (error) {
      console.error('IMAP message error:', error);
      return { success: false, error: 'Network error while fetching message' };
    }
  }

  /**
   * Fetch emails from a specific account (list view)
   */
  async fetchEmails(
    accountId: string,
    maxResults: number = 20
  ): Promise<MailServiceResponse<EmailMessage[]>> {
    try {
      // Get account from database
      const { data: accountRow, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      if (!accountRow) throw new Error('Account not found');

      const account = this.mapDbEmailAccount(accountRow);

      // Refresh token if needed (or just use current if no refresh token)
      const accessToken = await this.refreshAccessToken(account);

      // Fetch emails based on provider
      if (account.provider === 'gmail') {
        return await this.fetchGmailMessages(accessToken, maxResults);
      } else {
        return await this.fetchOutlookMessages(accessToken, maxResults);
      }
    } catch (error) {
      console.error('Fetch emails error:', error);
      return { success: false, error: 'Failed to fetch emails' };
    }
  }

  /**
   * Fetch Gmail messages
   */
  private async fetchGmailMessages(
    accessToken: string,
    maxResults: number
  ): Promise<MailServiceResponse<EmailMessage[]>> {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch Gmail messages');

      const data = await response.json();
      const messages: EmailMessage[] = [];

      // Fetch details for each message
      for (const msg of data.messages || []) {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const detail: GmailMessage = await detailResponse.json();
        const parsed = this.parseGmailMessage(detail);
        messages.push(parsed);
      }

      return { success: true, data: messages };
    } catch (error) {
      console.error('Fetch Gmail messages error:', error);
      return { success: false, error: 'Failed to fetch Gmail messages' };
    }
  }

  /**
   * Fetch Outlook messages
   */
  private async fetchOutlookMessages(
    accessToken: string,
    maxResults: number
  ): Promise<MailServiceResponse<EmailMessage[]>> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch Outlook messages');

      const data = await response.json();
      const messages = (data.value || []).map((msg: OutlookMessage) =>
        this.parseOutlookMessage(msg)
      );

      return { success: true, data: messages };
    } catch (error) {
      console.error('Fetch Outlook messages error:', error);
      return { success: false, error: 'Failed to fetch Outlook messages' };
    }
  }

  /**
   * Parse Gmail message to common format
   */
  private parseGmailMessage(msg: GmailMessage): EmailMessage {
    function decodeBase64Url(data?: string): string {
      if (!data) return '';
      // Gmail uses base64url
      const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
      try {
        return decodeURIComponent(escape(window.atob(b64)));
      } catch {
        try { return window.atob(b64); } catch { return ''; }
      }
    }

    // Traverse payload to find first HTML/text body and mark attachments
    let bodyHtml = '';
    let hasAttachments = false;
    const parts = (msg.payload as any).parts || [];

    const stack = [...parts];
    while (stack.length) {
      const p: any = stack.shift();
      if (!p) continue;
      if (p.mimeType === 'text/html' && p.body?.data) {
        bodyHtml = decodeBase64Url(p.body.data);
      }
      if (p.body?.attachmentId) {
        hasAttachments = true;
      }
      if (p.parts) stack.push(...p.parts);
    }
    const headers = msg.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: msg.id,
      accountId: '',
      messageId: msg.id,
      subject: getHeader('Subject'),
      from: { address: getHeader('From') },
      to: [{ address: getHeader('To') }],
      date: new Date(parseInt(msg.internalDate)).toISOString(),
      snippet: msg.snippet,
      bodyHtml: bodyHtml || undefined,
      isRead: !msg.labelIds.includes('UNREAD'),
      hasAttachments: hasAttachments,
      labels: msg.labelIds,
    } as any;
  }

  /**
   * Get full email detail (body + inline attachments) for selected message.
   */
  async getEmailDetail(accountId: string, messageId: string): Promise<MailServiceResponse<Partial<EmailMessage>>> {
    try {
      // Load account & token
      const { data: accountRow } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .single();
      if (!accountRow) throw new Error('Account not found');
      const account = this.mapDbEmailAccount(accountRow);
      const accessToken = await this.refreshAccessToken(account);

      if (account.provider === 'gmail') {
        // Fetch gmail message full
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to load message');
        const msg: any = await res.json();

        // Helper to decode
        const decode = (data?: string) => {
          if (!data) return '';
          const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
          try {
            return decodeURIComponent(escape(window.atob(b64)));
          } catch {
            try { return window.atob(b64); } catch { return ''; }
          }
        };

        let html = '';
        const attachments: any[] = [];
        const cidMap: Record<string, string> = {};

        const stack = [...(msg.payload?.parts || [])];
        while (stack.length) {
          const p = stack.shift();
          if (!p) continue;
          const headers = p.headers || [];
          const getH = (n: string) => headers.find((h: any) => h.name?.toLowerCase() === n.toLowerCase())?.value;
          if (p.mimeType === 'text/html' && p.body?.data) {
            html = decode(p.body.data);
          }
          if (p.body?.attachmentId) {
            const cid = (getH('Content-Id') || '').replace(/[<>]/g, '');
            const attRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${p.body.attachmentId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const att = await attRes.json();
            const data = (att?.data || '').replace(/-/g, '+').replace(/_/g, '/');
            const dataUrl = `data:${p.mimeType};base64,${data}`;
            attachments.push({ id: p.body.attachmentId, filename: p.filename, mimeType: p.mimeType, contentId: cid || undefined, inline: !!cid, dataUrl });
            if (cid) cidMap[cid] = dataUrl;
          }
          if (p.parts) stack.push(...p.parts);
        }

        // Replace cid: references
        if (html) {
          html = html.replace(/src=["']cid:([^"']+)["']/gi, (m, cid) => {
            const url = cidMap[cid] || '';
            return url ? `src="${url}"` : m;
          });
        }

        return { success: true, data: { bodyHtml: html, attachments } };
      }

      // Outlook: simple body
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      return { success: true, data: { bodyHtml: data.body?.content } };
    } catch (e) {
      console.error('getEmailDetail error', e);
      return { success: false, error: 'Failed to load email detail' };
    }
  }

  /**
   * Parse Outlook message to common format
   */
  private parseOutlookMessage(msg: OutlookMessage): EmailMessage {
    return {
      id: msg.id,
      accountId: '',
      messageId: msg.id,
      subject: msg.subject,
      from: msg.from.emailAddress,
      to: msg.toRecipients.map((r) => r.emailAddress),
      cc: msg.ccRecipients?.map((r) => r.emailAddress),
      date: msg.receivedDateTime,
      snippet: msg.bodyPreview,
      isRead: msg.isRead,
      hasAttachments: msg.hasAttachments,
      importance: msg.importance,
    };
  }

  /**
   * Delete email account
   */
  async deleteEmailAccount(accountId: string): Promise<MailServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('email_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete email account error:', error);
      return { success: false, error: 'Failed to delete email account' };
    }
  }

  // ==================== Email Sending ====================

  /**
   * Send email via account
   */
  async sendEmail(
    accountId: string,
    request: SendEmailRequest
  ): Promise<MailServiceResponse<{ messageId: string }>> {
    try {
      // Get account from database or localStorage
      const { data: accountRow } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountRow) {
        // OAuth account (Gmail/Outlook)
        const account = this.mapDbEmailAccount(accountRow);
        const accessToken = await this.refreshAccessToken(account);

        if (account.provider === 'gmail') {
          return await this.sendGmailMessage(accessToken, request);
        } else if (account.provider === 'outlook') {
          return await this.sendOutlookMessage(accessToken, request);
        }
      }

      // Custom IMAP/SMTP account
      const customAccounts = JSON.parse(localStorage.getItem('customMailAccounts') || '[]');
      const customAccount = customAccounts.find((a: any) => a.id === accountId);

      if (!customAccount) {
        return { success: false, error: 'Account not found' };
      }

      return await this.sendViaSMTP(customAccount, request);
    } catch (error) {
      console.error('Send email error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  /**
   * Reply to email
   */
  async replyEmail(
    accountId: string,
    request: ReplyEmailRequest
  ): Promise<MailServiceResponse<{ messageId: string }>> {
    const { originalMessage, replyText, replyHtml, replyAll, attachments } = request;

    // Build recipient list
    const to = replyAll
      ? [originalMessage.from.address, ...originalMessage.to.map(t => t.address)]
      : [originalMessage.from.address];

    const cc = replyAll && originalMessage.cc
      ? originalMessage.cc.map(c => c.address)
      : undefined;

    const sendRequest: SendEmailRequest = {
      to,
      cc,
      subject: originalMessage.subject.startsWith('Re:')
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`,
      text: replyText,
      html: replyHtml,
      inReplyTo: originalMessage.messageId,
      references: originalMessage.messageId,
      attachments,
    };

    return await this.sendEmail(accountId, sendRequest);
  }

  /**
   * Send via Gmail API
   */
  private async sendGmailMessage(
    accessToken: string,
    request: SendEmailRequest
  ): Promise<MailServiceResponse<{ messageId: string }>> {
    try {
      const toAddresses = Array.isArray(request.to) ? request.to.join(', ') : request.to;
      const ccAddresses = request.cc ? (Array.isArray(request.cc) ? request.cc.join(', ') : request.cc) : '';

      let message: string;

      // If there are attachments, build a multipart message
      if (request.attachments && request.attachments.length > 0) {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const messageParts = [
          `To: ${toAddresses}`,
          ccAddresses ? `Cc: ${ccAddresses}` : '',
          `Subject: ${request.subject}`,
          request.inReplyTo ? `In-Reply-To: ${request.inReplyTo}` : '',
          request.references ? `References: ${request.references}` : '',
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=utf-8',
          '',
          request.html || request.text || '',
          ''
        ].filter(Boolean);

        // Add each attachment
        for (const att of request.attachments) {
          messageParts.push(`--${boundary}`);
          messageParts.push(`Content-Type: ${att.type || 'application/octet-stream'}; name="${att.name}"`);
          messageParts.push(`Content-Transfer-Encoding: base64`);
          messageParts.push(`Content-Disposition: attachment; filename="${att.name}"`);
          messageParts.push('');
          messageParts.push(att.data);
          messageParts.push('');
        }

        messageParts.push(`--${boundary}--`);
        message = messageParts.join('\r\n');
      } else {
        // Simple message without attachments
        const messageParts = [
          `To: ${toAddresses}`,
          ccAddresses ? `Cc: ${ccAddresses}` : '',
          `Subject: ${request.subject}`,
          request.inReplyTo ? `In-Reply-To: ${request.inReplyTo}` : '',
          request.references ? `References: ${request.references}` : '',
          'Content-Type: text/html; charset=utf-8',
          '',
          request.html || request.text || '',
        ].filter(Boolean);
        message = messageParts.join('\r\n');
      }

      const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send Gmail message');
      }

      const data = await response.json();
      return { success: true, data: { messageId: data.id } };
    } catch (error) {
      console.error('Send Gmail message error:', error);
      return { success: false, error: 'Failed to send Gmail message' };
    }
  }

  /**
   * Send via Outlook API
   */
  private async sendOutlookMessage(
    accessToken: string,
    request: SendEmailRequest
  ): Promise<MailServiceResponse<{ messageId: string }>> {
    try {
      const toRecipients = Array.isArray(request.to)
        ? request.to.map(email => ({ emailAddress: { address: email } }))
        : [{ emailAddress: { address: request.to } }];

      const ccRecipients = request.cc
        ? (Array.isArray(request.cc)
          ? request.cc.map(email => ({ emailAddress: { address: email } }))
          : [{ emailAddress: { address: request.cc } }])
        : [];

      const message: any = {
        subject: request.subject,
        body: {
          contentType: request.html ? 'HTML' : 'Text',
          content: request.html || request.text || '',
        },
        toRecipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
      };

      // Add attachments if provided
      if (request.attachments && request.attachments.length > 0) {
        message.attachments = request.attachments.map(att => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.name,
          contentType: att.type || 'application/octet-stream',
          contentBytes: att.data,
        }));
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send Outlook message');
      }

      // Outlook API doesn't return message ID on send
      return { success: true, data: { messageId: 'sent' } };
    } catch (error) {
      console.error('Send Outlook message error:', error);
      return { success: false, error: 'Failed to send Outlook message' };
    }
  }

  /**
   * Send via SMTP (for custom accounts)
   */
  private async sendViaSMTP(
    account: any,
    request: SendEmailRequest
  ): Promise<MailServiceResponse<{ messageId: string }>> {
    try {
      const smtpHost = account.smtpHost || account.host.replace('imap.', 'smtp.');
      const smtpPort = account.smtpPort || 587;
      // Auto-detect secure based on port if not explicitly set
      const smtpSecure = account.smtpSecure !== undefined 
        ? account.smtpSecure 
        : smtpPort === 465; // Port 465 = SSL, Port 587 = STARTTLS

      const bridgeUrl = this.getBridgeUrl();
      const endpoint = bridgeUrl.includes('/api/mail') ? `${bridgeUrl}/smtp-send` : `${bridgeUrl}/smtp/send`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          user: account.user,
          pass: account.pass,
          from: account.user,
          to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
          subject: request.subject,
          text: request.text,
          html: request.html,
          inReplyTo: request.inReplyTo,
          references: request.references,
          attachments: request.attachments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'SMTP send failed');
      }

      const data = await response.json();
      return { success: true, data: { messageId: data.data?.messageId || 'sent' } };
    } catch (error) {
      console.error('Send via SMTP error:', error);
      return { success: false, error: 'Failed to send via SMTP' };
    }
  }
}

export const mailService = new MailService();
