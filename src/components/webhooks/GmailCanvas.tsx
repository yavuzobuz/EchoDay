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
    const response = await fetch('/api/mail/webhook', {
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
          {isConfigured && data.config?.webhookUrl && (
            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              {data.config.method}: {data.config.webhookUrl.substring(0, 30)}...
            </div>
          )}
          {data.executionResult && (
            <div className="text-xs mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
              <div className="font-semibold">Sonuç:</div>
              <div>{data.executionResult.duration}ms - {data.executionResult.outputData?.length || 0} öğe</div>
              {data.executionResult.error && (
                <div className="text-red-600 dark:text-red-400">Hata: {data.executionResult.error}</div>
              )}
              {/* Gmail webhook'u için akıllı mail gönderme butonları */}
              {data.label?.includes('Gmail') && data.executionResult.outputData && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => sendGmailToMailPage(data.executionResult.outputData, false)}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                      title="Bu Gmail verisini mail sayfasında görüntüle"
                    >
                      📧 Mail Sayfasına Gönder
                    </button>
                    <button 
                      onClick={() => sendGmailToMailPage(data.executionResult.outputData, true)}
                      className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                      title="Akıllı filtreleme ile gönder (spam ve önemsiz email'ler engellenir)"
                    >
                      🎯 Akıllı Gönder
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Akıllı gönder: Sadece önemli email'leri filtreler
                  </div>
                </div>
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

// Form Node Bileşeni
function FormNode({ data }: { data: any }) {
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
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">📝 {data.label} {getExecutionIcon(executionStatus)}</div>
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

// Node türleri - Component dışında tanımlanmalı (React Flow optimizasyonu için)
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode,
  mailreader: MailReaderNode,
  form: FormNode,
};

// Başlangıç node'ları
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Task Oluşturuldu',
      description: 'Yeni görev oluşturulduğunda tetiklenir'
    },
  },
];

const initialEdges: Edge[] = [];

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

  // Yeni node ekleme fonksiyonları
  const addTriggerNode = () => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'trigger',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Yeni Tetikleyici',
        description: 'Tetikleyici açıklaması'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const addActionNode = () => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'action',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Gmail Gönder',
        description: 'Gmail ile e-posta gönder'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const addFilterNode = () => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'filter',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Öncelik Filtresi',
        description: 'Yüksek öncelikli görevleri filtrele'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const addMailReaderNode = () => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'mailreader',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Gmail Okuyucu',
        description: 'Gmail gelen kutusunu okur'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

  const addFormNode = () => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'form',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Seçim Formu',
        description: 'Kullanıcı seçimleri için form'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    setNodeId((id) => id + 1);
  };

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

  return (
    <div className="w-full h-96 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeClick={onNodeClick}
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
            onClick={addTriggerNode}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            📧 Tetikleyici
          </button>
          <button
            onClick={addActionNode}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            ⚡ Aksiyon
          </button>
          <button
            onClick={addFilterNode}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
          >
            🔍 Filtre
          </button>
          <button
            onClick={addMailReaderNode}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
          >
            📬 Mail Okuyucu
          </button>
          <button
            onClick={addFormNode}
            className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
          >
            📝 Form
          </button>
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
      </ReactFlow>

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
                  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    Değer
                  </label>
                  <input
                    type="text"
                    value={formData.filterValue || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, filterValue: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Filtrelenecek değer"
                  />
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
}