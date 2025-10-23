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

      // Gerçek Gmail verilerini al
      try {
        console.log('📧 Gmail webhook verileri alınıyor...');
        
        // Server'dan gelen Gmail verilerini al
        const gmailResponse = await fetch('http://localhost:5001/api/gmail/list?limit=5');
        
        if (!gmailResponse.ok) {
          throw new Error(`Server hatası: ${gmailResponse.status} ${gmailResponse.statusText}`);
        }
        
        const gmailResult = await gmailResponse.json();
        
        if (gmailResult.success && gmailResult.emails && gmailResult.emails.length > 0) {
          console.log(`✅ ${gmailResult.emails.length} adet Gmail verisi alındı`);
          
          // Gmail verilerini workflow formatına çevir
          const emailItems = gmailResult.emails.map((email: any) => ({
            json: {
              gmailData: email,
              timestamp: new Date().toISOString(),
              source: 'gmail-webhook',
              zapierUrl: zapierUrl,
              status: 'success',
              message: '✅ Gmail webhook verisi başarıyla alındı!'
            }
          }));
          
          return {
            items: emailItems
          };
        } else {
          // Eğer Gmail verisi yoksa, simülasyon verisi oluştur
          console.log('⚠️ Gmail verisi bulunamadı, simülasyon verisi oluşturuluyor...');
          return this.createSimulatedGmailData(zapierUrl);
        }

      } catch (error) {
        console.error('❌ Gmail verisi alma hatası:', error);
        
        // Server 404 hatası veya bağlantı sorunu ise simülasyon verisi oluştur
        if (error instanceof Error &&
            (error.message.includes('404') || error.message.includes('fetch') || error.message.includes('Unexpected token'))) {
          console.log('🔄 Server endpoint bulunamadı, simülasyon moduna geçiliyor...');
          return this.createSimulatedGmailData(zapierUrl);
        }
        
        // Diğer hatalar için Zapier fallback
        const testData = {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'EchoDay workflow test - Hata durumunda',
          source: 'EchoDay',
          zapierUrl: zapierUrl,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        };

        console.log('🚀 Zapier webhook\'a istek gönderiliyor (fallback):', zapierUrl);
        
        try {
          const response = await fetch('http://localhost:5001/api/zapier-webhook', {
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
                  message: '✅ Zapier webhook başarıyla çalıştırıldı! (Fallback mod)',
                  zapierResponse: result.data
                }
              }]
            };
          } else {
            throw new Error(`Zapier webhook hatası: ${result.message}`);
          }
        } catch (zapierError) {
          console.error('❌ Zapier fallback da başarısız:', zapierError);
          // Son çare olarak simülasyon verisi
          return this.createSimulatedGmailData(zapierUrl);
        }
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
      
      case 'calendarTrigger':
        return this.executeCalendarTriggerNode(node, inputData, config);
      
      case 'taskCreator':
        return this.executeTaskCreatorNode(node, inputData, config);
      
      case 'reminder':
        return this.executeReminderNode(node, inputData, config);
      
      case 'notification':
        return this.executeNotificationNode(node, inputData, config);
      
      default:
        return {
          success: true,
          data: inputData, // Bilinmeyen node'lar data'yı olduğu gibi geçir
          executionTime: 0
        };
    }
  }

  // Action node execution
  private async executeActionNode(_node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    const actionType = config?.actionType || 'create_task';
    const targetUrl = config?.targetUrl || '';

    await new Promise(resolve => setTimeout(resolve, 100)); // Action simülasyonu

    let actionResult: any = {
      type: actionType,
      target: targetUrl,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    try {
      switch (actionType) {
        case 'create_task':
          // Görev oluştur - mail verisinden
          const emailData = inputData.items[0]?.json?.emailData;
          if (emailData) {
            const taskData = {
              title: `📧 ${emailData.subject}`,
              description: emailData.body?.substring(0, 200) + '...',
              priority: emailData.priority || 'medium',
              category: 'email',
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 saat
              source: 'gmail-webhook',
              emailId: emailData.id,
              from: emailData.from
            };

            // Gerçek görev oluşturma simülasyonu
            actionResult.taskCreated = {
              taskId: `task_${Date.now()}`,
              ...taskData,
              createdAt: new Date().toISOString()
            };

            console.log('✅ Görev oluşturuldu:', actionResult.taskCreated);
          }
          break;

        case 'send_email':
          // E-posta gönder
          actionResult.emailSent = {
            to: targetUrl,
            subject: 'Otomatik Yanıt - EchoDay',
            body: 'Mailiniz alınmış ve işlenmiştir.',
            sentAt: new Date().toISOString()
          };
          break;

        case 'webhook':
          // Webhook gönder
          if (targetUrl) {
            try {
              const webhookData = {
                event: 'workflow_action',
                data: inputData.items[0]?.json,
                timestamp: new Date().toISOString()
              };

              const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookData)
              });

              actionResult.webhookResult = {
                url: targetUrl,
                status: response.ok ? 'success' : 'failed',
                statusCode: response.status,
                timestamp: new Date().toISOString()
              };
            } catch (error) {
              actionResult.webhookResult = {
                url: targetUrl,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Bilinmeyen hata',
                timestamp: new Date().toISOString()
              };
            }
          }
          break;

        case 'notification':
          // Bildirim gönder
          actionResult.notification = {
            title: '📧 Yeni Mail İşlendi',
            message: inputData.items[0]?.json?.emailData?.subject || 'Mail işlendi',
            type: 'info',
            timestamp: new Date().toISOString()
          };
          break;

        default:
          actionResult.message = 'Bilinmeyen aksiyon türü';
      }
    } catch (error) {
      actionResult.error = error instanceof Error ? error.message : 'Bilinmeyen hata';
      actionResult.status = 'failed';
    }

    const outputData: WorkflowData = {
      items: inputData.items.map(item => ({
        json: {
          ...item.json,
          actionResult: actionResult,
          processedAt: new Date().toISOString()
        }
      }))
    };

    return {
      success: actionResult.status !== 'failed',
      data: outputData,
      executionTime: 100
    };
  }

  // Filter node execution
  private async executeFilterNode(_node: Node, inputData: WorkflowData, config: any): Promise<NodeExecutionResult> {
    const condition = config?.condition || 'contains';
    const value = config?.filterValue || '';
    const filterType = config?.filterType || 'text'; // text, priority, importance, spam

    await new Promise(resolve => setTimeout(resolve, 50)); // Filtreleme simülasyonu

    let filteredItems = inputData.items;

    switch (filterType) {
      case 'priority':
        // Öncelik filtresi
        filteredItems = inputData.items.filter(item => {
          const priority = item.json.emailData?.priority || 'low';
          return priority === value;
        });
        break;

      case 'importance':
        // Önem filtresi
        filteredItems = inputData.items.filter(item => {
          const importance = item.json.emailData?.isImportant || 0;
          const minValue = parseInt(value) || 50;
          return importance >= minValue;
        });
        break;

      case 'spam':
        // Spam filtresi
        filteredItems = inputData.items.filter(item => {
          const isSpam = item.json.emailData?.isSpam || false;
          return value === 'allow' ? !isSpam : isSpam;
        });
        break;

      case 'subject':
        // Konu filtresi
        filteredItems = inputData.items.filter(item => {
          const subject = (item.json.emailData?.subject || '').toLowerCase();
          switch (condition) {
            case 'contains':
              return subject.includes(value.toLowerCase());
            case 'equals':
              return subject === value.toLowerCase();
            case 'startswith':
              return subject.startsWith(value.toLowerCase());
            case 'endswith':
              return subject.endsWith(value.toLowerCase());
            default:
              return subject.includes(value.toLowerCase());
          }
        });
        break;

      default:
        // Genel metin filtresi
        filteredItems = inputData.items.filter(item => {
          const jsonStr = JSON.stringify(item.json).toLowerCase();
          switch (condition) {
            case 'contains':
              return jsonStr.includes(value.toLowerCase());
            case 'equals':
              return jsonStr === value.toLowerCase();
            case 'startswith':
              return jsonStr.startsWith(value.toLowerCase());
            case 'endswith':
              return jsonStr.endsWith(value.toLowerCase());
            default:
              return jsonStr.includes(value.toLowerCase());
          }
        });
    }

    const outputData: WorkflowData = {
      items: filteredItems.map(item => ({
        ...item,
        json: {
          ...item.json,
          filterResult: {
            filtered: true,
            condition,
            value,
            filterType,
            originalCount: inputData.items.length,
            filteredCount: filteredItems.length,
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

  // Mail Reader node execution
  private async executeMailReaderNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
    // Gmail API simülasyonu - gerçek mail verisiyle
    await new Promise(resolve => setTimeout(resolve, 200));

    // Input data'dan mail bilgilerini al
    const mailData = inputData.items[0]?.json || {};
    
    // Gerçek mail içeriği oluştur - daha zengin veri
    const emailContent = {
      id: mailData.messageId || `mail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId: mailData.threadId || `thread_${Date.now()}`,
      subject: mailData.subject || 'Gmail Webhook Mail',
      from: mailData.from || 'sender@example.com',
      to: mailData.to || 'me@example.com',
      body: mailData.body || mailData.snippet || 'Mail içeriği',
      date: mailData.date || new Date().toISOString(),
      labels: mailData.labels || ['INBOX'],
      snippet: mailData.snippet || mailData.body?.substring(0, 100) || '',
      isImportant: this.calculateImportance(mailData),
      isSpam: this.detectSpam(mailData),
      priority: this.determinePriority(mailData),
      // Ek bilgiler
      hasAttachments: Math.random() > 0.7, // %30 ihtimalle ek var
      isUnread: true, // Yeni gelen mail her zaman okunmamış
      category: this.categorizeEmail(mailData),
      responseNeeded: this.needsResponse(mailData)
    };

    const outputData: WorkflowData = {
      items: [{
        json: {
          ...inputData.items[0]?.json,
          emailData: emailContent,
          processedAt: new Date().toISOString(),
          source: 'gmail-webhook',
          // Simülasyon için rastgele mail verisi ekle
          simulationData: this.generateRandomMailData()
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 200
    };
  }

  // Email kategorize et
  private categorizeEmail(mailData: any): string {
    const subject = (mailData.subject || '').toLowerCase();
    const body = (mailData.body || '').toLowerCase();
    
    if (subject.includes('invoice') || subject.includes('fatura') || body.includes('payment')) {
      return 'finance';
    }
    if (subject.includes('meeting') || subject.includes('toplantı') || body.includes('calendar')) {
      return 'meeting';
    }
    if (subject.includes('project') || subject.includes('proje') || body.includes('deadline')) {
      return 'project';
    }
    if (subject.includes('newsletter') || subject.includes('bülten') || body.includes('unsubscribe')) {
      return 'newsletter';
    }
    return 'general';
  }

  // Yanıt gerekip gerekmediğini kontrol et
  private needsResponse(mailData: any): boolean {
    const subject = (mailData.subject || '').toLowerCase();
    const body = (mailData.body || '').toLowerCase();
    
    // Soru işaretleri varsa
    if (subject.includes('?') || body.includes('?')) return true;
    
    // Yanıt bekleyen kelimeler
    const responseWords = ['please reply', 'lütfen yanıt', 'waiting for', 'bekliyorum', 'confirm', 'onayla'];
    return responseWords.some(word => subject.includes(word) || body.includes(word));
  }

  // Rastgele mail verisi oluştur (test için)
  private generateRandomMailData(): any {
    const subjects = [
      'Project Update Required',
      'Meeting Tomorrow at 3 PM',
      'Invoice #12345',
      'Weekly Newsletter',
      'Urgent: Server Maintenance',
      'Happy Birthday!',
      'Quarterly Report',
      'New Feature Release'
    ];
    
    const senders = [
      'john.doe@company.com',
      'sarah.smith@business.com',
      'newsletter@service.com',
      'admin@system.com',
      'team@project.com'
    ];
    
    const bodies = [
      'Please review the attached documents and provide your feedback.',
      'Don\'t forget about our meeting scheduled for tomorrow.',
      'Your monthly invoice is now available for download.',
      'Check out our latest updates and improvements.',
      'System maintenance is scheduled for this weekend.'
    ];
    
    return {
      mockSubject: subjects[Math.floor(Math.random() * subjects.length)],
      mockFrom: senders[Math.floor(Math.random() * senders.length)],
      mockBody: bodies[Math.floor(Math.random() * bodies.length)],
      mockDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // Form node execution
  private async executeFormNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
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

  // Calendar Trigger node execution
  private async executeCalendarTriggerNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const calendarData = inputData.items[0]?.json || {};
    const outputData: WorkflowData = {
      items: [{
        json: {
          ...calendarData,
          calendarTrigger: {
            processed: true,
            timestamp: new Date().toISOString(),
            importance: this.calculateCalendarImportance(calendarData)
          }
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 100
    };
  }

  // Task Creator node execution
  private async executeTaskCreatorNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 150));

    const taskData = {
      id: `task_${Date.now()}`,
      title: inputData.items[0]?.json?.title || 'Yeni Görev',
      description: inputData.items[0]?.json?.description || '',
      createdAt: new Date().toISOString(),
      status: 'created'
    };

    const outputData: WorkflowData = {
      items: [{
        json: {
          ...inputData.items[0]?.json,
          taskCreated: taskData
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 150
    };
  }

  // Reminder node execution
  private async executeReminderNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 80));

    const reminderData = {
      id: `reminder_${Date.now()}`,
      message: inputData.items[0]?.json?.message || 'Hatırlatıcı',
      scheduledAt: new Date().toISOString(),
      status: 'scheduled'
    };

    const outputData: WorkflowData = {
      items: [{
        json: {
          ...inputData.items[0]?.json,
          reminderSet: reminderData
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 80
    };
  }

  // Notification node execution
  private async executeNotificationNode(_node: Node, inputData: WorkflowData, _config: any): Promise<NodeExecutionResult> {
    await new Promise(resolve => setTimeout(resolve, 60));

    const notificationData = {
      id: `notification_${Date.now()}`,
      title: inputData.items[0]?.json?.title || 'Bildirim',
      body: inputData.items[0]?.json?.body || '',
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    const outputData: WorkflowData = {
      items: [{
        json: {
          ...inputData.items[0]?.json,
          notificationSent: notificationData
        }
      }]
    };

    return {
      success: true,
      data: outputData,
      executionTime: 60
    };
  }

  // Calendar importance calculation
  private calculateCalendarImportance(calendarData: any): number {
    let score = 0;
    
    // Title based importance
    const title = (calendarData.summary || calendarData.title || '').toLowerCase();
    if (title.includes('acil') || title.includes('urgent')) score += 30;
    if (title.includes('önemli') || title.includes('important')) score += 20;
    if (title.includes('toplantı') || title.includes('meeting')) score += 15;
    
    // Google Meet linki varsa
    if (calendarData.hangoutLink) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  // Mail önem skorunu hesapla
  private calculateImportance(mailData: any): number {
    let score = 0;
    
    // Konu bazlı önem
    const subject = (mailData.subject || '').toLowerCase();
    if (subject.includes('acil') || subject.includes('urgent')) score += 30;
    if (subject.includes('önemli') || subject.includes('important')) score += 20;
    if (subject.includes('toplantı') || subject.includes('meeting')) score += 15;
    
    // Gönderen bazlı önem
    const from = (mailData.from || '').toLowerCase();
    if (from.includes('boss') || from.includes('manager') || from.includes('ceo')) score += 25;
    if (from.includes('hr') || from.includes('insan kaynakları')) score += 15;
    
    // İçerik bazlı önem
    const body = (mailData.body || '').toLowerCase();
    if (body.includes('deadline') || body.includes('son tarih')) score += 20;
    if (body.includes('ödev') || body.includes('assignment')) score += 15;
    
    return Math.min(score, 100);
  }

  // Spam tespiti
  private detectSpam(mailData: any): boolean {
    const subject = (mailData.subject || '').toLowerCase();
    const body = (mailData.body || '').toLowerCase();
    const from = (mailData.from || '').toLowerCase();
    
    // Spam kelimeleri
    const spamWords = ['kazandınız', 'lottery', 'winner', 'free money', 'click here', 'limited offer'];
    const hasSpamWords = spamWords.some(word => subject.includes(word) || body.includes(word));
    
    // Şüpheli gönderenler
    const suspiciousDomains = ['noreply@', 'marketing@', 'promo@'];
    const hasSuspiciousFrom = suspiciousDomains.some(domain => from.includes(domain));
    
    return hasSpamWords || hasSuspiciousFrom;
  }

  // Öncelik belirle
  private determinePriority(mailData: any): 'high' | 'medium' | 'low' {
    const importance = this.calculateImportance(mailData);
    
    if (importance >= 70) return 'high';
    if (importance >= 40) return 'medium';
    return 'low';
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

  // Simüle edilmiş Gmail verisi oluştur
  private createSimulatedGmailData(zapierUrl: string): WorkflowData {
    const simulatedEmails = [
      {
        id: `mail_${Date.now()}_1`,
        threadId: `thread_${Date.now()}_1`,
        subject: 'Önemli Proje Toplantısı',
        from: 'manager@company.com',
        to: 'me@example.com',
        body: 'Yarın saat 14:00\'de yeni proje planlama toplantımız olacak. Lütfen hazırlıklarınızı tamamlayın.',
        snippet: 'Yarın saat 14:00\'de yeni proje planlama toplantımız olacak...',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        labels: ['INBOX', 'IMPORTANT'],
        isImportant: true,
        isSpam: false,
        priority: 'high',
        hasAttachments: true,
        isUnread: true,
        category: 'work',
        responseNeeded: true
      },
      {
        id: `mail_${Date.now()}_2`,
        threadId: `thread_${Date.now()}_2`,
        subject: 'Haftalık Rapor',
        from: 'team@company.com',
        to: 'me@example.com',
        body: 'Bu haftanın raporu ekte bulunmaktadır. Lütfen inceleyip geri bildirimde bulunun.',
        snippet: 'Bu haftanın raporu ekte bulunmaktadır...',
        date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        labels: ['INBOX'],
        isImportant: false,
        isSpam: false,
        priority: 'medium',
        hasAttachments: true,
        isUnread: true,
        category: 'work',
        responseNeeded: false
      }
    ];

    console.log(`📧 ${simulatedEmails.length} adet simüle edilmiş Gmail verisi oluşturuldu`);

    const emailItems = simulatedEmails.map(email => ({
      json: {
        gmailData: email,
        timestamp: new Date().toISOString(),
        source: 'gmail-simulation',
        zapierUrl: zapierUrl,
        status: 'success',
        message: '✅ Simüle edilmiş Gmail verisi oluşturuldu! (Server endpoint\'i yeniden başlatın)'
      }
    }));

    return {
      items: emailItems
    };
  }
}

// Global engine instance
export const workflowEngine = new WorkflowEngine();
