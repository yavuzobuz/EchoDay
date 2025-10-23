import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  ConnectionMode,
  Panel,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { workflowEngine, WorkflowExecution } from '../../utils/workflowEngine';

// 🗓️ Google Calendar webhook veri yapısı
interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  recurrence?: string[];
  recurringEventId?: string;
  hangoutLink?: string;
  reminders: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  created: string;
  updated: string;
  htmlLink: string;
}

// 🎯 Akıllı Google Calendar webhook işleme fonksiyonu
const sendCalendarToTaskPage = async (calendarData: GoogleCalendarEvent, autoMode: boolean = false) => {
  try {
    // Calendar verisini EchoDay formatına çevir
    const echoDayData = {
      type: 'calendar_event',
      id: calendarData.id,
      title: calendarData.summary,
      description: calendarData.description || '',
      startTime: calendarData.start?.dateTime || calendarData.start?.date,
      endTime: calendarData.end?.dateTime || calendarData.end?.date,
      location: calendarData.location || '',
      attendees: calendarData.attendees?.map(a => a.email) || [],
      creator: calendarData.creator?.email,
      organizer: calendarData.organizer?.email,
      status: calendarData.status,
      visibility: calendarData.visibility || 'default',
      isRecurring: !!calendarData.recurrence,
      hangoutLink: calendarData.hangoutLink,
      source: 'google-calendar-webhook',
      createdAt: calendarData.created,
      updatedAt: calendarData.updated,
      calendarLink: calendarData.htmlLink
    };

    // 🧠 Akıllı filtreleme (sadece otomatik modda)
    if (autoMode) {
      // Önem kontrolü - calendar verisine göre
      const importanceScore = calculateCalendarImportance(calendarData);
      
      if (importanceScore < 30) {
        console.log('📉 Calendar etkinliği önemli değil (Skor: ' + importanceScore + ')');
        return { success: false, reason: 'not_important', score: importanceScore };
      }

      console.log('✅ Calendar etkinliği önemli bulundu (Skor: ' + importanceScore + ')');
    }

    // Calendar webhook endpoint'ine gönder
    const response = await fetch('/api/calendar/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(echoDayData)
    });

    if (response.ok) {
      // Başarılı mesajı göster
      const message = autoMode 
        ? '🎯 Önemli takvim etkinliği otomatik olarak işlendi!'
        : '✅ Google Calendar etkinliği başarıyla işlendi!';
      alert(message);
      
      return { success: true };
      
    } else {
      throw new Error('Calendar etkinliği işlenemedi');
    }
  } catch (error) {
    console.error('Google Calendar işleme hatası:', error);
    alert('❌ Calendar etkinliği işlenirken hata oluştu');
  }
};

// Calendar etkinliği önem skorunu hesapla
function calculateCalendarImportance(event: GoogleCalendarEvent): number {
  let score = 0;
  
  // Başlık bazlı önem
  const summary = (event.summary || '').toLowerCase();
  if (summary.includes('acil') || summary.includes('urgent')) score += 40;
  if (summary.includes('önemli') || summary.includes('important')) score += 30;
  if (summary.includes('toplantı') || summary.includes('meeting')) score += 25;
  if (summary.includes('deadline') || summary.includes('son tarih')) score += 35;
  
  // Katılımcı sayısı
  const attendeeCount = event.attendees?.length || 0;
  if (attendeeCount > 5) score += 20;
  if (attendeeCount > 2) score += 10;
  
  // Organizatör önem seviyesi
  const organizerEmail = (event.organizer?.email || '').toLowerCase();
  if (organizerEmail.includes('boss') || organizerEmail.includes('manager') || organizerEmail.includes('ceo')) score += 25;
  
  // Konum varsa (fiziksel toplantı)
  if (event.location) score += 15;
  
  // Google Meet linki varsa
  if (event.hangoutLink) score += 10;
  
  // Durum kontrolü
  if (event.status === 'confirmed') score += 10;
  if (event.status === 'cancelled') score -= 50;
  
  // Tekrarlayan etkinlikler daha önemli olabilir
  if (event.recurrence) score += 15;
  
  return Math.max(0, Math.min(score, 100));
}

