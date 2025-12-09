/**
 * MessageBubble - User/AI/System message display with animations
 */

'use client';

import { motion } from 'framer-motion';
import { User, Bot, Info } from 'lucide-react';
import type { Message } from './useConversation';
import { ThinkingDots } from './ThinkingIndicator';

const messageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
  children?: React.ReactNode; // For AI response content (actions)
}

export function MessageBubble({ message, isLatest, children }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // User message - right aligned, orange accent
  if (message.type === 'user') {
    return (
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex justify-end"
      >
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="flex items-center justify-end gap-2.5 mb-1.5">
            <span className="text-[11px] text-gray-500">{formatTime(message.timestamp)}</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600
              flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white
            rounded-2xl rounded-tr-md px-5 py-4 shadow-md">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // System message - centered, subtle
  if (message.type === 'system') {
    return (
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex justify-center"
      >
        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-gray-100 rounded-full
          border border-gray-200 shadow-sm">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-600">{message.content}</span>
        </div>
      </motion.div>
    );
  }

  // AI message - left aligned, subtle gray tint for distinction
  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex justify-start"
    >
      <div className="max-w-[85%] md:max-w-[75%]">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700
            flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-semibold text-gray-700">Command Center</span>
          <span className="text-[11px] text-gray-500">{formatTime(message.timestamp)}</span>
        </div>
        <div className="bg-gray-50 rounded-2xl rounded-tl-md px-5 py-4
          shadow-sm border border-gray-200">
          {message.status === 'thinking' ? (
            <div className="flex items-center gap-3 py-1">
              <ThinkingDots />
              <span className="text-sm text-gray-500">Analyzing...</span>
            </div>
          ) : message.content ? (
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-4">
              {message.content}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </motion.div>
  );
}

// Compact version for inline display
export function CompactMessageBubble({
  content,
  type,
}: {
  content: string;
  type: 'user' | 'ai';
}) {
  if (type === 'user') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-100 text-accent-700
        rounded-lg text-xs border border-accent-200 shadow-sm">
        <User className="w-3.5 h-3.5" />
        <span className="truncate max-w-[200px]">{content}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700
      rounded-lg text-xs border border-gray-200 shadow-sm">
      <Bot className="w-3.5 h-3.5" />
      <span className="truncate max-w-[200px]">{content}</span>
    </div>
  );
}

export default MessageBubble;
