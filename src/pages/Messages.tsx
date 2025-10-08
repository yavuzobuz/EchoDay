import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ensureProfile, getOrCreateDirectConversationByEmail, listMessages, sendFileMessage, sendTextMessage, subscribeToMessages, downloadAttachment } from '../services/messagesService';
import { listFriends, addFriendByEmail, removeFriend } from '../services/friendsService';
import { NotificationService } from '../services/notificationService';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/ToastNotification';
import type { Conversation, Message, Profile, Friend } from '../types/chat';

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, removeToast, showMessage } = useToast();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  
  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newText, setNewText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const myId = user?.id || null;

  useEffect(() => {
    (async () => {
      try { 
        await ensureProfile();
        // Load friends list
        const friendsList = await listFriends();
        setFriends(friendsList);
        
        // Initialize notifications
        const notifEnabled = await NotificationService.initialize();
        setNotificationsEnabled(notifEnabled);
        
        // Setup custom toast callback
        NotificationService.setCustomToastCallback((title, message, avatar, duration) => {
          showMessage(title, message, avatar, duration);
        });
        
        if (!notifEnabled) {
          console.log('Bildirimleri etkinleştirmek için tarayıcı ayarlarından izin verin');
        }
      } catch (e) { 
        console.warn('Profile/Friends loading skipped:', e);
      }
    })();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime messages when conversation is set
  useEffect(() => {
    if (!conversation) return;
    
    // Try realtime first
    const unsub = subscribeToMessages(conversation.id, (msg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        
        // Show notification for new messages from others
        if (msg.sender_id !== myId && notificationsEnabled) {
          const senderName = other?.display_name || other?.email || 'Bilinmeyen';
          const messageText = msg.type === 'text' ? (msg.body || '') : 'Dosya gönderdi';
          NotificationService.notifyMessage(senderName, messageText, other?.email);
        }
        
        return [...prev, msg];
      });
    });
    
    // Fallback: Poll for new messages every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const allMessages = await listMessages(conversation.id);
        setMessages((prevMessages) => {
          // Check for new messages and show notifications
          const newMessages = allMessages.filter(msg => 
            !prevMessages.some(prev => prev.id === msg.id)
          );
          
          // Show notifications for new messages from others
          if (notificationsEnabled) {
            newMessages
              .filter(msg => msg.sender_id !== myId)
              .forEach(msg => {
                const senderName = other?.display_name || other?.email || 'Bilinmeyen';
                const messageText = msg.type === 'text' ? (msg.body || '') : 'Dosya gönderdi';
                NotificationService.notifyMessage(senderName, messageText, other?.email);
              });
          }
          
          return allMessages;
        });
      } catch (e) {
        console.error('Polling failed:', e);
      }
    }, 2000);
    
    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [conversation]);

  async function handleStartConversation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStarting(true);
    try {
      const { conversation, other } = await getOrCreateDirectConversationByEmail(recipientEmail.trim());
      setConversation(conversation);
      setOther(other);
      const initial = await listMessages(conversation.id);
      setMessages(initial);
    } catch (e: any) {
      setError(e.message || 'Sohbet başlatılamadı');
    } finally {
      setStarting(false);
    }
  }
  
  async function handleStartConversationWithFriend(friend: Friend) {
    if (!friend.friend_profile?.email) return;
    setRecipientEmail(friend.friend_profile.email);
    setError(null);
    setStarting(true);
    try {
      const { conversation, other } = await getOrCreateDirectConversationByEmail(friend.friend_profile.email);
      setConversation(conversation);
      setOther(other);
      const initial = await listMessages(conversation.id);
      setMessages(initial);
    } catch (e: any) {
      setError(e.message || 'Sohbet başlatılamadı');
    } finally {
      setStarting(false);
    }
  }
  
  async function handleAddFriend(e: React.FormEvent) {
    e.preventDefault();
    setFriendError(null);
    setAddingFriend(true);
    try {
      const newFriend = await addFriendByEmail(newFriendEmail.trim());
      setFriends(prev => [newFriend, ...prev]);
      setNewFriendEmail('');
      setShowAddFriend(false);
    } catch (e: any) {
      setFriendError(e.message || 'Arkadaş eklenemedi');
    } finally {
      setAddingFriend(false);
    }
  }
  
  async function handleRemoveFriend(friendshipId: string) {
    if (!confirm('Bu arkadaşı silmek istediğinize emin misiniz?')) return;
    try {
      await removeFriend(friendshipId);
      setFriends(prev => prev.filter(f => f.id !== friendshipId));
    } catch (e: any) {
      alert('Arkadaş silinemedi: ' + (e.message || 'Bilinmeyen hata'));
    }
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!conversation || !newText.trim()) return;
    const text = newText.trim();
    setNewText('');
    try {
      await sendTextMessage(conversation.id, text);
    } catch (e) {
      console.error('Send text failed:', e);
      setNewText(text); // revert
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    try {
      await sendFileMessage(conversation.id, file);
    } catch (e) {
      console.error('Send file failed:', e);
      alert('Dosya gönderilemedi. Yetki veya boyut limiti olabilir.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(path?: string | null) {
    if (!path) return;
    try {
      const blob = await downloadAttachment(path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'dosya';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
      alert('Dosya indirilemedi');
    }
  }

  // Close current conversation
  function handleCloseConversation() {
    setConversation(null);
    setOther(null);
    setMessages([]);
  }
  
  // Test notification function
  function testNotification() {
    if (notificationsEnabled) {
      NotificationService.notifyMessage('Test Kullanıcısı', 'Bu bir test bildirimidir!');
    } else {
      alert('Lütfen önce bildirimleri etkinleştirin');
    }
  }

  const title = useMemo(() => {
    if (other?.display_name) return other.display_name;
    if (other?.email) return other.email;
    return 'Mesajlar';
  }, [other]);

  // Pretty date label for separators
  const formatDateLabel = (d: Date) => {
    const today = new Date();
    const yday = new Date();
    yday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Bugün';
    if (sameDay(d, yday)) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Render messages with date separators and improved bubbles
  const renderedMessages = useMemo(() => {
    const nodes: JSX.Element[] = [];
    let lastKey: string | null = null;
    messages.forEach((m) => {
      const dt = new Date(m.created_at);
      const dayKey = dt.toDateString();
      if (dayKey !== lastKey) {
        nodes.push(
          <div key={`sep-${dayKey}-${m.id}`} className="flex items-center justify-center my-2">
            <span className="px-3 py-1 text-xs rounded-full bg-gray-200/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200">
              {formatDateLabel(dt)}
            </span>
          </div>
        );
        lastKey = dayKey;
      }

      const mine = m.sender_id === myId;
      nodes.push(
        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2`}>
          <div className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${mine ? 'bg-[var(--accent-color-600)] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}`}>
            {m.type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
            ) : (
              <div className="text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 4a3 3 0 00-3 3v6a3 3 0 103 3h4a3 3 0 000-6H8a1 1 0 010-2h4a3 3 0 100-6H8z" /></svg>
                <span>{m.body || 'Dosya'}</span>
                <button onClick={() => handleDownload(m.attachment_path)} className="underline text-xs">indir</button>
              </div>
            )}
            <div className={`text-[10px] opacity-70 mt-1 ${mine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      );
    });
    nodes.push(<div key="end" ref={endRef} />);
    return nodes;
  }, [messages, myId]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="flex gap-2 items-center">
            {!notificationsEnabled && (
              <button 
                onClick={async () => {
                  const enabled = await NotificationService.requestPermission();
                  setNotificationsEnabled(enabled);
                }}
                className="px-3 py-1 text-xs rounded-md bg-yellow-500 text-white hover:bg-yellow-600"
                title="Mesaj bildirimlerini etkinleştir"
              >
                🔔 Bildirim
              </button>
            )}
            {notificationsEnabled && (
              <div className="flex gap-1 items-center">
                <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" title="Bildirimler etkin">
                  🔔
                </span>
                <button
                  onClick={testNotification}
                  className="px-2 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600"
                  title="Test bildirim gönder"
                >
                  Test
                </button>
              </div>
            )}
            {conversation && (
              <button onClick={handleCloseConversation} className="px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-sm">Kapat</button>
            )}
            <button onClick={() => navigate('/app')} className="px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-sm">Geri</button>
          </div>
        </div>

        {!conversation && (
          <>
            {/* Friends List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Arkadaşlarım</h2>
                <button 
                  onClick={() => setShowAddFriend(!showAddFriend)}
                  className="px-3 py-1 text-sm rounded-md bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)]"
                >
                  + Arkadaş Ekle
                </button>
              </div>

              {/* Add Friend Form */}
              {showAddFriend && (
                <form onSubmit={handleAddFriend} className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <label className="block text-sm font-medium mb-2">Arkadaş E-postası</label>
                  <input
                    type="email"
                    value={newFriendEmail}
                    onChange={(e) => setNewFriendEmail(e.target.value)}
                    placeholder="arkadas@ornek.com"
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                  />
                  {friendError && <p className="text-red-600 text-xs mt-1">{friendError}</p>}
                  <div className="flex gap-2 mt-2">
                    <button 
                      disabled={addingFriend} 
                      type="submit" 
                      className="px-3 py-1 text-sm rounded-md bg-green-600 text-white disabled:opacity-50"
                    >
                      {addingFriend ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setShowAddFriend(false); setFriendError(null); }}
                      className="px-3 py-1 text-sm rounded-md bg-gray-500 text-white"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}

              {/* Friends List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Henüz arkadaş eklemediniz</p>
                ) : (
                  friends.map((friend) => (
                    <div 
                      key={friend.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleStartConversationWithFriend(friend)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent-color-600)] text-white flex items-center justify-center font-semibold">
                          {friend.friend_profile?.display_name?.[0]?.toUpperCase() || friend.friend_profile?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{friend.friend_profile?.display_name || friend.friend_profile?.email}</p>
                          <p className="text-xs text-gray-500">{friend.friend_profile?.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.id);
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Sil
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Manual Email Entry */}
            <form onSubmit={handleStartConversation} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">Veya E-posta ile Sohbet Başlat</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="kisi@ornek.com"
                required
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              <button disabled={starting} type="submit" className="mt-3 px-4 py-2 rounded-md bg-[var(--accent-color-600)] text-white disabled:opacity-50">
                {starting ? 'Başlatılıyor...' : 'Sohbet Başlat / Aç'}
              </button>
            </form>
          </>
        )}

        {conversation && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex flex-col h-[75vh]">
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-color-600)] text-white flex items-center justify-center font-semibold">
                    {other?.display_name?.[0]?.toUpperCase() || other?.email?.[0]?.toUpperCase() || '📨'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Doğrudan mesaj</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCloseConversation} className="px-3 py-1.5 text-xs rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                    Kapat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderedMessages}
              </div>

              {/* Composer */}
              <form onSubmit={handleSendText} className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" title="Dosya ekle">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 5a3 3 0 00-3 3v4a2 2 0 104 0V9a1 1 0 00-2 0v3a1 1 0 11-2 0V8a5 5 0 1110 0v4a4 4 0 11-8 0V9a3 3 0 016 0v3a2 2 0 11-4 0V9a1 1 0 112 0v3a4 4 0 108 0V8a6 6 0 10-12 0v4a5 5 0 1010 0V9a7 7 0 10-14 0v3a6 6 0 1012 0V9a8 8 0 10-16 0v3a7 7 0 1014 0V9a9 9 0 10-18 0v3a8 8 0 1016 0V9"/></svg>
                </button>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-600)]/50"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--accent-color-600)] text-white font-medium hover:opacity-90">
                  Gönder
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Notifications */}
      <ToastNotification messages={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MessagesPage;
