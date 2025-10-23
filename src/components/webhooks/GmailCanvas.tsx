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
import { EmailFilter, FilterSettings } from '../../utils/emailFilter';

// 🎯 Akıllı Gmail webhook filtreleme fonksiyonu
const sendGmailToMailPage = async (gmailData: any, autoMode: boolean = false) => {
  try {
    // Gmail webhook verisini mail formatına çevir
    const mailData = {
      from: gmailData.from || 'Gmail Webhook',
      to: gmailData.to || 'me@example.com',
      subject: gmailData.subject || 'Gmail Webhook Mail',
      body: gmailData.body || gmailData.snippet || 'Gmail webhook\'tan gelen mail',
      date: gmailData.date || new Date().toISOString(),
      source: 'gmail-webhook',
      messageId: gmailData.messageId || `gmail-${Date.now()}`,
      labels: gmailData.labels || [],
      threadId: gmailData.threadId || null
    };

    // 🧠 Akıllı filtreleme (sadece otomatik modda)
    if (autoMode) {
      // Kullanıcı ayarlarını al (localStorage'dan veya varsayılan)
      const savedSettings = localStorage.getItem('emailFilterSettings');
      const filterSettings: FilterSettings = savedSettings 
        ? JSON.parse(savedSettings) 
        : EmailFilter.getDefaultSettings();

      // Email'i analiz et
      const emailFilter = new EmailFilter(filterSettings);
      const filterResult = emailFilter.analyzeEmail({
        from: mailData.from,
        subject: mailData.subject,
        body: mailData.body,
        date: mailData.date,
        labels: mailData.labels,
        snippet: gmailData.snippet
      });

      // Spam kontrolü
      if (filterResult.isSpam && filterSettings.blockSpam) {
        console.log('🚫 Spam email engellendi:', filterResult.reasons);
        return { success: false, reason: 'spam', details: filterResult.reasons };
      }

      // Önem kontrolü
      if (!filterResult.isImportant) {
        console.log('📉 Email önemli değil (Skor: ' + filterResult.score + '):', filterResult.reasons);
        return { success: false, reason: 'not_important', score: filterResult.score, details: filterResult.reasons };
      }

      console.log('✅ Email önemli bulundu (Skor: ' + filterResult.score + '):', filterResult.reasons);
    }

    // Mail webhook endpoint'ine gönder
    const response = await fetch('http://localhost:5001/api/mail/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailData)
    });

    if (response.ok) {
      // Başarılı mesajı göster
      const message = autoMode 
        ? '🎯 Önemli email otomatik olarak mail sayfasına gönderildi!'
        : '✅ Gmail mail sayfasına başarıyla gönderildi!';
      alert(message);
      
      return { success: true };
      
      // Mail sayfasına yönlendir (isteğe bağlı)
      // window.location.href = '/email';
    } else {
      throw new Error('Mail gönderme başarısız');
    }
  } catch (error) {
    console.error('Gmail mail sayfasına gönderme hatası:', error);
    alert('❌ Mail gönderme sırasında hata oluştu');
  }
};

