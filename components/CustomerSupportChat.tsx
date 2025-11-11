'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Paperclip, Loader2, CheckCircle2, Smile } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
}

const HUMOROUS_PLACEHOLDERS = [
  "Describe your issue and we'll help you out...",
  "What can we help you with today?",
  "Tell us what's on your mind...",
  "How can we assist you?",
  "Share your question or concern...",
];

const LOADING_MESSAGES = [
  "Sending your message to the team... ☕",
  "Creating your support ticket...",
  "Almost there, just a moment...",
  "Processing your request... 📝",
  "Notifying our support team...",
];

export default function CustomerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<any>(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Rotate placeholder text
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('customer-support-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setMessage(parsed.message || '');
        if (parsed.name || parsed.email || parsed.message) {
          toast('Draft restored', { icon: '📝', duration: 2000 });
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % HUMOROUS_PLACEHOLDERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (submitting) {
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [submitting]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedFiles: any[] = [];

      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max 10MB per file.`);
          continue;
        }

        // Upload to Supabase storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `support-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('public')
          .upload(filePath, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        });
      }

      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} file(s) uploaded`);
    } catch (error: any) {
      toast.error('Failed to upload files');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("What should we call you? 'Hey You' works too! 👋");
      return;
    }

    if (!email.trim()) {
      toast.error('We need your email to respond! 📧');
      return;
    }

    if (!message.trim()) {
      toast.error('Please type your message (telepathy is down for maintenance) 🔮');
      return;
    }

    setSubmitting(true);
    setLoadingMessageIndex(0);

    try {
      const response = await fetch('/api/customer-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          attachments
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.humorousMessage || data.error || 'Failed to send message');
      }

      // Show success with humorous message
      setSuccessMessage(data.humor);
      setTicketNumber(data.ticketNumber);
      setShowSuccess(true);

      // Show success toast notification
      toast.success(`Message sent! Ticket #${data.ticketNumber}`, {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '500',
        },
        icon: '✓',
      });

      // Reset form and clear draft
      setName('');
      setEmail('');
      setMessage('');
      setAttachments([]);
      localStorage.removeItem('customer-support-draft');

      // Auto-close after 8 seconds (increased for better UX)
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 8000);

    } catch (error: any) {
      console.error('Customer support submission error:', error);
      toast.error(error.message || 'Failed to send message. Please try again!');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-save draft when fields change
  useEffect(() => {
    if (name || email || message) {
      const draft = { name, email, message };
      localStorage.setItem('customer-support-draft', JSON.stringify(draft));
      setDraftSaved(true);

      // Show draft saved indicator briefly
      const timer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [name, email, message]);

  const toggleWidget = () => {
    // Save draft when closing
    if (isOpen && (name || email || message)) {
      const draft = { name, email, message };
      localStorage.setItem('customer-support-draft', JSON.stringify(draft));
      toast.success('Draft saved', { duration: 2000 });
    }
    setIsOpen(!isOpen);
    setShowSuccess(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-accent-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
          aria-label="Open support chat"
          title="Need help? Chat with us"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <style jsx>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-accent-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Customer Support</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-xs text-white/90">We're here to help</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {draftSaved && (
                <span className="text-xs text-white/80 bg-white/20 px-2 py-1 rounded-full">
                  Draft saved
                </span>
              )}
              <button
                onClick={toggleWidget}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors text-white"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {showSuccess ? (
              /* Success State */
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {successMessage?.title || "Success! 🎉"}
                </h3>
                <p className="text-gray-700 mb-2 leading-relaxed">
                  {successMessage?.message}
                </p>
                <p className="text-sm text-gray-500 italic mb-4">
                  {successMessage?.subtitle}
                </p>
                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 mb-1">Your Reference Number</p>
                  <p className="text-sm font-mono font-semibold text-blue-700">
                    #{ticketNumber}
                  </p>
                </div>
                <button
                  onClick={toggleWidget}
                  className="mt-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all"
                >
                  Got it! 👍
                </button>
                <p className="text-xs text-gray-400 mt-4">
                  This window will close automatically in 8 seconds
                </p>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Welcome Message */}
                <div className="bg-blue-50 border border-neutral-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">
                    👋 Hi there! Send us a message and we'll get back to you shortly. We promise we're real people (mostly).
                  </p>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should we call you?"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={HUMOROUS_PLACEHOLDERS[placeholderIndex]}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={submitting}
                  />
                </div>

                {/* File Upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.log,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || submitting}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Attach Files'}
                  </button>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          <span className="flex-1 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Loading Message */}
                {submitting && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-yellow-800 font-medium">
                      {LOADING_MESSAGES[loadingMessageIndex]}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending your message...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              We'll get back to you as soon as we can (probably within a few days)
            </p>
          </div>
        </div>
      )}

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={toggleWidget}
        />
      )}
    </>
  );
}
