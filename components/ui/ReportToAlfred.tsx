'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bug, Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'alfred';
  text: string;
  timestamp: string;
  category?: 'bug' | 'feature' | 'data' | 'other';
}

const issueTypes = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'data', label: 'Data Issue', icon: AlertTriangle, color: 'text-orange-500' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'text-blue-500' },
];

export default function ReportToAlfred() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedType, setSelectedType] = useState<string>('bug');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('alfred-chat-messages');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('alfred-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      category: selectedType as Message['category'],
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate Alfred's auto-reply after a short delay
    setTimeout(() => {
      const alfredReply: Message = {
        id: (Date.now() + 1).toString(),
        type: 'alfred',
        text: `Thanks for reporting this ${selectedType}! I've received your message and will investigate. You can check back here for updates, or I'll reach out via WhatsApp if immediate action is needed.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, alfredReply]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (category: string) => {
    const type = issueTypes.find(t => t.id === category);
    return type ? <type.icon size={12} className={type.color} /> : null;
  };

  return (
    <>
      {/* Report to Alfred Button */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg shadow-lg hover:bg-brand-blue/90 transition-colors text-sm font-medium"
        >
          <span className="text-lg">🎩</span>
          Report to Alfred
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:inset-auto lg:bottom-20 lg:left-4 lg:right-auto lg:top-auto">
          {/* Mobile backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat container */}
          <div className="absolute inset-4 lg:inset-auto lg:w-96 lg:h-[500px] bg-bg-surface border border-border rounded-lg shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎩</span>
                <h3 className="text-sm font-semibold text-text-primary">Chat with Alfred</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-text-secondary py-8">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet. Report any issues or requests!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-brand-blue text-white'
                          : 'bg-bg-elevated border border-border text-text-primary'
                      }`}
                    >
                      {message.type === 'user' && message.category && (
                        <div className="flex items-center gap-1 mb-1 opacity-80">
                          {getTypeIcon(message.category)}
                          <span className="text-xs">
                            {issueTypes.find(t => t.id === message.category)?.label}
                          </span>
                        </div>
                      )}
                      <p className="leading-relaxed">{message.text}</p>
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-white/70' : 'text-text-tertiary'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Issue Type Selector */}
            <div className="px-4 py-2 border-t border-border">
              <div className="flex gap-1 flex-wrap">
                {issueTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedType === type.id
                        ? 'bg-brand-blue/15 text-brand-blue-light'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <type.icon size={12} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Describe your ${issueTypes.find(t => t.id === selectedType)?.label.toLowerCase()}...`}
                  className="flex-1 bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-blue resize-none"
                  rows={2}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}