// Calendar Trigger Node Bileşeni - Çift Yönlü Senkronizasyon ile
function CalendarTriggerNode({ data }: { data: any }) {
  const isConfigured = data.configured;
  const executionStatus = data.executionStatus;
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const getExecutionStyle = () => {
    if (executionStatus === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (executionStatus === 'success') return 'ring-2 ring-green-400';
    if (executionStatus === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = () => {
    if (executionStatus === 'running') return '⏳';
    if (executionStatus === 'success') return '✅';
    if (executionStatus === 'error') return '❌';
    return '';
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const handleBidirectionalSync = async () => {
    setSyncStatus('syncing');
    try {
      // EchoDay görevlerini Google Calendar'a senkronize et
      const response = await fetch('/api/calendar/sync-tasks-to-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          syncDirection: 'both',
          syncMode: 'auto'
        })
      });
      
      if (response.ok) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle()} ${
      isConfigured
        ? 'bg-indigo-200 border-indigo-400 dark:bg-indigo-800 dark:border-indigo-500'
        : 'bg-yellow-100 border-yellow-400 border-dashed dark:bg-yellow-900 dark:border-yellow-500'
    }`}>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-500"
      />
      <div className="flex items-center justify-between">
        <div className="ml-2">
          <div className="text-lg font-bold text-indigo-800 dark:text-indigo-200">
            🗓️ {data.label} {isConfigured ? '✅' : '⚠️'} {getExecutionIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {!isConfigured && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
              ⚙️ Yapılandırma gerekli - Çift tıklayın
            </div>
          )}
          {isConfigured && data.config && (
            <div className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">
              🔗 Calendar webhook yapılandırıldı
            </div>
          )}
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.duration}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
        {/* Çift Yönlü Senkronizasyon Butonu */}
        {isConfigured && (
          <button
            onClick={handleBidirectionalSync}
            className={`ml-2 px-2 py-1 text-xs rounded transition-all ${
              syncStatus === 'syncing' 
                ? 'bg-blue-500 text-white animate-pulse' 
                : syncStatus === 'success' 
                ? 'bg-green-500 text-white' 
                : syncStatus === 'error' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            title="EchoDay ↔ Google Calendar çift yönlü senkronizasyonu"
          >
            {getSyncIcon()} Çift Yönlü
          </button>
        )}
      </div>
    </div>
  );
}

