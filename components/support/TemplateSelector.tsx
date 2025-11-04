'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketTemplate {
  id: string;
  name: string;
  category: string;
  description_template: string;
  priority: string;
  custom_fields: Record<string, any> | null;
  usage_count: number;
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: {
    category: string;
    priority: string;
    description: string;
    custom_fields: Record<string, any> | null;
  }) => void;
  placeholders?: Record<string, string>;
}

export default function TemplateSelector({ onTemplateSelect, placeholders = {} }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const replacePlaceholders = (text: string, values: Record<string, string>): string => {
    let result = text;
    Object.entries(values).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Replace placeholders in description template
    const description = replacePlaceholders(template.description_template, placeholders);

    // Apply template to form
    onTemplateSelect({
      category: template.category,
      priority: template.priority,
      description,
      custom_fields: template.custom_fields,
    });

    // Increment usage count
    try {
      await supabase
        .from('ticket_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', templateId);
    } catch (error) {
      console.error('Error updating usage count:', error);
    }

    toast.success(`Applied template: ${template.name}`);
  };

  if (loading) {
    return (
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-gray-500" />
          Use Template
        </label>
        <div className="w-full h-9 px-3 text-sm bg-gray-50 border border-gray-300 rounded-lg flex items-center text-gray-400">
          Loading templates...
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-1.5">
        <FileText className="w-3.5 h-3.5 text-gray-500" />
        Use Template
      </label>
      <div className="relative">
        <select
          value={selectedTemplateId}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full h-9 px-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all appearance-none pr-8"
        >
          <option value="">Select a template (optional)</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.category} ({template.priority})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Choose a template to quickly fill in common ticket details
      </p>
    </div>
  );
}
