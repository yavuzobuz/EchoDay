// N8N tarzı Workflow Execution Engine
import { Node, Edge } from 'reactflow';

// N8N tarzı data structure - her node arası veri array of objects
export interface WorkflowData {
  items: Array<{
    json: Record<string, any>;
    binary?: Record<string, any>;
  }>;
}

// Node execution sonucu
export interface NodeExecutionResult {
  success: boolean;
  data: WorkflowData;
  error?: string;
  executionTime: number;
}

// Workflow execution durumu
export interface WorkflowExecution {
  id: string;
  status: 'waiting' | 'running' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
  nodeResults: Record<string, NodeExecutionResult>;
  totalExecutionTime?: number;
}

export class WorkflowEngine {
  private executions: Map<string, WorkflowExecution> = new Map();

  // Workflow'u çalıştır (N8N tarzı)
  async executeWorkflow(
    nodes: Node[], 
    edges: Edge[], 
    nodeConfigs: Record<string, any>
  ): Promise<WorkflowExecution> {
    const executionId = `exec_${Date.now()}`;
    const execution: WorkflowExecution = {
      id: executionId,
      status: 'running',
      startTime: new Date(),
      nodeResults: {}
    };

    this.executions.set(executionId, execution);

    try {
      // 1. Trigger node'u bul (N8N'de workflow trigger ile başlar)
      const triggerNode = nodes.find(node => node.type === 'trigger');
      if (!triggerNode) {
        throw new Error('Workflow\'da trigger node bulunamadı!');
      }

      // 2. Node execution sırasını belirle (topological sort)
      const executionOrder = this.getExecutionOrder(nodes, edges);
      
      // 3. İlk data'yı trigger'dan al
      // nodeConfigs'den al, yoksa node.data.config'den al
      const triggerConfig = nodeConfigs[triggerNode.id] || triggerNode.data.config || {};
      console.log('✅ Trigger konfigürasyonu yüklendi:', { 
        zapierWebhookUrl: triggerConfig?.zapierWebhookUrl?.substring(0, 50) + '...',
        mode: triggerConfig?.mode || 'zapier'
      });
      let currentData: WorkflowData = await this.executeTriggerNode(triggerNode, triggerConfig);

      // 4. Node'ları sırayla çalıştır
      for (const nodeId of executionOrder) {
        if (nodeId === triggerNode.id) continue; // Trigger zaten çalıştı

        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const startTime = Date.now();
        
        try {
          // Node'u çalıştır ve sonucu al
          // nodeConfigs'den al, yoksa node.data.config'den al
          const nodeConfig = nodeConfigs[nodeId] || node.data.config || {};
          const result = await this.executeNode(node, currentData, nodeConfig);
          
          execution.nodeResults[nodeId] = {
            ...result,
            executionTime: Date.now() - startTime
          };

          if (!result.success) {
            execution.status = 'failed';
            break;
          }

          // Sonraki node için data'yı güncelle
          currentData = result.data;

        } catch (error) {
          execution.nodeResults[nodeId] = {
            success: false,
            data: currentData,
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
            executionTime: Date.now() - startTime
          };
          execution.status = 'failed';
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'success';
      }

    } catch (error) {
      execution.status = 'failed';
      console.error('Workflow execution hatası:', error);
    }

    execution.endTime = new Date();
    execution.totalExecutionTime = execution.endTime.getTime() - execution.startTime.getTime();

    return execution;
  }

  // Trigger node'u çalıştır
  private async executeTriggerNode(node: Node, config: any): Promise<WorkflowData> {
    // Mod kontrolü - Zapier veya API
    const mode = config?.mode || 'zapier';
    
    if (mode === 'zapier') {
      // Zapier webhook modu
      // zapierWebhookUrl field'ını kullan ve temizle
      const zapierUrl = (config?.zapierWebhookUrl || config?.webhookUrl || '').trim().replace(/`/g, '');
      
      if (!zapierUrl) {
        throw new Error('❌ Zapier webhook URL\'i eksik!\n\n📝 Nasıl düzeltilir:\n1. Trigger node\'una çift tıklayın\n2. Webhook URL alanına Zapier URL\'inizi girin\n3. Kaydet butonuna tıklayın\n\n💡 Zapier URL örneği:\nhttps://hooks.zapier.com/hooks/catch/...');
      }

      // Zapier webhook simülasyonu (CORS sorunu nedeniyle)
      try {
        const testData = {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'EchoDay workflow test',
          source: 'EchoDay',
          zapierUrl: zapierUrl
        };

        // Proxy server üzerinden gerçek Zapier webhook isteği
        console.log('🚀 Zapier webhook\'a istek gönderiliyor:', zapierUrl);
        console.log('📤 Gönderilecek data:', testData);
        
        const response = await fetch('http://localhost:3001/api/zapier-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookUrl: zapierUrl,
            data: testData
          })
        });

        const result = await response.json();
        
        if (result.success) {
          return {
            items: [{
              json: {
                zapierSuccess: true,
                zapierUrl: zapierUrl,
                testData: testData,
                status: 'success',
                timestamp: new Date().toISOString(),
                message: '✅ Zapier webhook başarıyla çalıştırıldı!',
                zapierResponse: result.data
              }
            }]
          };
        } else {
          throw new Error(`Zapier webhook hatası: ${result.message}`);
        }

      } catch (error) {
        throw new Error(`Zapier simülasyon hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
      
    } else {
      // API modu (eski sistem)
      const triggerData = {
        triggerType: config?.httpMethod || 'GET',
        webhookUrl: config?.webhookUrl || '',
        timestamp: new Date().toISOString(),
        nodeId: node.id
      };

      return {
        items: [{
          json: triggerData
        }]
      };
    }
  }

  // Normal node'u çalıştır
  private async executeNode(node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    switch (node.type) {
      case 'action':
        return this.executeActionNode(node, inputData, config);
      
      case 'filter':
        return this.executeFilterNode(node, inputData, config);
      
      case 'mailreader':
        return this.executeMailReaderNode(node, inputData, config);
      
      case 'form':
        return this.executeFormNode(node, inputData, config);
      
      default:
        return {
          success: true,
          data: inputData, // Bilinmeyen node'lar data'yı olduğu gibi geçir
          executionTime: 0
        };
    }
  }

  // Action node execution
  private async executeActionNode(node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    const actionType = config?.actionType || 'http';
    const targetUrl = config?.targetUrl || '';

    // Simüle edilmiş action execution
    await new Promise(resolve => setTimeout(resolve, 100)); // API call simülasyonu

    const outputData: WorkflowData = {
      items: inputData.items.map(item => ({
        json: {
          ...item.json,
          actionResult: {
            type: actionType,
            target: targetUrl,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        }
      }))
    };

    return {
      success: true,
      data: outputData,
      executionTime: 100
    };
  }

  // Filter node execution
  private async executeFilterNode(node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    const condition = config?.condition || 'contains';
    const value = config?.value || '';

    // Basit filtreleme mantığı
    const filteredItems = inputData.items.filter(item => {
      // Örnek: JSON içinde value'yu ara
      const jsonStr = JSON.stringify(item.json).toLowerCase();
      return jsonStr.includes(value.toLowerCase());
    });

    return {
      success: true,
      data: { items: filteredItems },
      executionTime: 10
    };
  }

  // Mail Reader node execution
  private async executeMailReaderNode(node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    // Gmail API simülasyonu
    await new Promise(resolve => setTimeout(resolve, 200));

    const outputData: WorkflowData = {
      items: [{
        json: {
          ...inputData.items[0]?.json,
          emailData: {
            subject: 'Test Email',
            from: 'test@example.com',
            body: 'Bu bir test email\'idir',
            timestamp: new Date().toISOString()
          }
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 200
    };
  }

  // Form node execution
  private async executeFormNode(node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    const outputData: WorkflowData = {
      items: inputData.items.map(item => ({
        json: {
          ...item.json,
          formData: {
            processed: true,
            timestamp: new Date().toISOString()
          }
        }
      }))
    };

    return {
      success: true,
      data: outputData,
      executionTime: 50
    };
  }

  // Node execution sırasını belirle (topological sort)
  private getExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Graph oluştur
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // In-degree 0 olan node'ları queue'ya ekle
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      graph.get(current)?.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }

  // Execution sonuçlarını al
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Tüm execution'ları al
  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }
}

// Global engine instance
export const workflowEngine = new WorkflowEngine();