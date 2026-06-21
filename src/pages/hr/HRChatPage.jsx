import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FiMessageSquare, FiSend, FiChevronLeft, FiSearch } from 'react-icons/fi';
import { getInitials } from '../../utils/helpers';

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const HRChatPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);
  const selectedRef = useRef(null);
  const inputRef = useRef(null);

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
    inputRef.current?.focus();
  }, [selected, loadMessages]);

  useEffect(() => {
    if (!socket || !selected) return;
    const roomId = selected.employeeUser._id;
    socket.emit('join-chat-room', roomId);
    return () => socket.emit('leave-chat-room', roomId);
  }, [socket, selected]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const cur = selectedRef.current;
      if (cur && msg.employeeUser === cur.employeeUser._id) {
        setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        chatAPI.markRead({ employeeUserId: cur.employeeUser._id }).catch(() => {});
      } else {
        setThreads(prev => {
          const exists = prev.find(t => t.employeeUser._id === msg.employeeUser);
          if (exists) {
            return prev.map(t =>
              t.employeeUser._id === msg.employeeUser
                ? { ...t, lastMessage: msg.message, lastAt: msg.createdAt, unread: (t.unread || 0) + (msg.senderRole === 'employee' ? 1 : 0) }
                : t
            );
          }
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
        setMessages(prev => prev.some(m => m._id === r.data.data._id) ? prev : [...prev, r.data.data]);
      }
    } catch (_) {}
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);
  const filtered = threads.filter(t =>
    t.employeeUser.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.employeeUser.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">

      {/* Thread list */}
      <div className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${selected ? 'hidden md:flex md:w-72 lg:w-80' : 'w-full md:w-72 lg:w-80'}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Messages</h1>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-600 text-white text-xs font-bold">{totalUnread}</span>
            )}
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-primary-400 text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-3">
                <FiMessageSquare className="w-6 h-6 text-primary-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No conversations</p>
              <p className="text-xs text-gray-400 mt-1">Employee messages will appear here</p>
            </div>
          ) : filtered.map((thread) => (
            <button
              key={thread.employeeUser._id}
              onClick={() => setSelected(thread)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${selected?.employeeUser._id === thread.employeeUser._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-bold">
                  {getInitials(thread.employeeUser.name || 'U')}
                </div>
                {thread.unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">{thread.unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm truncate ${thread.unread > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                    {thread.employeeUser.name || 'Employee'}
                  </p>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(thread.lastAt)}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${thread.unread > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                  {thread.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message panel */}
      <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 ${selected ? 'flex' : 'hidden md:flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <FiMessageSquare className="w-9 h-9 text-primary-300" />
            </div>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">Choose an employee thread from the left to start replying</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
              <button onClick={() => { setSelected(null); setMessages([]); }} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                <FiChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-bold flex-shrink-0">
                {getInitials(selected.employeeUser.name || 'E')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{selected.employeeUser.name}</p>
                <p className="text-xs text-gray-400 truncate">{selected.employeeUser.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center pt-10"><div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                </div>
              ) : messages.map((msg, i) => {
                const isHR = msg.senderRole !== 'employee';
                return (
                  <div key={msg._id || i} className={`flex ${isHR ? 'justify-end' : 'justify-start'}`}>
                    {!isHR && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold mr-2 flex-shrink-0 mt-auto mb-0.5">
                        {getInitials(msg.senderName || 'E')}
                      </div>
                    )}
                    <div className={`max-w-[65%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      isHR
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-gray-700'
                    }`}>
                      {!isHR && <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-0.5">{msg.senderName}</p>}
                      <p className="leading-snug break-words">{msg.message}</p>
                      <p className={`text-[11px] mt-1 ${isHR ? 'text-primary-200 text-right' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Reply to ${selected.employeeUser.name?.split(' ')[0]}...`}
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
          </>
        )}
      </div>
    </div>
  );
};

export default HRChatPage;
