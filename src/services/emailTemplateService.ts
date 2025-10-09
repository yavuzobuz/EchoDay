import { EmailTemplate } from '../types/mail';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'emailTemplates';

class EmailTemplateService {
  // Get all templates
  getTemplates(): EmailTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : this.getDefaultTemplates();
    } catch (error) {
      console.error('Error loading templates:', error);
      return this.getDefaultTemplates();
    }
  }

  // Get default templates (first time)
  private getDefaultTemplates(): EmailTemplate[] {
    const defaults: EmailTemplate[] = [
      {
        id: uuidv4(),
        name: 'Teşekkür',
        subject: 'Teşekkürler',
        body: '<p>Merhaba,</p><p>Mesajınız için teşekkür ederim.</p><p>İyi günler,</p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: 'Toplantı Talebi',
        subject: 'Toplantı Talebi',
        body: '<p>Merhaba,</p><p>Aşağıdaki konuları görüşmek için bir toplantı yapmak isterim:</p><ul><li>Konu 1</li><li>Konu 2</li></ul><p>Uygun olduğunuz bir zaman dilimini paylaşabilir misiniz?</p><p>Teşekkürler,</p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: 'Bilgi Talebi',
        subject: 'Bilgi Talebi',
        body: '<p>Merhaba,</p><p>Aşağıdaki konular hakkında bilgi alabilir miyim:</p><p>[Konuyu buraya yazın]</p><p>Yardımlarınız için şimdiden teşekkür ederim.</p><p>Saygılarımla,</p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    this.saveTemplates(defaults);
    return defaults;
  }

  // Get template by ID
  getTemplate(id: string): EmailTemplate | undefined {
    return this.getTemplates().find(t => t.id === id);
  }

  // Save template
  saveTemplate(template: Partial<EmailTemplate>): EmailTemplate {
    const templates = this.getTemplates();
    const now = new Date().toISOString();

    if (template.id) {
      // Update existing
      const index = templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        templates[index] = {
          ...templates[index],
          ...template,
          updatedAt: now,
        } as EmailTemplate;
        this.saveTemplates(templates);
        return templates[index];
      }
    }

    // Create new
    const newTemplate: EmailTemplate = {
      id: uuidv4(),
      name: template.name || 'Yeni Şablon',
      subject: template.subject || '',
      body: template.body || '',
      createdAt: now,
      updatedAt: now,
    };

    templates.push(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  // Delete template
  deleteTemplate(id: string): void {
    const templates = this.getTemplates().filter(t => t.id !== id);
    this.saveTemplates(templates);
  }

  // Save all templates to localStorage
  private saveTemplates(templates: EmailTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }
}

export const emailTemplateService = new EmailTemplateService();
