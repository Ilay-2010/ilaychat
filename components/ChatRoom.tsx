
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Message, Profile } from '../types';
import { format } from 'date-fns';
import { User } from '@supabase/supabase-js';
import { encryptContent, decryptContent } from '../services/crypto';

interface ChatRoomProps {
  user: User;
  userIp: string;
  recipient: Profile | null; // null means Global Chat
  onBack: () => void;
  chatBg: string;
  bubbleColor: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  message: Message;
}

const REACTIONS = ['🥀', '❤️', '😂', '💀', '👍'];

export const ChatRoom: React.FC<ChatRoomProps> = ({ user, userIp, recipient, onBack, chatBg, bubbleColor }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserDisplayName = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  const isGlobal = !recipient;

  // AUTO-FOCUS AFTER COOLDOWN
  useEffect(() => {
    if (!cooldown && !loading) {
      inputRef.current?.focus();
    }
  }, [cooldown, loading]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      let query = supabase.from('messages').select('*');
      
      if (isGlobal) {
        query = query.is('receiver_id', null);
      } else {
        query = query.or(`and(user_id.eq.${user.id},receiver_id.eq.${recipient.id}),and(user_id.eq.${recipient.id},receiver_id.eq.${user.id})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true }).limit(100);
      
      if (!error && data) {
        const decrypted = data.map(m => ({
          ...m,
          content: decryptContent(m.content)
        }));
        setMessages(decrypted as Message[]);
      }
      setLoading(false);
    };

    fetchMessages();

    const channelId = isGlobal ? 'global-chat' : `chat-${recipient?.id}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const nm = payload.new as Message;
          const isForThisRoom = isGlobal 
            ? nm.receiver_id === null 
            : (nm.user_id === user.id && nm.receiver_id === recipient?.id) || (nm.user_id === recipient?.id && nm.receiver_id === user.id);

          if (isForThisRoom) {
            nm.content = decryptContent(nm.content);
            setMessages(prev => [...prev.filter(m => m.id !== nm.id), nm]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const nm = payload.new as Message;
          nm.content = decryptContent(nm.content);
          setMessages(prev => prev.map(m => m.id === nm.id ? nm : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [recipient?.id, user.id, isGlobal]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || cooldown) return;

    const rawContent = newMessage.trim();
    const encrypted = encryptContent(rawContent);
    const replyId = replyingTo?.id || null;
    
    setNewMessage('');
    setReplyingTo(null);
    setCooldown(true);
    setError(null);

    const { error: sendError } = await supabase.from('messages').insert([
      { 
        username: currentUserDisplayName, 
        content: encrypted, 
        user_id: user.id,
        receiver_id: recipient?.id || null,
        ip: userIp,
        reply_to_id: replyId
      }
    ]);

    if (sendError) {
      setError("Secure channel error. Please try again.");
    }
    
    setTimeout(() => {
      setCooldown(false);
    }, 1500);
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const toggleReaction = async (msgId: number, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const users = currentReactions[emoji] || [];
    const newUsers = users.includes(user.id) 
      ? users.filter(id => id !== user.id) 
      : [...users, user.id];

    const updatedReactions = { ...currentReactions };
    if (newUsers.length === 0) delete updatedReactions[emoji];
    else updatedReactions[emoji] = newUsers;

    await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', msgId);
    setContextMenu(null);
  };

  const handleDelete = async (id: number) => {
    await supabase.from('messages').delete().eq('id', id);
    setContextMenu(null);
  };

  const findRepliedMessage = (id: number | null | undefined) => {
    if (!id) return null;
    return messages.find(m => m.id === id);
  };

  return (
    <div className="h-full flex flex-col transition-colors duration-300" style={{ backgroundColor: chatBg }}>
      {contextMenu && (
        <div 
          className="fixed z-[10000] bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-xl py-1 min-w-[180px] animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1 px-3 py-2 border-b border-white/5">
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => toggleReaction(contextMenu.message.id, emoji)} className="hover:scale-125 transition-transform text-lg">
                {emoji}
              </button>
            ))}
          </div>
          <button 
            onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }}
            className="w-full text-left px-4 py-3 text-[11px] text-white hover:bg-white/5 uppercase font-bold tracking-widest flex items-center justify-between"
          >
            Reply
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          {contextMenu.message.user_id === user.id && (
            <button 
              onClick={() => handleDelete(contextMenu.message.id)}
              className="w-full text-left px-4 py-3 text-[11px] text-red-500 hover:bg-red-500/5 uppercase font-bold tracking-widest border-t border-white/5"
            >
              Delete
            </button>
          )}
        </div>
      )}

      <div className="flex-none px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter">
              {isGlobal ? 'GL' : recipient?.username?.substring(0, 2)}
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-tight">{isGlobal ? 'Global Lounge' : recipient?.username}</span>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-green-500/60">Encrypted Channel</div>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-grow overflow-y-auto px-4 md:px-12 lg:px-64 py-6 space-y-6">
        {loading ? (
          <div className="h-full flex items-center justify-center opacity-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
            <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <div className="text-[10px] uppercase tracking-[0.2em] font-black">No messages yet. Speak freely.</div>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user_id === user.id;
            const repliedMsg = findRepliedMessage(m.reply_to_id);
            
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up group`}>
                {!isMe && <span className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1 ml-2">{m.username}</span>}
                <div 
                  onContextMenu={(e) => handleContextMenu(e, m)}
                  className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm transition-all border border-white/5
                    ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}
                  `}
                  style={{ backgroundColor: bubbleColor }}
                >
                  {repliedMsg && (
                    <div className="mb-3 p-2.5 rounded-xl border-l-4 border-white/20 bg-black/20 text-[11px] opacity-70 cursor-pointer overflow-hidden">
                      <div className="font-black uppercase tracking-tighter mb-1 text-[9px]">{repliedMsg.username}</div>
                      <div className="truncate italic">{repliedMsg.content}</div>
                    </div>
                  )}

                  <div className="break-words leading-relaxed text-sm text-[#eee]">{m.content}</div>
                  
                  <div className="flex items-center gap-1.5 mt-2 justify-end opacity-20 text-[8px] font-black uppercase tracking-widest">
                    {format(new Date(m.created_at), 'HH:mm')}
                    {isMe && (
                       <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    )}
                  </div>

                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(m.reactions).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                        >
                          <span>{emoji}</span>
                          <span className="font-black text-white/50">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex-none p-4 md:px-12 lg:px-64 pb-8" style={{ backgroundColor: chatBg }}>
        {error && <div className="mb-2 text-[10px] text-red-500 font-bold uppercase text-center animate-pulse">{error}</div>}
        
        {replyingTo && (
          <div className="mx-2 mb-0 bg-[#111] border-t border-l border-r border-white/10 rounded-t-2xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col gap-1 border-l-4 border-white/20 pl-4 overflow-hidden">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Replying to {replyingTo.username}</span>
              <p className="text-xs text-white/20 truncate italic">{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-2 text-white/20 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className={`flex items-center bg-[#111] border transition-all ${replyingTo ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'} ${cooldown ? 'border-white/5 opacity-50' : 'border-white/10 focus-within:border-white/20'}`}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            disabled={cooldown}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={cooldown ? "Cooling down..." : "Send a message..."}
            className="flex-grow bg-transparent border-none focus:ring-0 px-5 py-4 text-white text-sm placeholder:text-white/20"
          />
          <button type="submit" disabled={!newMessage.trim() || cooldown} className={`px-6 py-4 transition-all ${!newMessage.trim() || cooldown ? 'text-white/10' : 'text-white'}`}>
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};
