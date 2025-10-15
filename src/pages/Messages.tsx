import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { ensureProfile, getOrCreateDirectConversationByEmail, listMessages, sendFileMessage, sendTextMessage, subscribeToMessages, downloadAttachment } from '../services/messagesService';
import { listFriends, addFriendByEmail, removeFriend } from '../services/friendsService';
import { NotificationService } from '../services/notificationService';
import { presenceService } from '../services/presenceService';
import { useToast } from '../hooks/useToast';
import ToastNotification from '../components/ToastNotification';
import type { Conversation, Message, Profile, Friend } from '../types/chat';

// Voice Message Player Component
interface VoiceMessagePlayerProps {
  attachmentPath?: string | null;
  mine: boolean;
  onDownload: () => void;
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ attachmentPath, mine, onDownload }) => {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Fetch audio as blob and create blob URL (bypasses CSP)
  useEffect(() => {
    if (!attachmentPath) return;
    
    let blobUrl: string | null = null;
    
    const fetchAudioBlob = async () => {
      try {
        // Download the attachment as blob
        const blob = await downloadAttachment(attachmentPath);
        
        // Create a blob URL
        blobUrl = URL.createObjectURL(blob);
        setAudioUrl(blobUrl);
        console.log('Voice message blob URL created:', blobUrl);
      } catch (err) {
        console.error('Error fetching audio:', err);
        setError(true);
      }
    };
    
    fetchAudioBlob();
    
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [attachmentPath]);

  // Update audio src when URL is ready
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    
    audio.src = audioUrl;
    audio.load();
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      console.error('Audio playback error:', audio.error);
      setError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(true);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;


  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t('messages.audio.failed','Ses yüklenemedi')}</span>
        <button onClick={onDownload} className="underline">{t('messages.download','İndir')}</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <audio ref={audioRef} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className={`flex-shrink-0 p-2 rounded-full transition-colors ${
          mine 
            ? 'hover:bg-white/20' 
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title={isPlaying ? t('messages.pause','Duraklat') : t('messages.play','Oynat')}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${
          mine 
            ? 'bg-white/30' 
            : 'bg-gray-300 dark:bg-gray-600'
        }`}>
          <div 
            className={`h-full transition-all ${
              mine 
                ? 'bg-white/90' 
                : 'bg-[var(--accent-color-600)]'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={`text-[10px] mt-1 ${
          mine 
            ? 'text-white/70' 
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <button
        onClick={onDownload}
        className={`flex-shrink-0 p-1.5 rounded transition-colors ${
          mine 
            ? 'hover:bg-white/20' 
            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title={t('messages.download','İndir')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </div>
  );
};

const MessagesPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, removeToast, showMessage } = useToast();

  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  
  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Presence state
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newText, setNewText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

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
        
        // Start tracking user presence
        if (user?.id) {
          await presenceService.trackPresence(
            user.id,
            user.email,
            user.user_metadata?.display_name
          );
          console.log('Presence tracking initialized');
        }
      } catch (e) { 
        console.warn('Profile/Friends loading skipped:', e);
      }
    })();
    
    // Cleanup presence on unmount
    return () => {
      presenceService.untrackPresence();
    };
  }, [user]);

  // Smart auto scroll - only scroll if user is at bottom or after sending message
  useEffect(() => {
    if (shouldAutoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);
  
  // Check if user scrolled up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
  };

  // Subscribe to presence changes for friends
  useEffect(() => {
    if (friends.length === 0) return;
    
    const friendIds = friends
      .map(f => f.friend_profile?.id)
      .filter((id): id is string => !!id);
    
    if (friendIds.length === 0) return;
    
    const unsubscribe = presenceService.subscribeToUserPresence(
      friendIds,
      (presenceStates) => {
        const online = new Set<string>();
        presenceStates.forEach((_, userId) => {
          online.add(userId);
        });
        setOnlineUsers(online);
      }
    );
    
    return unsubscribe;
  }, [friends]);
  
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
    
    // Fallback: Poll for new messages every 5 seconds (reduced from 2 seconds)
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
    }, 5000); // Changed from 2000 to 5000ms
    
    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [conversation, myId, notificationsEnabled, other]);

  
  const handleStartConversationWithFriend = useCallback(async (friend: Friend) => {
    if (!friend.friend_profile?.email) return;
    try {
      const { conversation, other } = await getOrCreateDirectConversationByEmail(friend.friend_profile.email);
      setConversation(conversation);
      setOther(other);
      const initial = await listMessages(conversation.id);
      setMessages(initial);
      setShouldAutoScroll(true); // Scroll to bottom when opening conversation
    } catch (e: any) {
      alert(e.message || 'Sohbet başlatılamadı');
    }
  }, []);
  
  const handleAddFriend = useCallback(async (e: React.FormEvent) => {
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
  }, [newFriendEmail]);
  
  const handleRemoveFriend = useCallback(async (friendId: string) => {
    if (!confirm(t('messages.confirmRemoveFriend','Bu arkadaşı silmek istediğinizden emin misiniz?'))) return;
    try {
      await removeFriend(friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (e: any) {
      alert(e.message || 'Arkadaş silinemedi');
    }
  }, [t]);

  const handleSendText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !newText.trim()) return;
    const text = newText.trim();
    setNewText('');
    setShouldAutoScroll(true);
    try {
      await sendTextMessage(conversation.id, text);
    } catch (error) {
      console.error('Mesaj gönderilemedi:', error);
      alert('Mesaj gönderilemedi.');
    }
  }, [conversation, newText]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    setShouldAutoScroll(true);
    try {
      await sendFileMessage(conversation.id, file);
    } catch (error) {
      console.error('Dosya gönderilemedi:', error);
      alert('Dosya gönderilemedi.');
    }
    e.target.value = '';
  }, [conversation]);

  const handleDownload = useCallback(async (attachmentPath: string | null | undefined) => {
    if (!attachmentPath) return;
    try {
      const blob = await downloadAttachment(attachmentPath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachmentPath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Dosya indirilemedi:', error);
      alert('Dosya indirilemedi.');
    }
  }, []);

  // Close current conversation
  function handleCloseConversation() {
    setConversation(null);
    setOther(null);
    setMessages([]);
  }
  
  // Voice recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            // Auto stop at 30 seconds
            stopVoiceRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Mikrofon erişimi reddedildi:', error);
      alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon iznini kontrol edin.');
    }
  };
  
  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);
  
  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Just stop without sending
      const recorder = mediaRecorderRef.current;
      recorder.ondataavailable = null; // Prevent sending
      recorder.onstop = () => {
        // Stop all tracks
        recorder.stream.getTracks().forEach(track => track.stop());
      };
      recorder.stop();
      
      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);
  
  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    if (!conversation) return;
    
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      setShouldAutoScroll(true);
      await sendFileMessage(conversation.id, audioFile);
    } catch (error) {
      console.error('Sesli mesaj gönderilemedi:', error);
      alert('Sesli mesaj gönderilemedi.');
    }
  }, [conversation]);
  
  // Format recording time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);
  

  const title = useMemo(() => {
    if (other?.display_name) return other.display_name;
    if (other?.email) return other.email;
    return 'Mesajlar';
  }, [other]);

  // Pretty date label for separators
  const formatDateLabel = useCallback((d: Date) => {
    const today = new Date();
    const yday = new Date();
    yday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Bugün';
    if (sameDay(d, yday)) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  // Check if file is audio (voice message)
  const isAudioFile = useCallback((fileName: string | null | undefined) => {
    if (!fileName) return false;
    const audioExtensions = ['.webm', '.mp3', '.ogg', '.wav', '.m4a'];
    return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }, []);
  
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
      const isVoiceMessage = m.type === 'file' && isAudioFile(m.attachment_path);
      
      nodes.push(
        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-2 px-1`}>
          <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3 sm:px-4 py-2 shadow-sm break-words overflow-hidden ${mine ? 'bg-[var(--accent-color-600)] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}`}>
            {m.type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
            ) : isVoiceMessage ? (
              <VoiceMessagePlayer 
                attachmentPath={m.attachment_path} 
                mine={mine}
                onDownload={() => handleDownload(m.attachment_path)}
              />
            ) : (
              <div className="text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 4a3 3 0 00-3 3v6a3 3 0 103 3h4a3 3 0 000-6H8a1 1 0 010-2h4a3 3 0 100-6H8z" /></svg>
                <span>{m.body || t('messages.file','Dosya')}</span>
                <button onClick={() => handleDownload(m.attachment_path)} className="underline text-xs">{t('messages.downloadFile','indir')}</button>
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
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/app')} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('messages.backHome','Ana sayfaya dön')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('messages.title','Mesajlar')}</h1>
        </div>
        <div className="flex gap-2 items-center">
          {!notificationsEnabled ? (
            <button 
              onClick={async () => {
                const enabled = await NotificationService.requestPermission();
                setNotificationsEnabled(enabled);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('messages.enableNotifications','Mesaj bildirimlerini etkinleştir')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          ) : (
            <div className="flex gap-1 items-center">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20" title={t('messages.notificationsEnabled','Bildirimler etkin')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Friends/Contacts List */}
        <div className={`w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${conversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & Add Friend Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('messages.chats','Sohbetler')}</h2>
              <button 
                onClick={() => setShowAddFriend(!showAddFriend)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('messages.addFriend','Arkadaş ekle')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--accent-color-600)] dark:text-[var(--accent-color-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Add Friend Form */}
            {showAddFriend && (
              <form onSubmit={handleAddFriend} className="space-y-2">
                <input
                  type="email"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  placeholder={t('messages.emailPlaceholder','E-posta adresi giriniz')}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-600)]/50"
                />
                {friendError && <p className="text-red-600 text-xs">{friendError}</p>}
                <div className="flex gap-2">
                  <button 
                    disabled={addingFriend} 
                    type="submit" 
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--accent-color-600)] text-white hover:bg-[var(--accent-color-700)] disabled:opacity-50"
                  >
                    {addingFriend ? t('messages.adding','Ekleniyor...') : t('messages.add','Ekle')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowAddFriend(false); setFriendError(null); setNewFriendEmail(''); }}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {t('messages.cancel','İptal')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Friends/Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('messages.noFriends','Henüz arkadaş eklemediniz')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('messages.noFriendsDesc','Sohbet başlatmak için yukarıdan arkadaş ekleyin')}</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700/50 group"
                  onClick={() => handleStartConversationWithFriend(friend)}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-color-500)] to-[var(--accent-color-700)] text-white flex items-center justify-center font-semibold text-lg shadow-sm">
                      {friend.friend_profile?.display_name?.[0]?.toUpperCase() || friend.friend_profile?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    {/* Online indicator */}
                    {friend.friend_profile?.id && onlineUsers.has(friend.friend_profile.id) && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {friend.friend_profile?.display_name || friend.friend_profile?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.friend_profile?.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFriend(friend.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title={t('messages.removeFriend','Arkadaşı sil')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat Area */}
        {!conversation && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mx-auto text-gray-300 dark:text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('messages.yourMessages','Mesajlarınız')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {t('messages.selectFriend','Arkadaşlarınızla sohbet etmek için soldan bir kişi seçin veya yeni arkadaş ekleyin')}
              </p>
            </div>
          </div>
        )}
        
        {conversation && (
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleCloseConversation} 
                  className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-color-500)] to-[var(--accent-color-700)] text-white flex items-center justify-center font-semibold text-lg shadow-sm">
                  {other?.display_name?.[0]?.toUpperCase() || other?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {other?.id && onlineUsers.has(other.id) ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{t('messages.online','Çevrimiçi')}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>
                          {other?.last_seen 
                            ? `${t('messages.lastSeen','Son görülme:')} ${new Date(other.last_seen).toLocaleString('tr-TR', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                day: '2-digit',
                                month: 'short'
                              })}`
                            : t('messages.offline','Çevrimdışı')
                          }
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={t('messages.search','Arama')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={t('messages.more','Daha fazla')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgb3BhY2l0eT0iMC4wMiIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgb3BhY2l0eT0iMC4wMiIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi/+PC9zdmc+')]" 
              style={{ scrollBehavior: 'smooth', overflowAnchor: 'none' }}
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('messages.noMessages','Henüz mesaj yok')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('messages.firstMessage','İlk mesajı gönderin')}</p>
                  </div>
                </div>
              ) : (
                renderedMessages
              )}
            </div>

            {/* Message Input */}
            {!isRecording ? (
              <form onSubmit={handleSendText} className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                  title={t('messages.attachFile','Dosya ekle')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder={t('messages.typeMessage','Bir mesaj yazın')}
                    className="w-full px-4 py-3 pr-12 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color-600)]/50 text-sm"
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                
                {newText.trim() ? (
                  <button 
                    type="submit" 
                    className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] transition-all shadow-lg hover:shadow-xl"
                    title={t('messages.sendMessage','Gönder')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onMouseDown={startVoiceRecording}
                    onMouseUp={stopVoiceRecording}
                    onMouseLeave={stopVoiceRecording}
                    onTouchStart={startVoiceRecording}
                    onTouchEnd={stopVoiceRecording}
                    className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] active:scale-95 transition-all shadow-lg hover:shadow-xl"
                    title={t('messages.holdToRecord','Basılı tutarak sesli mesaj kaydet')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </form>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={cancelVoiceRecording}
                  className="p-2.5 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors" 
                  title={t('messages.cancelRecording','İptal')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {formatTime(recordingTime)} / 0:30
                    </span>
                  </div>
                  <div className="flex-1 h-8 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 dark:bg-red-600 transition-all duration-300"
                      style={{ width: `${(recordingTime / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={stopVoiceRecording}
                  className="p-3 rounded-full bg-[var(--accent-color-600)] hover:bg-[var(--accent-color-700)] transition-all shadow-lg hover:shadow-xl"
                  title={t('messages.sendMessage','Gönder')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Toast Notifications */}
      <ToastNotification messages={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MessagesPage;
