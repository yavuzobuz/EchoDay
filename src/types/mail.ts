// Mail Providers
export type EmailProvider = 'gmail' | 'outlook' | 'custom';

// Custom account config (stored locally for IMAP/POP3 bridge)
export interface CustomAccountConfig {
  protocol: 'imap' | 'pop3';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string; // Stored locally only
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

// Email Account Interface
export interface EmailAccount {
  id: string;
  userId?: string;
  provider: EmailProvider;
  emailAddress: string;
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string; // ISO timestamp
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  customConfig?: CustomAccountConfig; // for provider=custom
}

// Email Message Interface
export interface EmailAttachment {
  id?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  contentId?: string; // For inline (cid:...)
  inline?: boolean;
  dataUrl?: string; // Base64 data URL for inline rendering
}

export interface EmailMessage {
  id: string;
  accountId: string;
  messageId: string; // Provider's message ID
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: string; // ISO timestamp
  snippet: string; // Preview text
  bodyPreview?: string;
  body?: string; // Full body (HTML or plain text)
  bodyHtml?: string; // Sanitized HTML when available
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  labels?: string[]; // Gmail labels or Outlook categories
  importance?: 'low' | 'normal' | 'high';
}

// Email Address Interface
export interface EmailAddress {
  address: string;
  name?: string;
}

// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

// Gmail OAuth Config
export const GMAIL_OAUTH_CONFIG: OAuthConfig = {
  clientId: '', // Will be set from environment
  redirectUri: window.location.origin + '/auth/gmail/callback',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ],
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
};

// Outlook OAuth Config
export const OUTLOOK_OAUTH_CONFIG: OAuthConfig = {
  clientId: '', // Will be set from environment
  redirectUri: window.location.origin + '/auth/outlook/callback',
  scopes: [
    'https://graph.microsoft.com/Mail.Read',
    'https://graph.microsoft.com/Mail.Send',
    'https://graph.microsoft.com/User.Read',
  ],
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

// API Response Types
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data: string };
  };
  internalDate: string;
}

export interface OutlookMessage {
  id: string;
  subject: string;
  from: { emailAddress: EmailAddress };
  toRecipients: Array<{ emailAddress: EmailAddress }>;
  ccRecipients?: Array<{ emailAddress: EmailAddress }>;
  receivedDateTime: string;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  isRead: boolean;
  hasAttachments: boolean;
  importance: 'low' | 'normal' | 'high';
}

// Token Response
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Mail Service Response
export interface MailServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Send Email Request
export interface SendEmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachmentFile[];
}

// Reply Email Request
export interface ReplyEmailRequest {
  originalMessage: EmailMessage;
  replyText: string;
  replyHtml?: string;
  replyAll?: boolean;
  attachments?: EmailAttachmentFile[];
}

// Email Template
export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string; // HTML content
  createdAt: string;
  updatedAt: string;
}

// Email Attachment
export interface EmailAttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded
}
