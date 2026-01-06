
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { Auth } from './components/Auth';
import { ChatRoom } from './components/ChatRoom';
import { UserSearch } from './components/UserSearch';
import { AdminPanel } from './components/AdminPanel';
import { User } from '@supabase/supabase-js';
import { Profile } from './types';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[100px] animate-pulse"></div>
      <div className="relative w-16 h-16 mb-8">
        <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin [animation-duration:0.8s]"></div>
        <div className="absolute inset-2 border-r-2 border-white/20 rounded-full animate-spin [animation-duration:1.2s] [animation-direction:reverse]"></div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-[12px] font-black uppercase tracking-[0.6em] text-white animate-pulse">ilay.chat</h2>
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="text-[7px] text-white/30 uppercase font-bold tracking-[0.3em]">Establishing Secure Connection</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIpBanned, setIsIpBanned] = useState(false);
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [userIp, setUserIp] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'admin' | 'search'>('chat');
  
  const [chatBgColor, setChatBgColor] = useState(() => localStorage.getItem('chat_bg_color') || '#000000');
  const [messageColor, setMessageColor] = useState(() => localStorage.getItem('message_bubble_color') || '#111111');

  useEffect(() => {
    localStorage.setItem('chat_bg_color', chatBgColor);
    localStorage.setItem('message_bubble_color', messageColor);
  }, [chatBgColor, messageColor]);

  const performBanCheck = async (userId?: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const ipResponse = await fetch('https://api.ipify.org?format=json', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (ipResponse && ipResponse.ok) {
        const ipData = await ipResponse.json();
        setUserIp(ipData.ip);
        const { data: ipBan } = await supabase.from('banned_ips').select('ip').eq('ip', ipData.ip).maybeSingle();
        if (ipBan) setIsIpBanned(true);
      }

      if (userId) {
        const { data: userBan } = await supabase.from('banned_users').select('user_id').eq('user_id', userId).maybeSingle();
        if (userBan) setIsUserBanned(true);
      }
    } catch (e) {
      console.warn("Background check failed - continuing safely.");
    }
  };

  useEffect(() => {
    // PROFESSIONAL LOADING TIMER
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) performBanCheck(session.user.id);
      } catch (err) {
        console.warn("Session init delayed.");
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) performBanCheck(session.user.id);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (loading) return <LoadingScreen />;

  if (isIpBanned || isUserBanned) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <h1 className="text-xl font-black text-white uppercase tracking-tighter">Access Denied</h1>
        <p className="text-white/30 text-[9px] mt-4 uppercase tracking-[0.3em]">System Restriction Active.</p>
      </div>
    );
  }

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const isAdmin = displayName === 'Admin' || user?.email === 'admin@ilay.chat';

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white overflow-hidden relative">
      <nav className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-[9999] border-b border-white/5 bg-black/80 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center cursor-pointer" onClick={() => { setSelectedRecipient(null); setCurrentView('chat'); }}>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-black"></div>
          </div>
          <span className="text-sm font-black tracking-tighter uppercase italic cursor-pointer">ilay.chat</span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentView(currentView === 'search' ? 'chat' : 'search')} className={`p-2 rounded-lg ${currentView === 'search' ? 'bg-white/10' : 'text-white/40'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            {isAdmin && (
              <button onClick={() => setCurrentView(currentView === 'admin' ? 'chat' : 'admin')} className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg ${currentView === 'admin' ? 'bg-red-500' : 'bg-white/10'}`}>Admin</button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 text-white/40 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); setUser(null); }} className="bg-white text-black text-[10px] font-black uppercase px-3 py-2 rounded-lg">Logout</button>
          </div>
        )}
      </nav>

      {showSettings && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Interface</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Chat Background</label>
                <input type="color" value={chatBgColor} onChange={(e) => setChatBgColor(e.target.value)} className="w-8 h-8 bg-transparent cursor-pointer" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Bubble Color</label>
                <input type="color" value={messageColor} onChange={(e) => setMessageColor(e.target.value)} className="w-8 h-8 bg-transparent cursor-pointer" />
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-12 bg-white text-black font-black uppercase py-5 rounded-[1.5rem] text-[11px] tracking-widest">Done</button>
          </div>
        </div>
      )}

      <main className="flex-grow pt-16 relative h-full">
        {!user ? <Auth /> : currentView === 'admin' && isAdmin ? <AdminPanel /> : currentView === 'search' ? <UserSearch currentUserId={user.id} onSelectUser={(p) => { setSelectedRecipient(p); setCurrentView('chat'); }} /> : (
          <ChatRoom user={user} userIp={userIp} recipient={selectedRecipient} onBack={() => { setSelectedRecipient(null); setCurrentView('chat'); }} chatBg={chatBgColor} bubbleColor={messageColor} />
        )}
      </main>
    </div>
  );
};

export default App;
