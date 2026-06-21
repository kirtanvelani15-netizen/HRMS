import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FiMessageSquare, FiSend } from 'react-icons/fi';

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const EmployeeChatPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await chatAPI.getMessages();
      if (r.data.success) setMessages(r.data.data);
      await chatAPI.markRead({});
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
      chatAPI.markRead({}).catch(() => {});
    };
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const r = await chatAPI.sendMessage({ message: text });
      if (r.data.success) {
        setMessages(prev => prev.some(m => m._id === r.data.data._id) ? prev : [...prev, r.data.data]);
      }
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-primary-600 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">HR</div>
        <div className="flex-1">
          <p className="text-white font-semibold">HR Support</p>
          <p className="text-primary-200 text-xs">We usually reply within a few minutes</p>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" title="Online" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 dark:bg-gray-950">
        {loading ? (
          <div className="flex justify-center pt-10"><div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <FiMessageSquare className="w-7 h-7 text-primary-300" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Chat with HR</p>
            <p className="text-sm text-gray-400 mt-1">Ask anything — leave, salary, attendance, or anything else.</p>
          </div>
        ) : messages.map((msg, i) => {
          const isMe = msg.senderRole === 'employee';
          return (
            <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-auto mb-0.5">HR</div>
              )}
              <div className={`max-w-[65%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                isMe
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700'
              }`}>
                <p className="leading-snug break-words">{msg.message}</p>
                <p className={`text-[11px] mt-1 ${isMe ? 'text-primary-200 text-right' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message..."
            className="flex-1 resize-none text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-400 max-h-32"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <FiSend className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default EmployeeChatPage;