// Trigger Node Bileşeni
function TriggerNode({ data }: { data: any }) {
  const isConfigured = data.configured;
  const executionStatus = data.executionStatus; // 'success', 'error', 'running', null
  
  // Execution durumuna göre renk ve ikon
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
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle()} ${
      isConfigured
        ? 'bg-blue-200 border-blue-400 dark:bg-blue-800 dark:border-blue-500'
        : 'bg-yellow-100 border-yellow-400 border-dashed dark:bg-yellow-900 dark:border-yellow-500'
    }`}>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
      <div className="flex items-center justify-between">
        <div className="ml-2">
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
            📧 {data.label} {isConfigured ? '✅' : '⚠️'} {getExecutionIcon()}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
          {!isConfigured && (
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
              ⚙️ Yapılandırma gerekli - Çift tıklayın
            </div>
          )}
          {isConfigured && data.config && (
            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              🔗 Webhook yapılandırıldı
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
      </div>
    </div>
  );
}

// Action Node Bileşeni
function ActionNode({ data }: { data: any }) {
  const executionStatus = data.executionStatus;
  
  const getExecutionStyle = (executionStatus: string) => {
    if (executionStatus === 'running') return 'ring-2 ring-yellow-400 animate-pulse';
    if (executionStatus === 'success') return 'ring-2 ring-green-400';
    if (executionStatus === 'error') return 'ring-2 ring-red-400';
    return '';
  };
  
  const getExecutionIcon = (executionStatus: string) => {
    if (executionStatus === 'running') return '⏳';
    if (executionStatus === 'success') return '✅';
    if (executionStatus === 'error') return '❌';
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
           <div className="text-lg font-bold text-green-800 dark:text-green-200">⚡ {data.label} {getExecutionIcon(executionStatus)}</div>
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

// Filter Node Bileşeni
function FilterNode({ data }: { data: any }) {
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
          <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">🔍 {data.label} {getExecutionIcon(executionStatus)}</div>
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

// Mail Reader Node Bileşeni
function MailReaderNode({ data }: { data: any }) {
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
          <div className="text-lg font-bold text-purple-800 dark:text-purple-200">📬 {data.label} {getExecutionIcon(executionStatus)}</div>
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

// Form Node Bileşeni - İşlevsel Form
function FormNode({ data }: { data: any }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const config = data.config || {};
    
    if (config.fields) {
      config.fields.forEach((field: any) => {
        if (field.required && !formData[field.name]) {
          errors[field.name] = `${field.label} alanı zorunludur`;
        }
        if (field.type === 'email' && formData[field.name] && !/\S+@\S+\.\S+/.test(formData[field.name])) {
          errors[field.name] = 'Geçerli bir email adresi giriniz';
        }
      });
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      // Form submission logic
      console.log('Form submitted:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update node data with form results
      data.executionResult = {
        executionTime: 1000,
        outputData: formData,
        success: true
      };
    } catch (error) {
      data.executionResult = {
        executionTime: 1000,
        error: 'Form submission failed',
        success: false
      };
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-orange-100 border-orange-300 dark:bg-orange-900 dark:border-orange-600 min-w-[300px]`}>
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
      <div className="flex flex-col">
        <div className="mb-2">
          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">📝 {data.label} {getExecutionIcon(executionStatus)}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
        
        {/* Form Fields */}
        {data.config?.fields && (
          <div className="space-y-2 mb-3">
            {data.config.fields.map((field: any, index: number) => (
              <div key={index} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {validationErrors[field.name] && (
                  <span className="text-xs text-red-500 mt-1">{validationErrors[field.name]}</span>
                )}
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </div>
        )}
        
        {data.executionResult && (
          <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="font-semibold">Sonuç:</div>
            <div>{data.executionResult.executionTime}ms - Form verisi toplandı</div>
            {data.executionResult.error && (
              <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// HTML Form Node Bileşeni - HTML Rendering
function HtmlFormNode({ data }: { data: any }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [lastTwoMails, setLastTwoMails] = useState<any[]>([]);
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

  // Test için son 2 mail'i getir
  useEffect(() => {
    const fetchLastTwoMails = async () => {
      try {
        // Simulate fetching last 2 emails
        const mockMails = [
          {
            id: 1,
            subject: 'Test Email 1',
            from: 'test1@example.com',
            date: new Date().toISOString(),
            body: 'Bu bir test email\'idir.'
          },
          {
            id: 2,
            subject: 'Test Email 2', 
            from: 'test2@example.com',
            date: new Date(Date.now() - 3600000).toISOString(),
            body: 'Bu ikinci test email\'idir.'
          }
        ];
        setLastTwoMails(mockMails);
      } catch (error) {
        console.error('Mail fetch error:', error);
      }
    };

    fetchLastTwoMails();
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('HTML Form submitted:', formData);
    
    // Update execution result
    data.executionResult = {
      executionTime: 500,
      outputData: { formData, lastTwoMails },
      success: true
    };
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getExecutionStyle(executionStatus)} bg-indigo-100 border-indigo-300 dark:bg-indigo-900 dark:border-indigo-600 min-w-[350px]`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-500"
      />
      <div className="flex flex-col">
        <div className="mb-2">
          <div className="text-lg font-bold text-indigo-800 dark:text-indigo-200">🌐 {data.label} {getExecutionIcon(executionStatus)}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
        
        {/* HTML Form */}
        <form onSubmit={handleFormSubmit} className="space-y-2 mb-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Konusu
            </label>
            <input
              type="text"
              placeholder="Email konusunu giriniz"
              value={formData.subject || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mesaj
            </label>
            <textarea
              placeholder="Mesajınızı yazınız"
              value={formData.message || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white h-16 resize-none"
            />
          </div>
          
          <button
            type="submit"
            className="px-3 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
          >
            HTML Form Gönder
          </button>
        </form>
        
        {/* Son 2 Mail Görüntüleme */}
        <div className="border-t pt-2 mt-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            📧 Son 2 Mail (Test)
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {lastTwoMails.map((mail) => (
              <div key={mail.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="font-semibold">{mail.subject}</div>
                <div className="text-gray-600 dark:text-gray-400">From: {mail.from}</div>
                <div className="text-gray-500 dark:text-gray-500 truncate">{mail.body}</div>
              </div>
            ))}
          </div>
        </div>
        
        {data.executionResult && (
          <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="font-semibold">Sonuç:</div>
            <div>{data.executionResult.executionTime}ms - HTML Form işlendi</div>
            {data.executionResult.error && (
              <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Node türleri - Component dışında tanımlanmalı (React Flow optimizasyonu için)
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode,
  mailreader: MailReaderNode,
  form: FormNode,
  htmlform: HtmlFormNode,
};

// Başlangıç node'ları - Gmail webhook için hazır workflow
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Gmail Webhook',
      description: 'Gmail\'den gelen mailleri yakalar',
      configured: true,
      config: {
        mode: 'zapier',
        zapierWebhookUrl: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/'
      }
    },
  },
  {
    id: '2',
    type: 'mailreader',
    position: { x: 400, y: 100 },
    data: { 
      label: 'Mail Analiz',
      description: 'Gelen mail içeriğini analiz eder'
    },
  },
  {
    id: '3',
    type: 'filter',
    position: { x: 700, y: 100 },
    data: { 
      label: 'Önem Filtresi',
      description: 'Önemli mailleri ayıklar'
    },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 1000, y: 100 },
    data: { 
      label: 'Görev Oluştur',
      description: 'Mail\'den görev oluştur'
    },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true }
];

interface GmailCanvasProps {
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void;
}

export default function GmailCanvas({ onWorkflowChange }: GmailCanvasProps) {
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
  const [receivedEmails, setReceivedEmails] = useState<any[]>([]);
  const [isWebhookRunning, setIsWebhookRunning] = useState(false);
  const [webhookInterval, setWebhookInterval] = useState<NodeJS.Timeout | null>(null);

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
      localStorage.setItem('gmail_workflow', JSON.stringify(workflowData));
    } catch (error) {
      console.error('❌ Workflow kaydedilemedi:', error);
    }
  }, [nodeId]);

  // Workflow'u localStorage'dan yükle
  const loadWorkflowFromStorage = useCallback(() => {
    try {
      const savedWorkflow = localStorage.getItem('gmail_workflow');
      if (savedWorkflow) {
        const workflowData = JSON.parse(savedWorkflow);
        setNodes(workflowData.nodes || initialNodes);
        setEdges(workflowData.edges || initialEdges);
        setNodeConfigs(workflowData.nodeConfigs || {});
        setNodeId(workflowData.nodeId || 1);
        console.log('✅ Workflow localStorage\'dan yüklendi');
        return true;
      }
    } catch (error) {
      console.error('❌ Workflow yüklenemedi:', error);
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
    // Mevcut konfigürasyonu yükle
    const config = nodeConfigs[node.id] || {};
    setFormData(config);
    setIsModalOpen(true);
  }, [nodeConfigs]);

  // Node konfigürasyonunu kaydet
  const saveNodeConfig = useCallback(() => {
    if (selectedNode) {
      console.log('🔧 Node konfigürasyonu kaydediliyor:', {
        nodeId: selectedNode.id,
        nodeType: selectedNode.type,
        formData: formData
      });
      
      setNodeConfigs(prev => {
        const newConfigs = {
          ...prev,
          [selectedNode.id]: formData
        };
        console.log('💾 Güncellenmiş nodeConfigs:', newConfigs);
        return newConfigs;
      });
      
      // Node'un label'ını güncelle
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
    
    // Node konfigürasyonunu da temizle
    setNodeConfigs(prev => {
      const newConfigs = { ...prev };
      delete newConfigs[nodeId];
      return newConfigs;
    });
    
    // Context menüyü kapat
    setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
    
    // Workflow değişikliğini bildir
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

    // Trigger node kontrolü
    const triggerNodes = nodes.filter(node => node.type === 'trigger');
    if (triggerNodes.length === 0) {
      alert('Workflow çalıştırmak için bir Tetikleyici node ekleyin!');
      return;
    }

    setIsExecuting(true);
    
    // Tüm node'ları "running" durumuna getir
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
      // Debug: nodeConfigs durumunu kontrol et
      console.log('🚀 Workflow çalıştırılıyor...');
      console.log('📋 Mevcut nodes:', nodes.map(n => ({ id: n.id, type: n.type, configured: n.data.configured })));
      console.log('⚙️ Mevcut nodeConfigs:', nodeConfigs);
      
      // N8N tarzı workflow execution
      const execution = await workflowEngine.executeWorkflow(nodes, edges, nodeConfigs);
      setCurrentExecution(execution);

      // Node'ları execution sonuçlarıyla güncelle
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

      // Email verilerini al ve listeye ekle
      const mailReaderNode = nodes.find(n => n.type === 'mailreader');
      if (mailReaderNode && execution.nodeResults[mailReaderNode.id]?.data?.items) {
        const emailItems = execution.nodeResults[mailReaderNode.id].data.items;
        
        // Her bir email item'ını işle
        emailItems.forEach((item: any) => {
          const gmailData = item.json.gmailData;
          const simulationData = item.json.simulationData;
          
          // Gerçek Gmail verisi varsa onu kullan, yoksa simülasyon verisi
          let emailContent;
          
          if (gmailData && Object.keys(gmailData).length > 0) {
            // Gerçek Gmail verisi
            emailContent = {
              id: gmailData.id,
              subject: gmailData.subject,
              from: gmailData.from,
              to: gmailData.to,
              body: gmailData.body,
              date: gmailData.date,
              snippet: gmailData.snippet,
              priority: gmailData.priority,
              isImportant: gmailData.isImportant,
              category: gmailData.category,
              hasAttachments: gmailData.hasAttachments,
              responseNeeded: gmailData.responseNeeded,
              isUnread: gmailData.isUnread,
              labels: gmailData.labels
            };
          } else if (simulationData && Object.keys(simulationData).length > 0) {
            // Simülasyon verisi
            emailContent = {
              id: `mail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              subject: simulationData.mockSubject,
              from: simulationData.mockFrom,
              body: simulationData.mockBody,
              date: simulationData.mockDate,
              snippet: simulationData.mockBody?.substring(0, 100),
              priority: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
              isImportant: Math.random() > 0.6,
              category: Math.random() > 0.7 ? 'work' : Math.random() > 0.4 ? 'personal' : 'newsletter',
              hasAttachments: Math.random() > 0.8,
              responseNeeded: Math.random() > 0.6,
              isUnread: true,
              labels: ['INBOX']
            };
          } else {
            // Test verisi
            return; // Test verilerini listeleme
          }
          
          const newEmail = {
            ...emailContent,
            read: !emailContent.isUnread, // isUnread'dan read durumunu belirle
            receivedAt: new Date().toISOString(),
            executionId: execution.id
          };
          
          setReceivedEmails(prev => {
            // Aynı ID'li email varsa güncelle, yoksa ekle
            const existingIndex = prev.findIndex(email => email.id === newEmail.id);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = newEmail;
              return updated;
            } else {
              return [newEmail, ...prev];
            }
          });
        });
      }

      // Execution sonucunu göster
      let message = `🚀 Workflow Execution Tamamlandı!\n\n`;
      message += `📊 Execution ID: ${execution.id}\n`;
      message += `⏱️ Süre: ${execution.totalExecutionTime}ms\n`;
      message += `📈 Durum: ${execution.status === 'success' ? '✅ Başarılı' : '❌ Hatalı'}\n\n`;
      
      message += `📋 Node Sonuçları:\n`;
      Object.entries(execution.nodeResults).forEach(([nodeId, result]) => {
        const node = nodes.find(n => n.id === nodeId);
        const nodeType = node?.type || 'unknown';
        const icon = nodeType === 'trigger' ? '📧' :
                    nodeType === 'action' ? '⚡' :
                    nodeType === 'filter' ? '🔍' :
                    nodeType === 'mailreader' ? '📬' : '📝';
        
        message += `${icon} ${nodeType}: ${result.success ? '✅' : '❌'} (${result.executionTime}ms)\n`;
        if (result.error) {
          message += `   ⚠️ Hata: ${result.error}\n`;
        }
      });

      alert(message);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      // Hata türüne göre özel mesajlar
      let displayMessage = '';
      if (errorMessage.includes('Zapier webhook URL')) {
        displayMessage = `🔧 Kurulum Hatası!\n\n${errorMessage}`;
      } else if (errorMessage.includes('CORS')) {
        displayMessage = `🌐 Bağlantı Hatası!\n\n${errorMessage}\n\n💡 Proxy sunucusunun çalıştığından emin olun.`;
      } else {
        displayMessage = `❌ Workflow Hatası!\n\n${errorMessage}`;
      }
      
      alert(displayMessage);
      
      // Node'ları hata durumuna getir
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

  // Sürekli webhook çalıştırma
  const startWebhook = () => {
    if (isWebhookRunning) {
      stopWebhook();
      return;
    }

    setIsWebhookRunning(true);
    
    // İlk çalıştırma
    executeWorkflow();
    
    // Her 30 saniyede bir çalıştır
    const interval = setInterval(() => {
      executeWorkflow();
    }, 30000);
    
    setWebhookInterval(interval);
  };

  // Webhook'u durdur
  const stopWebhook = () => {
    if (webhookInterval) {
      clearInterval(webhookInterval);
      setWebhookInterval(null);
    }
    setIsWebhookRunning(false);
  };

  // Email'i okundu olarak işaretle
  const markEmailAsRead = async (emailId: string) => {
    // Önce local state'i güncelle
    setReceivedEmails(prev =>
      prev.map(email =>
        email.id === emailId ? { ...email, read: true } : email
      )
    );
    
    // Server'a da bildir
    try {
      const response = await fetch(`http://localhost:5001/api/gmail/mark-read/${emailId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        console.log('✅ Email serverda da okundu olarak işaretlendi:', emailId);
      } else {
        console.error('❌ Email okundu işaretleme hatası (server):', emailId);
      }
    } catch (error) {
      console.error('❌ Email okundu işaretleme hatası (network):', error);
    }
  };

  // Email'i sil
  const deleteEmail = (emailId: string) => {
    setReceivedEmails(prev => prev.filter(email => email.id !== emailId));
  };

  // Component unmount olduğunda webhook'u temizle
  useEffect(() => {
    return () => {
      if (webhookInterval) {
        clearInterval(webhookInterval);
      }
    };
  }, [webhookInterval]);

  // Klavye event handler'ı - Delete tuşu
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

  // Context menu için click handler
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ show: false, x: 0, y: 0, nodeId: null });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Node click handler - seçim için
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Node sağ tık handler'ı
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

  // Klavye event handler'ı
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

  // Component mount olduğunda workflow'u yükle
  useEffect(() => {
    loadWorkflowFromStorage();
  }, [loadWorkflowFromStorage]);

  // Workflow değiştiğinde otomatik kaydet (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // İlk yükleme sırasında kaydetme
      if (nodes.length > 0 || edges.length > 0 || Object.keys(nodeConfigs).length > 0) {
        saveWorkflowToStorage(nodes, edges, nodeConfigs);
        console.log('✅ Workflow localStorage\'a kaydedildi');
      }
    }, 1000); // 1 saniye bekle

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, nodeConfigs, saveWorkflowToStorage]);

  // Context menu için click handler
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

  // Drag and Drop handlers
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
        case 'trigger':
          newNode = {
            id: newNodeId,
            type: 'trigger',
            position,
            data: { 
              label: 'Yeni Tetikleyici',
              description: 'Workflow\'u başlatan tetikleyici'
            },
          };
          break;
        case 'action':
          newNode = {
            id: newNodeId,
            type: 'action',
            position,
            data: { 
              label: 'Yeni Aksiyon',
              description: 'İşlem gerçekleştiren aksiyon'
            },
          };
          break;
        case 'filter':
          newNode = {
            id: newNodeId,
            type: 'filter',
            position,
            data: { 
              label: 'Yeni Filtre',
              description: 'Veri filtreleyen node'
            },
          };
          break;
        case 'mailreader':
          newNode = {
            id: newNodeId,
            type: 'mailreader',
            position,
            data: { 
              label: 'Yeni Mail Okuyucu',
              description: 'Email içeriğini okuyan node'
            },
          };
          break;
        case 'form':
          newNode = {
            id: newNodeId,
            type: 'form',
            position,
            data: { 
              label: 'Yeni Form',
              description: 'Form verilerini toplayan node',
              config: {
                fields: [
                  { name: 'name', label: 'İsim', type: 'text', required: true, placeholder: 'İsminizi giriniz' },
                  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Email adresinizi giriniz' }
                ]
              }
            },
          };
          break;
        case 'htmlform':
          newNode = {
            id: newNodeId,
            type: 'htmlform',
            position,
            data: { 
              label: 'HTML Form',
              description: 'HTML form renderer ve mail tester'
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

  return (
    <div className="flex w-full h-96 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      {/* Node Palette */}
      <div className="w-48 bg-white dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 p-2 overflow-y-auto">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">🎨 Node Palette</h3>
        <div className="space-y-2">
          {/* Draggable Nodes */}
          <div
            className="p-2 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'trigger')}
          >
            <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">📧 Tetikleyici</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Workflow başlatır</div>
          </div>

          <div
            className="p-2 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'action')}
          >
            <div className="text-sm font-semibold text-green-800 dark:text-green-200">⚡ Aksiyon</div>
            <div className="text-xs text-green-600 dark:text-green-400">İşlem yapar</div>
          </div>

          <div
            className="p-2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'filter')}
          >
            <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">🔍 Filtre</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">Veri filtreler</div>
          </div>

          <div
            className="p-2 bg-purple-100 dark:bg-purple-900 border border-purple-300 dark:border-purple-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'mailreader')}
          >
            <div className="text-sm font-semibold text-purple-800 dark:text-purple-200">📬 Mail Okuyucu</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Email okur</div>
          </div>

          <div
            className="p-2 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'form')}
          >
            <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">📝 Form</div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Veri toplar</div>
          </div>

          <div
            className="p-2 bg-indigo-100 dark:bg-indigo-900 border border-indigo-300 dark:border-indigo-600 rounded cursor-move hover:shadow-md transition-shadow"
            draggable
            onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'htmlform')}
          >
            <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">🌐 HTML Form</div>
            <div className="text-xs text-indigo-600 dark:text-indigo-400">HTML render + test</div>
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
          
          {/* Araç Çubuğu - Çalıştır, Webhook ve Temizle */}
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
              {isExecuting ? '⏳ Çalışıyor...' : '▶️ Tek Çalıştır'}
            </button>
            <button
              onClick={startWebhook}
              disabled={isExecuting}
              className={`px-3 py-1 text-white rounded text-sm font-bold ${
                isWebhookRunning
                  ? 'bg-orange-500 hover:bg-orange-600 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isWebhookRunning ? '🔄 Durdur' : '🚀 Webhook Başlat'}
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
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">📋 Workflow Bilgisi</h3>
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
                <p className="text-blue-600 dark:text-blue-400 font-semibold">⏳ Workflow çalışıyor...</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Webhook Bilgileri Paneli */}
        <Panel position="top-right">
          <div className="bg-white dark:bg-gray-700 p-3 rounded shadow-lg text-sm max-w-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">🔗 Webhook Bilgileri</h3>
              <button
                onClick={() => setShowWebhookInfo(!showWebhookInfo)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showWebhookInfo ? '📉' : '📊'}
              </button>
            </div>
            
            {showWebhookInfo && (
              <div className="space-y-2">
                {nodes.filter(node => node.type === 'trigger' && node.data.configured).map(node => (
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
                
                {/* Gmail Action Butonları */}
                {nodes.filter(node => node.type === 'trigger' && node.data.label?.includes('Gmail') && node.data.executionResult?.outputData).map(node => (
                  <div key={node.id} className="p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                    <div className="font-semibold text-blue-700 dark:text-blue-300 mb-2">📧 Gmail İşlemleri</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => sendGmailToMailPage(node.data.executionResult.outputData, false)}
                        className="w-full px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                        title="Bu Gmail verisini mail sayfasında görüntüle"
                      >
                        📧 Mail Sayfasına Gönder
                      </button>
                      <button
                        onClick={() => sendGmailToMailPage(node.data.executionResult.outputData, true)}
                        className="w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                        title="Akıllı filtreleme ile gönder (spam ve önemsiz email'ler engellenir)"
                      >
                        🎯 Akıllı Gönder
                      </button>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Akıllı gönder: Sadece önemli email'leri filtreler
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Email List Panel */}
        <Panel position="bottom-left" className="w-80">
          <div className="bg-white dark:bg-gray-700 p-4 rounded shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">📧 Gelen Mailler</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {receivedEmails.filter(e => !e.read).length} okunmamış
              </span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {receivedEmails.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  {isWebhookRunning ? '🔄 Mail bekleniyor...' : '📭 Henüz mail yok'}
                </div>
              ) : (
                receivedEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 rounded border ${
                      email.read
                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                        : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${email.read ? 'text-gray-700 dark:text-gray-300' : 'text-blue-700 dark:text-blue-300'}`}>
                          {email.subject}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {email.from} • {new Date(email.date || email.receivedAt).toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {email.snippet || email.body?.substring(0, 100)}...
                        </div>
                        {email.category && (
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              email.category === 'work' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                              email.category === 'finance' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              email.category === 'meeting' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                              email.category === 'project' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                            }`}>
                              {email.category}
                            </span>
                            {email.responseNeeded && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded">
                                Yanıt gerekli
                              </span>
                            )}
                            {email.hasAttachments && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded">
                                📎 Ek var
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        {!email.read && (
                          <button
                            onClick={() => markEmailAsRead(email.id)}
                            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            title="Okundu işaretle"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => deleteEmail(email.id)}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Sil"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    {email.priority && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          email.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : email.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                          {email.priority === 'high' ? 'Yüksek' : email.priority === 'medium' ? 'Orta' : 'Düşük'} öncelik
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {receivedEmails.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setReceivedEmails([])}
                  className="w-full px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  🗑️ Tümünü Temizle
                </button>
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

      {/* Node Ayarları Modal'ı */}
      {isModalOpen && selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {selectedNode.type === 'trigger' && '📧 Tetikleyici Ayarları'}
                {selectedNode.type === 'action' && '⚡ Aksiyon Ayarları'}
                {selectedNode.type === 'filter' && '🔍 Filtre Ayarları'}
                {selectedNode.type === 'mailreader' && '📬 Mail Okuyucu Ayarları'}
                {selectedNode.type === 'form' && '📝 Form Ayarları'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Trigger Node Ayarları */}
              {selectedNode.type === 'trigger' && (
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
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
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
                      <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                          📋 <strong>Adımlar:</strong>
                        </p>
                        <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                          <li>1. Zapier'da webhook oluştur</li>
                          <li>2. Webhook URL'ini aşağıya yapıştır</li>
                          <li>3. Test et! 🎉</li>
                        </ol>
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Zapier Webhook URL
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
                          🔧 <strong>Gelişmiş ayarlar:</strong> Kendi API endpoint'ini kullan
                        </p>
                      </div>
                      
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        API Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={formData.webhookUrl || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, webhookUrl: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://api.example.com/webhook"
                      />
                      
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        HTTP Method
                      </label>
                      <select 
                        value={formData.method || 'POST'}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, method: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Action Node Ayarları */}
              {selectedNode.type === 'action' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aksiyon Türü
                  </label>
                  <select 
                    value={formData.actionType || 'email'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, actionType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="email">E-posta Gönder</option>
                    <option value="api">API Çağrısı</option>
                    <option value="notification">Bildirim Gönder</option>
                  </select>
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    Hedef URL/E-posta
                  </label>
                  <input
                    type="text"
                    value={formData.target || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, target: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="admin@example.com veya https://api.example.com"
                  />
                </div>
              )}

              {/* Filter Node Ayarları */}
              {selectedNode.type === 'filter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtre Türü
                  </label>
                  <select 
                    value={formData.filterType || 'text'}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, filterType: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="text">Metin Filtresi</option>
                    <option value="subject">Konu Filtresi</option>
                    <option value="priority">Öncelik Filtresi</option>
                    <option value="importance">Önem Skoru</option>
                    <option value="spam">Spam Koruması</option>
                  </select>

                  {(formData.filterType || 'text') !== 'priority' && (formData.filterType || 'text') !== 'spam' && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                        Filtre Koşulu
                      </label>
                      <select 
                        value={formData.condition || 'contains'}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, condition: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="contains">İçerir</option>
                        <option value="equals">Eşittir</option>
                        <option value="startswith">İle Başlar</option>
                        <option value="endswith">İle Biter</option>
                      </select>
                    </>
                  )}
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    {formData.filterType === 'priority' && 'Öncelik Seviyesi'}
                    {formData.filterType === 'importance' && 'Minimum Önem Skoru (0-100)'}
                    {formData.filterType === 'spam' && 'Spam İşlemi'}
                    {(formData.filterType === 'text' || formData.filterType === 'subject' || !formData.filterType) && 'Filtre Değeri'}
                  </label>
                  
                  {formData.filterType === 'priority' ? (
                    <select 
                      value={formData.filterValue || 'medium'}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, filterValue: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="high">Yüksek</option>
                      <option value="medium">Orta</option>
                      <option value="low">Düşük</option>
                    </select>
                  ) : formData.filterType === 'spam' ? (
                    <select 
                      value={formData.filterValue || 'allow'}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, filterValue: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="allow">Sadece Spam Olmayanlar</option>
                      <option value="block">Sadece Spam\'lar</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.filterValue || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, filterValue: e.target.value }))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder={formData.filterType === 'importance' ? '50' : 'Filtrelenecek değer'}
                    />
                  )}
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
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
