import { useCallback, useState } from 'react';
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

// Node türleri
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode,
  mailreader: MailReaderNode,
  form: FormNode,
};

// Trigger Node Bileşeni
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-300 dark:bg-blue-900 dark:border-blue-600">
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">📧 {data.label}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
      </div>
    </div>
  );
}

// Action Node Bileşeni
function ActionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-300 dark:bg-green-900 dark:border-green-600">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500"
      />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-green-800 dark:text-green-200">⚡ {data.label}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
      </div>
    </div>
  );
}

// Filter Node Bileşeni
function FilterNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-300 dark:bg-yellow-900 dark:border-yellow-600">
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
          <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">🔍 {data.label}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
      </div>
    </div>
  );
}

// Mail Reader Node Bileşeni
function MailReaderNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-300 dark:bg-purple-900 dark:border-purple-600">
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
          <div className="text-lg font-bold text-purple-800 dark:text-purple-200">📬 {data.label}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
      </div>
    </div>
  );
}

// Form Node Bileşeni
function FormNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-100 border-2 border-orange-300 dark:bg-orange-900 dark:border-orange-600">
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
          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">📝 {data.label}</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm">{data.description}</div>
        </div>
      </div>
    </div>
  );
}

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
  const [nodeId, setNodeId] = useState(2);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges);
      setEdges(newEdge);
      onWorkflowChange?.(nodes, newEdge);
    },
    [edges, nodes, onWorkflowChange]
  );

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

  const executeWorkflow = () => {
    if (nodes.length === 0) {
      alert('Workflow çalıştırmak için önce node ekleyin!');
      return;
    }

    if (edges.length === 0) {
      alert('Node\'ları birbirine bağlayın!');
      return;
    }

    // Node türlerini belirle
    const triggerNodes = nodes.filter(node => node.type === 'trigger');
    const mailReaderNodes = nodes.filter(node => node.type === 'mailreader');
    const filterNodes = nodes.filter(node => node.type === 'filter');
    const formNodes = nodes.filter(node => node.type === 'form');
    const actionNodes = nodes.filter(node => node.type === 'action');

    // Workflow simülasyonu
    let message = 'Workflow Çalıştırılıyor:\n\n';
    
    if (triggerNodes.length > 0) {
      message += '1. ✅ Tetikleyici aktif - Yeni e-posta geldi\n';
    }
    
    if (mailReaderNodes.length > 0) {
      message += '2. 📬 Gmail okuyucu - E-posta içeriği okundu\n';
    }
    
    if (filterNodes.length > 0) {
      message += '3. 🔍 Filtre uygulandı - Öncelik kontrolü yapıldı\n';
    }
    
    if (formNodes.length > 0) {
      message += '4. 📝 Form gösterildi - Kullanıcı seçimi bekleniyor\n';
    }
    
    if (actionNodes.length > 0) {
      message += '5. ⚡ Aksiyon gerçekleştirildi - E-posta işlendi\n';
    }

    message += '\n✨ Workflow başarıyla tamamlandı!';
    alert(message);
  };

  return (
    <div className="w-full h-96 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
            className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm font-bold"
          >
            ▶️ Çalıştır
          </button>
          <button
            onClick={clearCanvas}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            🗑️ Temizle
          </button>
        </Panel>

        {/* Bilgi Paneli */}
        <Panel position="top-right">
          <div className="bg-white dark:bg-gray-700 p-3 rounded shadow-lg text-sm">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">📋 Workflow Bilgisi</h3>
            <p className="text-gray-600 dark:text-gray-400">Node'lar: {nodes.length}</p>
            <p className="text-gray-600 dark:text-gray-400">Bağlantılar: {edges.length}</p>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}