// Task Creator Node Bileşeni
function TaskCreatorNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };
  
  return (
     <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-600`}>
       <Handle
         type="target"
         position={Position.Left}
         className="w-3 h-3 bg-green-500"
       />
       <div className="flex items-center">
         <div className="ml-2">
           <div className="text-lg font-bold text-green-800 dark:text-green-200">📋 {data.label} {getExecutionIcon(executionStatus)}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.duration}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reminder Node Bileşeni
function ReminderNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-yellow-100 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-600`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-yellow-500"
      />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">⏰ {data.label} {getExecutionIcon(executionStatus)}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.executionTime}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Notification Node Bileşeni
function NotificationNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-purple-100 border-purple-300 dark:bg-purple-900 dark:border-purple-600`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-purple-800 dark:text-purple-200">🔔 {data.label} {getExecutionIcon(executionStatus)}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.executionTime}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Task Sync Node Bileşeni - EchoDay görevlerini Calendar'a senkronize eder
function TaskSyncNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const handleTaskSync = async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch('/api/calendar/sync-tasks-to-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          syncDirection: 'echoday-to-calendar',
          syncMode: 'auto'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
        console.log('✅ Task sync başarılı:', result);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-600`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
      <div className="flex items-center justify-between">
        <div className="ml-2">
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
            🔄 {data.label} {getExecutionIcon(executionStatus)} {getSyncIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.duration}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
        {/* Sync Butonu */}
        <button
          onClick={handleTaskSync}
          className={`ml-2 px-2 py-1 text-xs rounded transition-all ${
            syncStatus === 'syncing' 
              ? 'bg-blue-500 text-white animate-pulse' 
              : syncStatus === 'success' 
              ? 'bg-green-500 text-white' 
              : syncStatus === 'error' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title="EchoDay görevlerini Google Calendar'a senkronize et"
        >
          {getSyncIcon()} Sync
        </button>
      </div>
    </div>
  );
}

// Calendar Event Sync Node Bileşeni - Google Calendar etkinliklerini EchoDay'a senkronize eder
function CalendarEventSyncNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const handleEventSync = async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch('/api/calendar/sync-calendar-to-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          syncDirection: 'calendar-to-echoday',
          syncMode: 'auto'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
        console.log('✅ Event sync başarılı:', result);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-orange-100 border-orange-300 dark:bg-orange-900 dark:border-orange-600`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500"
      />
      <div className="flex items-center justify-between">
        <div className="ml-2">
          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
            📅 {data.label} {getExecutionIcon(executionStatus)} {getSyncIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.executionTime}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
        {/* Sync Butonu */}
        <button
          onClick={handleEventSync}
          className={`ml-2 px-2 py-1 text-xs rounded transition-all ${
            syncStatus === 'syncing' 
              ? 'bg-orange-500 text-white animate-pulse' 
              : syncStatus === 'success' 
              ? 'bg-green-500 text-white' 
              : syncStatus === 'error' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title="Google Calendar etkinliklerini EchoDay'a senkronize et"
        >
          {getSyncIcon()} Sync
        </button>
      </div>
    </div>
  );
}

// Real-time Update Node Bileşeni - Görev değişikliklerini gerçek zamanlı senkronize eder
function RealtimeUpdateNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  
  const getExecutionStyle = (status: string) => {
    if (status === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (status === 'success') return 'ring-2 ring-green-400';
    if (status === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (status: string) => {
    if (status === 'running') return '⏳';
    if (status === 'success') return '✅';
    if (status === 'error') return '❌';
    return '';
  };

  const getUpdateIcon = () => {
    switch (updateStatus) {
      case 'updating': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  const handleRealtimeUpdate = async () => {
    setUpdateStatus('updating');
    try {
      // EchoDay'daki görev değişikliklerini dinle
      const response = await fetch('/api/calendar/task-update-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskUpdate: { id: 'task_001', title: 'Test Görevü' },
          action: 'update'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setUpdateStatus('success');
        setTimeout(() => setUpdateStatus('idle'), 2000);
        console.log('✅ Realtime update başarılı:', result);
      } else {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus('idle'), 2000);
      }
    } catch (error) {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 2000);
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-teal-100 border-teal-300 dark:bg-teal-900 dark:border-teal-600`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-teal-500"
      />
      <div className="flex items-center justify-between">
        <div className="ml-2">
          <div className="text-lg font-bold text-teal-800 dark:text-teal-200">
            ⚡ {data.label} {getExecutionIcon(executionStatus)} {getUpdateIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.executionTime}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
            </div>
          )}
        </div>
        {/* Update Butonu */}
        <button
          onClick={handleRealtimeUpdate}
          className={`ml-2 px-2 py-1 text-xs rounded transition-all ${
            updateStatus === 'updating' 
              ? 'bg-teal-500 text-white animate-pulse' 
              : updateStatus === 'success' 
              ? 'bg-green-500 text-white' 
              : updateStatus === 'error' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
          title="Görev değişikliklerini gerçek zamanlı senkronize et"
        >
          {getUpdateIcon()} Real-time
        </button>
      </div>
    </div>
  );
}

// Node türleri
const nodeTypes = {
  calendarTrigger: CalendarTriggerNode,
  taskCreator: TaskCreatorNode,
  reminder: ReminderNode,
  notification: NotificationNode,
  taskSync: TaskSyncNode,
  calendarEventSync: CalendarEventSyncNode,
  realtimeUpdate: RealtimeUpdateNode,
};

// Başlangıç node'ları - Google Calendar webhook için hazır workflow
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'calendarTrigger',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Google Calendar',
      description: 'Google Calendar\'dan gelen etkinlikleri yakalar',
      configured: true,
      config: {
        mode: 'zapier',
        zapierWebhookUrl: 'https://hooks.zapier.com/hooks/catch/123456/calendar/'
      }
    },
  },
  {
    id: '2',
    type: 'taskCreator',
    position: { x: 400, y: 100 },
    data: { 
      label: 'Görev Oluştur',
      description: 'Calendar etkinliğinden görev oluşturur'
    },
  },
  {
    id: '3',
    type: 'reminder',
    position: { x: 700, y: 100 },
    data: { 
      label: 'Hatırlatıcı Ayarla',
      description: 'Etkinlik için hatırlatıcı oluşturur'
    },
  },
  {
    id: '4',
    type: 'notification',
    position: { x: 1000, y: 100 },
    data: { 
      label: 'Bildirim Gönder',
      description: 'Kullanıcıya bildirim gönderir'
    },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true }
];

interface CalendarCanvasProps {
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void;
}

export default function CalendarCanvas({ onWorkflowChange }: CalendarCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeId, setNodeId] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  }>({ show: false, x: 0, y: 0, nodeId: null });
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [isAddWebhookModalOpen, setIsAddWebhookModalOpen] = useState(false);

  // Workflow'u localStorage'a kaydet
  const saveWorkflowToStorage = useCallback((workflowNodes: Node[], workflowEdges: Edge[], configs: Record<string, any>) => {
    try {
      const workflowData = {
        nodes: workflowNodes,
        edges: workflowEdges,
        nodeConfigs: configs,
        nodeId: nodeId,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('calendar_workflow', JSON.stringify(workflowData));
      console.log('✅ Calendar workflow localStorage\'a kaydedildi');
    } catch (error) {
      console.error('❌ Calendar workflow kaydedilemedi:', error);
    }
  }, [nodeId]);

  // Workflow'u localStorage'dan yükle
  const loadWorkflowFromStorage = useCallback(() => {
    try {
      const savedWorkflow = localStorage.getItem('calendar_workflow');
      if (savedWorkflow) {
        const workflowData = JSON.parse(savedWorkflow);
        setNodes(workflowData.nodes || initialNodes);
        setEdges(workflowData.edges || initialEdges);
        setNodeConfigs(workflowData.nodeConfigs || {});
        setNodeId(workflowData.nodeId || 1);
        console.log('✅ Calendar workflow localStorage\'dan yüklendi');
        return true;
      }
    } catch (error) {
      console.error('❌ Calendar workflow yüklenemedi:', error);
    }
    return false;
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      onWorkflowChange?.(nodes, newEdge);
    },
    [edges, nodes, onWorkflowChange]
  );

  // Node çift tıklama handler'ı
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    const config = nodeConfigs[node.id] || {};
    setFormData(config);
    setIsModalOpen(true);
  }, [nodeConfigs]);

  // Node konfigürasyonunu kaydet
  const saveNodeConfig = useCallback(() => {
    if (selectedNode) {
      console.log('🔧 Calendar node konfigürasyonu kaydediliyor:', {
        nodeId: selectedNode.id,
        nodeType: selectedNode.type,
        formData: formData
      });
      
      setNodeConfigs(prev => {
        const newConfigs = {
          ...prev,
          [selectedNode.id]: formData
        };
        console.log('💾 Güncellenmiş calendar nodeConfigs:', newConfigs);
        return newConfigs;
      });
      
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === selectedNode.id 
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  configured: true,
                  config: formData
                } 
              }
            : node
        )
      );
      
      setIsModalOpen(false);
      setFormData({});
    }
  }, [selectedNode, formData, setNodes]);

  // Node silme fonksiyonu
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges => prevEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    setNodeConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[nodeId];
      return newConfigs;
    });
    
    setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
    
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    const updatedEdges = edges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
    onWorkflowChange?.(updatedNodes, updatedEdges);
  }, [nodes, edges, setNodes, setEdges, onWorkflowChange]);

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    onWorkflowChange?.([], []);
  };

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Workflow çalıştırmak için önce node ekleyin!');
      return;
    }

    const triggerNodes = nodes.filter(node => node.type === 'calendarTrigger');
    if (triggerNodes.length === 0) {
      alert('Workflow çalıştırmak için bir Calendar Trigger node ekleyin!');
      return;
    }

    setIsExecuting(true);
    
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          executionStatus: 'running',
          executionResult: null
        }
      }))
    );
    
    try {
      console.log('🚀 Calendar workflow çalıştırılıyor...');
      console.log('📋 Mevcut nodes:', nodes.map(n => ({ id: n.id, type: n.type, configured: n.data.configured })));
      console.log('⚙️ Mevcut nodeConfigs:', nodeConfigs);
      
      const execution = await workflowEngine.executeWorkflow(nodes, edges, nodeConfigs);
      setCurrentExecution(execution);

      setNodes(prevNodes => 
        prevNodes.map(node => {
          const result = execution.nodeResults[node.id];
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: result?.success ? 'success' : 'error',
              executionResult: result
            }
          };
        })
      );

      let message = `🗓️ Calendar Workflow Execution Tamamlandı!\n\n`;
      message += `📊 Execution ID: ${execution.id}\n`;
      message += `⏱️ Süre: ${execution.totalExecutionTime}ms\n`;
      message += `📈 Durum: ${execution.status === 'success' ? '✅ Başarılı' : '❌ Hatalı'}\n\n`;
      
      message += `📋 Node Sonuçları:\n`;
      Object.entries(execution.nodeResults).forEach(([nodeId, result]) => {
        const node = nodes.find(n => n.id === nodeId);
        const nodeType = node?.type || 'unknown';
        const icon = nodeType === 'calendarTrigger' ? '🗓️' : 
                    nodeType === 'taskCreator' ? '📋' : 
                    nodeType === 'reminder' ? '⏰' : 
                    nodeType === 'notification' ? '🔔' : 
                    nodeType === 'taskSync' ? '🔄' : 
                    nodeType === 'calendarEventSync' ? '📅' : 
                    nodeType === 'realtimeUpdate' ? '⚡' : '📝';
        
        message += `${icon} ${nodeType}: ${result.success ? '✅' : '❌'} (${result.executionTime}ms)\n`;
        if (result.error) {
          message += `   ⚠️ Hata: ${result.error}\n`;
        }
      });

      alert(message);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      let displayMessage = '';
      if (errorMessage.includes('Zapier webhook URL')) {
        displayMessage = `🔧 Kurulum Hatası!\n\n${errorMessage}`;
      } else if (errorMessage.includes('CORS')) {
        displayMessage = `🌐 Bağlantı Hatası!\n\n${errorMessage}\n\n💡 Proxy sunucusunun çalıştığından emin olun.`;
      } else {
        displayMessage = `❌ Calendar Workflow Hatası!\n\n${errorMessage}`;
      }
      
      alert(displayMessage);
      
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            executionStatus: 'error',
            executionResult: null
          }
        }))
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNode) {
        deleteNode(selectedNode.id);
        setSelectedNode(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, deleteNode]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNode) {
        event.preventDefault();
        deleteNode(selectedNode.id);
      }
      if (event.key === 'Escape') {
        setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode, deleteNode]);

  useEffect(() => {
    loadWorkflowFromStorage();
  }, [loadWorkflowFromStorage]);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0 || Object.keys(nodeConfigs).length > 0) {
      saveWorkflowToStorage(nodes, edges, nodeConfigs);
    }
  }, [nodes, edges, nodeConfigs, saveWorkflowToStorage]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }
  }, [contextMenu.show]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNodeId = `${type}_${nodeId}`;
      let newNode;

      switch (type) {
        case 'calendarTrigger':
          newNode = {
            id: newNodeId,
            type: 'calendarTrigger',
            position,
            data: { 
              label: 'Google Calendar',
              description: 'Google Calendar etkinliklerini yakalar'
            },
          };
          break;
        case 'taskCreator':
          newNode = {
            id: newNodeId,
            type: 'taskCreator',
            position,
            data: { 
              label: 'Görev Oluştur',
              description: 'Calendar\'den görev oluşturur'
            },
          };
          break;
        case 'reminder':
          newNode = {
            id: newNodeId,
            type: 'reminder',
            position,
            data: { 
              label: 'Hatırlatıcı',
              description: 'Etkinlik hatırlatıcısı ayarlar'
            },
          };
          break;
        case 'notification':
          newNode = {
            id: newNodeId,
            type: 'notification',
            position,
            data: { 
              label: 'Bildirim',
              description: 'Bildirim gönderir'
            },
          };
          break;
        case 'taskSync':
          newNode = {
            id: newNodeId,
            type: 'taskSync',
            position,
            data: { 
              label: 'Task Sync',
              description: 'EchoDay görevlerini Calendar\'a senkronize eder'
            },
          };
          break;
        case 'calendarEventSync':
          newNode = {
            id: newNodeId,
            type: 'calendarEventSync',
            position,
            data: { 
              label: 'Calendar Event Sync',
              description: 'Google Calendar etkinliklerini EchoDay\'a senkronize eder'
            },
          };
          break;
        case 'realtimeUpdate':
          newNode = {
            id: newNodeId,
            type: 'realtimeUpdate',
            position,
            data: { 
              label: 'Real-time Update',
              description: 'Görev değişikliklerini gerçek zamanlı senkronize eder'
            },
          };
          break;
        default:
          return;
      }

      setNodes((nds) => nds.concat(newNode));
      setNodeId((id) => id + 1);
    },
    [nodeId, setNodes, setNodeId]
  );

  const handleAddWebhook = useCallback(() => {
    // Yeni Calendar Trigger node'u oluştur
    const newNodeId = `calendarTrigger_${nodeId}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'calendarTrigger',
      position: { x: 100, y: 100 },
      data: { 
        label: 'Google Calendar',
        description: 'Google Calendar\'dan gelen etkinlikleri yakalar',
        configured: false
      },
    };

    // Node'u ekle
    setNodes(prevNodes => [...prevNodes, newNode]);
    setNodeId(prevId => prevId + 1);
    
    // Modal'ı kapat
    setIsAddWebhookModalOpen(false);
  }, [nodeId]);

  return (
    <div className="flex w-full h-96 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Yeni Webhook Ekle Butonu */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 border-b border-indigo-200 dark:border-indigo-700">
        <button
          onClick={() => setIsAddWebhookModalOpen(true)}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span className="text-xl">📅</span>
          <span>Yeni Webhook Ekle</span>
          <span className="text-sm opacity-75">Google Calendar</span>
        </button>
        <p className="text-center text-xs text-indigo-600 dark:text-indigo-400 mt-2">
          Görevleri takvime otomatik ekle
        </p>
      </div>

      {/* Node Palette */}
      <div className="w-48 bg-white dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 p-2 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">🗓️ Calendar Node Palette</h3>
        <div className="space-y-2">
          <div
            className="p-2 bg-indigo-100 dark:bg-indigo-900 border border-indigo-300 dark:border-indigo-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'calendarTrigger')}
          >
            <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">🗓️ Calendar Trigger</div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400">Etkinlikleri yakalar</div>
          </div>

          <div
            className="p-2 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'taskCreator')}
          >
            <div className="text-sm font-semibold text-green-800 dark:text-green-200">📋 Görev Oluştur</div>
            <div className="text-xs text-green-600 dark:text-green-400">Görev oluşturur</div>
          </div>

          <div
            className="p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'reminder')}
          >
            <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">⏰ Hatırlatıcı</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">Hatırlatıcı ayarlar</div>
          </div>

          <div
            className="p-2 bg-purple-100 dark:bg-purple-900 border border-purple-300 dark:border-purple-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'notification')}
          >
            <div className="text-sm font-semibold text-purple-800 dark:text-purple-200">🔔 Bildirim</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Bildirim gönderir</div>
          </div>

          <div
            className="p-2 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'taskSync')}
          >
            <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">🔄 Task Sync</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Calendar'a senkronize et</div>
          </div>

          <div
            className="p-2 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'calendarEventSync')}
          >
            <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">📅 Calendar Event Sync</div>
            <div className="text-xs text-orange-600 dark:text-orange-400">EchoDay'a senkronize et</div>
          </div>

          <div
            className="p-2 bg-teal-100 dark:bg-teal-900 border border-teal-300 dark:border-teal-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'realtimeUpdate')}
          >
            <div className="text-sm font-semibold text-teal-800 dark:text-teal-200">⚡ Real-time Update</div>
            <div className="text-xs text-teal-600 dark:text-teal-400">Gerçek zamanlı senkronize et</div>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-gray-50 dark:bg-gray-800"
        >
          <Background />
          <Controls />
          <MiniMap />
          
          {/* Araç Çubuğu */}
          <Panel position="top-left" className="space-x-2">
            <button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className={`px-3 py-1 text-white rounded text-sm font-bold ${
                isExecuting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isExecuting ? '⏳ Çalışıyor...' : '▶️ Çalıştır'}
            </button>
            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              🗑️ Temizle
            </button>
          </Panel>

        {/* Bilgi Paneli */}
        <Panel position="bottom-right">
          <div className="bg-white dark:bg-gray-700 p-3 rounded shadow-lg text-sm">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">📋 Calendar Workflow Bilgisi</h3>
            <p className="text-gray-600 dark:text-gray-400">Node'lar: {nodes.length}</p>
            <p className="text-gray-600 dark:text-gray-400">Bağlantılar: {edges.length}</p>
            
            {currentExecution && (
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">🚀 Son Execution</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Durum: {currentExecution.status === 'success' ? '✅ Başarılı' : '❌ Hatalı'}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Süre: {currentExecution.totalExecutionTime}ms
                </p>
              </div>
            )}
            
            {isExecuting && (
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <p className="text-blue-600 dark:text-blue-400 font-semibold">⏳ Calendar workflow çalışıyor...</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Webhook Bilgileri Paneli */}
        <Panel position="top-right">
          <div className="bg-white dark:bg-gray-700 p-3 rounded shadow-lg text-sm max-w-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">🔗 Calendar Webhook</h3>
              <button
                onClick={() => setShowWebhookInfo(!showWebhookInfo)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showWebhookInfo ? '📉' : '📊'}
              </button>
            </div>
            
            {showWebhookInfo && (
              <div className="space-y-2">
                {nodes.filter(node => node.type === 'calendarTrigger' && node.data.configured).map(node => (
                  <div key={node.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                    <div className="font-semibold text-gray-700 dark:text-gray-300">{node.data.label}</div>
                    {node.data.config?.webhookUrl && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <div className="font-medium">{node.data.config.method || 'POST'}:</div>
                        <div className="truncate">{node.data.config.webhookUrl}</div>
                      </div>
                    )}
                    {node.data.config?.zapierWebhookUrl && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <div className="font-medium">Zapier:</div>
                        <div className="truncate">{node.data.config.zapierWebhookUrl}</div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Calendar Action Butonları */}
                {nodes.filter(node => node.type === 'calendarTrigger' && node.data.label?.includes('Calendar') && node.data.executionResult?.outputData).map(node => (
                  <div key={node.id} className="p-2 bg-indigo-50 dark:bg-indigo-900 rounded border border-indigo-200 dark:border-indigo-700">
                    <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">🗓️ Calendar İşlemleri</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => sendCalendarToTaskPage(node.data.executionResult.outputData, false)}
                        className="w-full px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs transition-colors"
                        title="Bu Calendar verisini işle"
                      >
                        📋 Görev Oluştur
                      </button>
                      <button
                        onClick={() => sendCalendarToTaskPage(node.data.executionResult.outputData, true)}
                        className="w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                        title="Akıllı filtreleme ile işle"
                      >
                        🎯 Akıllı İşle
                      </button>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Akıllı işlem: Sadece önemli etkinlikleri işler
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => contextMenu.nodeId && deleteNode(contextMenu.nodeId)}
            className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Node'u Sil</span>
          </button>
        </div>
      )}

      {/* Yeni Webhook Ekle Modal'ı */}
      {isAddWebhookModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                📅 Yeni Google Calendar Webhook
              </h2>
              <button
                onClick={() => setIsAddWebhookModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">📅</span>
                  <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">
                    Google Calendar Webhook
                  </h3>
                </div>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Google Calendar etkinliklerini EchoDay'a otomatik olarak senkronize edin.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    🚀 Zapier ile Kolay Kurulum
                  </h4>
                  <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <li>1. Zapier hesabınızda giriş yapın</li>
                    <li>2. "Google Calendar - New Event" trigger'ı oluşturun</li>
                    <li>3. Webhook URL'ini kopyalayın</li>
                    <li>4. "Create Event" action'ı ekleyin</li>
                    <li>5. EchoDay webhook URL'ini yapıştırın</li>
                  </ol>
                </div>

                <button
                  onClick={handleAddWebhook}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  🚀 Zapier ile Webhook Ekle
                </button>

                <div className="text-center text-xs text-gray-500 dark:text-gray-400 my-2">
                  veya
                </div>

                <button
                  onClick={handleAddWebhook}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  ⚙️ Manuel Webhook Ekle
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📋 Özellikler
                </h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>✅ Otomatik etkinlik senkronizasyonu</li>
                  <li>✅ Gerçek zamanlı güncellemeler</li>
                  <li>✅ Çift yönlü veri akışı</li>
                  <li>✅ Akıllı önem filtrelemesi</li>
                  <li>✅ Hatırlatıcı ve bildirimler</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsAddWebhookModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={handleAddWebhook}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Webhook Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node Ayarları Modal'ı */}
      {isModalOpen && selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {selectedNode.type === 'calendarTrigger' && '🗓️ Calendar Trigger Ayarları'}
                {selectedNode.type === 'taskCreator' && '📋 Görev Oluşturucu Ayarları'}
                {selectedNode.type === 'reminder' && '⏰ Hatırlatıcı Ayarları'}
                {selectedNode.type === 'notification' && '🔔 Bildirim Ayarları'}
                {selectedNode.type === 'taskSync' && '🔄 Task Sync Ayarları'}
                {selectedNode.type === 'calendarEventSync' && '📅 Calendar Event Sync Ayarları'}
                {selectedNode.type === 'realtimeUpdate' && '⚡ Real-time Update Ayarları'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Calendar Trigger Ayarları */}
              {selectedNode.type === 'calendarTrigger' && (
                <div>
                  {/* Mod Seçimi */}
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🎯 Bağlantı Modu
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setFormData((prev: any) => ({ ...prev, mode: 'zapier' }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        (formData.mode || 'zapier') === 'zapier' 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' 
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      🚀 Kolay Mod<br/>
                      <span className="text-xs opacity-75">Zapier Webhook</span>
                    </button>
                    <button
                      onClick={() => setFormData((prev: any) => ({ ...prev, mode: 'api' }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.mode === 'api' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      ⚙️ Gelişmiş Mod<br/>
                      <span className="text-xs opacity-75">Kendi API</span>
                    </button>
                  </div>

                  {/* Zapier Modu */}
                  {(formData.mode || 'zapier') === 'zapier' && (
                    <div className="space-y-3">
                      <div className="bg-indigo-50 dark:bg-indigo-900 p-3 rounded-lg">
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                          📋 <strong>Google Calendar Zapier Adımları:</strong>
                        </p>
                        <ol className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1">
                          <li>1. Zapier'da "Google Calendar - New Event" trigger'ı oluştur</li>
                          <li>2. "Webhooks - POST" action'ı ekle</li>
                          <li>3. Webhook URL'ini aşağıya yapıştır</li>
                          <li>4. Test et! 🎉</li>
                        </ol>
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Zapier Calendar Webhook URL
                      </label>
                      <input
                        type="text"
                        value={formData.zapierWebhookUrl || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, zapierWebhookUrl: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                      />
                    </div>
                  )}

                  {/* API Modu */}
                  {formData.mode === 'api' && (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          🔧 <strong>Gelişmiş ayarlar:</strong> Kendi Calendar API endpoint'ini kullan
                        </p>
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Calendar API Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={formData.webhookUrl || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, webhookUrl: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://api.example.com/calendar/webhook"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Task Creator Ayarları */}
              {selectedNode.type === 'taskCreator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Görev Türü
                  </label>
                  <select 
                    value={formData.taskType || 'calendar_event'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, taskType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="calendar_event">Takvim Etkinliği</option>
                    <option value="meeting">Toplantı</option>
                    <option value="reminder">Hatırlatıcı</option>
                    <option value="deadline">Deadline</option>
                  </select>
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    Öncelik
                  </label>
                  <select 
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, priority: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="high">Yüksek</option>
                    <option value="medium">Orta</option>
                    <option value="low">Düşük</option>
                  </select>
                </div>
              )}

              {/* Reminder Ayarları */}
              {selectedNode.type === 'reminder' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hatırlatıcı Zamanı
                  </label>
                  <select 
                    value={formData.reminderTime || '15min'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, reminderTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="5min">5 dakika önce</option>
                    <option value="15min">15 dakika önce</option>
                    <option value="30min">30 dakika önce</option>
                    <option value="1hour">1 saat önce</option>
                    <option value="1day">1 gün önce</option>
                  </select>
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    Bildirim Türü
                  </label>
                  <select 
                    value={formData.notificationType || 'popup'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, notificationType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="popup">Popup Bildirim</option>
                    <option value="email">E-posta</option>
                    <option value="sms">SMS</option>
                    <option value="all">Tümü</option>
                  </select>
                </div>
              )}

              {/* Notification Ayarları */}
              {selectedNode.type === 'notification' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bildirim Mesajı
                  </label>
                  <textarea
                    value={formData.message || 'Yeni takvim etkinliği oluşturuldu: {summary}'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, message: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-20 resize-none"
                    placeholder="Bildirim mesajını giriniz..."
                  />
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Değişkenler:
                    </label>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>{"{summary}"} - Etkinlik başlığı</div>
                      <div>{"{startTime}"} - Başlangıç zamanı</div>
                      <div>{"{location}"} - Konum</div>
                      <div>{"{attendees}"} - Katılımcılar</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Task Sync Ayarları */}
              {selectedNode.type === 'taskSync' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sync Yönü
                  </label>
                  <select 
                    value={formData.syncDirection || 'echoday-to-calendar'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, syncDirection: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="echoday-to-calendar">EchoDay → Calendar</option>
                    <option value="calendar-to-echoday">Calendar → EchoDay</option>
                    <option value="both">Çift Yönlü</option>
                  </select>
                </div>
              )}

              {/* Calendar Event Sync Ayarları */}
              {selectedNode.type === 'calendarEventSync' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sync Zamanı
                  </label>
                  <select 
                    value={formData.syncTime || 'auto'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, syncTime: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="auto">Otomatik</option>
                    <option value="manual">Manuel</option>
                    <option value="5min">5 dakikada bir</option>
                    <option value="15min">15 dakikada bir</option>
                    <option value="1hour">1 saatte bir</option>
                  </select>
                </div>
              )}

              {/* Real-time Update Ayarları */}
              {selectedNode.type === 'realtimeUpdate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update Tetikleyici
                  </label>
                  <select 
                    value={formData.updateTrigger || 'manual'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, updateTrigger: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="manual">Manuel Tetikle</option>
                    <option value="automatic">Otomatik Dinle</option>
                    <option value="webhook">Webhook Dinle</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                İptal
              </button>
              <button
                onClick={saveNodeConfig}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
