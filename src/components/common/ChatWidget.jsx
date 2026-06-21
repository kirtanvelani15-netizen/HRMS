import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FiMessageSquare, FiSend, FiChevronLeft } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// ── Employee view ─────────────────────────────────────────────────────────────
const EmployeeChat = ({ user, onUnreadChange }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await chatAPI.getMessages();
      if (r.data.success) setMessages(r.data.data);
      await chatAPI.markRead({});
      onUnreadChange(0);
    } catch (_) {}
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  // Real-time: listen for incoming messages on this employee's room
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages(prev => {
        // Avoid duplicate if we already appended optimistically
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Mark as read immediately since the chat is open
      chatAPI.markRead({}).catch(() => {});
      onUnreadChange(0);
    };
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket, onUnreadChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const r = await chatAPI.sendMessage({ message: text });
      if (r.data.success) {
        setMessages(prev => {
          if (prev.some(m => m._id === r.data.data._id)) return prev;
          return [...prev, r.data.data];
        });
      }
    } catch (_) {}
    setSending(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 rounded-t-2xl">
        <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">HR</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">HR Support</p>
          <p className="text-primary-200 text-xs mt-0.5">Ask us anything</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Online" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
              <FiMessageSquare className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat with HR</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to get started</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderRole === 'employee';
          return (
            <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold mr-1.5 flex-shrink-0 mt-auto mb-0.5">HR</div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                isMe
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700'
              }`}>
                <p className="leading-snug break-words">{msg.message}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-primary-200 text-right' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-2xl">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            className="flex-1 resize-none text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-400 max-h-24"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <FiSend className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HR/Admin view ─────────────────────────────────────────────────────────────
const HRChat = ({ user }) => {
  const { socket } = useSocket();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef(null);
  const selectedRef = useRef(null); // keep selected in sync for socket handler

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const loadThreads = useCallback(async () => {
    try {
      const r = await chatAPI.getMessages();
      if (r.data.success) setThreads(r.data.data);
    } catch (_) {}
  }, []);

  const loadMessages = useCallback(async (empUserId) => {
    setLoadingMsgs(true);
    try {
      const r = await chatAPI.getMessages({ employeeUserId: empUserId });
      if (r.data.success) setMessages(r.data.data);
      await chatAPI.markRead({ employeeUserId: empUserId });
      setThreads(prev => prev.map(t =>
        t.employeeUser._id === empUserId ? { ...t, unread: 0 } : t
      ));
    } catch (_) {}
    setLoadingMsgs(false);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.employeeUser._id);
  }, [selected, loadMessages]);

  // Join/leave the chat room when HR opens/closes a thread
  useEffect(() => {
    if (!socket || !selected) return;
    const roomId = selected.employeeUser._id;
    socket.emit('join-chat-room', roomId);
    return () => socket.emit('leave-chat-room', roomId);
  }, [socket, selected]);

  // Real-time: receive messages for the open thread OR update thread list for others
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const cur = selectedRef.current;
      if (cur && msg.employeeUser === cur.employeeUser._id) {
        // Message is for the open thread — append it
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        // Mark read since thread is open
        chatAPI.markRead({ employeeUserId: cur.employeeUser._id }).catch(() => {});
      } else {
        // Message for another thread — update thread list unread/preview
        setThreads(prev => {
          const exists = prev.find(t => t.employeeUser._id === msg.employeeUser);
          if (exists) {
            return prev.map(t =>
              t.employeeUser._id === msg.employeeUser
                ? { ...t, lastMessage: msg.message, lastAt: msg.createdAt, unread: (t.unread || 0) + (msg.senderRole === 'employee' ? 1 : 0) }
                : t
            );
          }
          // New thread from a new employee — reload the list
          loadThreads();
          return prev;
        });
      }
    };
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket, loadThreads]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !selected) return;
    setSending(true);
    setInput('');
    try {
      const r = await chatAPI.sendMessage({ message: text, employeeUserId: selected.employeeUser._id });
      if (r.data.success) {
        setMessages(prev => {
          if (prev.some(m => m._id === r.data.data._id)) return prev;
          return [...prev, r.data.data];
        });
      }
    } catch (_) {}
    setSending(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);

  if (!selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 bg-primary-600 rounded-t-2xl">
          <p className="text-white font-semibold text-sm">Employee Queries</p>
          <p className="text-primary-200 text-xs mt-0.5">{threads.length} conversation{threads.length !== 1 ? 's' : ''}{totalUnread > 0 ? ` · ${totalUnread} unread` : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                <FiMessageSquare className="w-5 h-5 text-primary-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Employee queries will appear here</p>
            </div>
          ) : threads.map((thread, i) => (
            <button
              key={thread.employeeUser._id || i}
              onClick={() => setSelected(thread)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                {getInitials(thread.employeeUser.name || 'U')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{thread.employeeUser.name || 'Employee'}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(thread.lastAt)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{thread.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 bg-primary-600 rounded-t-2xl">
        <button onClick={() => { setSelected(null); setMessages([]); }} className="p-1 rounded-lg hover:bg-primary-500 text-white transition-colors">
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(selected.employeeUser.name || 'E')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none truncate">{selected.employeeUser.name}</p>
          <p className="text-primary-200 text-xs mt-0.5 truncate">{selected.employeeUser.email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50 dark:bg-gray-900">
        {loadingMsgs && messages.length === 0 && (
          <div className="flex justify-center pt-6"><div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
        )}
        {messages.map((msg, i) => {
          const isHR = msg.senderRole !== 'employee';
          return (
            <div key={msg._id || i} className={`flex ${isHR ? 'justify-end' : 'justify-start'}`}>
              {!isHR && (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold mr-1.5 flex-shrink-0 mt-auto mb-0.5">
                  {getInitials(msg.senderName || 'E')}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                isHR
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700'
              }`}>
                {!isHR && <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-0.5">{msg.senderName}</p>}
                <p className="leading-snug break-words">{msg.message}</p>
                <p className={`text-xs mt-1 ${isHR ? 'text-primary-200 text-right' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2.5 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-2xl">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Reply to ${selected.employeeUser.name?.split(' ')[0]}...`}
            className="flex-1 resize-none text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-400 max-h-24"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <FiSend className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ChatWidget ───────────────────────────────────────────────────────────
const ChatWidget = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const hoverTimer = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    chatAPI.getUnreadCount().then(r => {
      if (r.data.success) setUnread(r.data.count);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (!open) {
        const isIncoming = user?.role === 'employee'
          ? msg.senderRole !== 'employee'
          : msg.senderRole === 'employee';
        if (isIncoming) setUnread(prev => prev + 1);
      }
    };
    socket.on('chat-message', handler);
    return () => socket.off('chat-message', handler);
  }, [socket, open, user]);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimer.current);
    setOpen(true);
    if (user?.role === 'employee') setUnread(0);
  };

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  if (!user || user.role === 'admin') return null;

  return (
    <div
      ref={wrapperRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Chat panel */}
      {open && (
        <div className="w-80 h-[480px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
          {user.role === 'employee'
            ? <EmployeeChat user={user} onUnreadChange={setUnread} />
            : <HRChat user={user} />
          }
        </div>
      )}

      {/* Bubble */}
      <button
        className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative"
        title={user.role === 'employee' ? 'Chat with HR' : 'Employee Queries'}
      >
        <FiMessageSquare className="w-6 h-6 text-white" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1 shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatWidget;
