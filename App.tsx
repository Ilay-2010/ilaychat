
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
      <div className="relative w-20 h-20 mb-10">
        <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin [animation-duration:0.6s]"></div>
        <div className="absolute inset-2 border-r-2 border-white/20 rounded-full animate-spin [animation-duration:1s] [animation-direction:reverse]"></div>
        <div className="absolute inset-4 border-b-2 border-white/40 rounded-full animate-spin [animation-duration:1.5s]"></div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">ilay.chat</h2>
        <div className="flex gap-1 items-center">
          <span className="w-1 h-1 bg-white/20 rounded-full animate-bounce [animation-delay:0s]"></span>
          <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
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
  }, [chatBgColor]);

  useEffect(() => {
    localStorage.setItem('message_bubble_color', messageColor);
  }, [messageColor]);

  const checkBans = async (userId?: string) => {
    try {
      // IP abrufen
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
      if (ipResponse && ipResponse.ok) {
        const ipData = await ipResponse.json();
        setUserIp(ipData.ip);
        // IP-Ban Check (Ignoriert 404 Fehler, falls Tabelle nicht existiert)
        const { data: ipBanData, error: ipError } = await supabase.from('banned_ips').select('ip').eq('ip', ipData.ip).maybeSingle();
        if (ipBanData && !ipError) { setIsIpBanned(true); return true; }
      }

      if (userId) {
        // User-Ban Check (Ignoriert 404 Fehler, falls Tabelle nicht existiert)
        const { data: userBanData, error: userError } = await supabase.from('banned_users').select('user_id').eq('user_id', userId).maybeSingle();
        if (userBanData && !userError) { setIsUserBanned(true); return true; }
      }
    } catch (err) {
      // Wenn Tabellen nicht existieren, erlauben wir den Zugriff erstmal (Bootstrap Phase)
      console.warn("Ban-Check übersprungen (evtl. Tabellen noch nicht angelegt)");
    }
    return false;
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isBanned = await checkBans(session?.user?.id);
        if (!isBanned) setUser(session?.user ?? null);
        else if (session?.user) { await supabase.auth.signOut(); setUser(null); }
      } catch (err) { 
        console.error("Init Error:", err); 
      } finally {
        setLoading(false);
      }
    };
    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const isBanned = await checkBans(session.user.id);
        if (!isBanned) setUser(session.user); else { setUser(null); await supabase.auth.signOut(); }
      } else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {}
  };

  if (loading) return <LoadingScreen />;

  if (isIpBanned || isUserBanned) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Zugriff eingeschränkt</h1>
        <p className="text-white/40 text-[10px] mt-4 uppercase tracking-[0.2em]">Sicherheits-Protokoll aktiv.</p>
      </div>
    );
  }

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const isAdmin = displayName === 'Admin' || user?.email === 'admin@ilay.chat';

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white selection:bg-white/20 overflow-hidden relative font-['Inter']">
      <nav className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-6 z-[9999] border-b border-white/5 bg-black/80 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            onClick={() => { setSelectedRecipient(null); setCurrentView('chat'); }}
          >
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-black"></div>
          </div>
          <span className="text-sm font-black tracking-tighter uppercase italic cursor-pointer" onClick={() => { setSelectedRecipient(null); setCurrentView('chat'); }}>ilay.chat</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setCurrentView(currentView === 'search' ? 'chat' : 'search')}
              className={`p-2 transition-colors rounded-lg ${currentView === 'search' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            {isAdmin && (
              <button 
                onClick={() => setCurrentView(currentView === 'admin' ? 'chat' : 'admin')}
                className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${currentView === 'admin' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 text-white/60 hover:text-white'}`}
              >Admin</button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-2 text-white/40 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            </button>
            <button onClick={handleLogout} className="bg-white text-black text-[10px] font-black uppercase px-3 py-2 rounded-lg hover:bg-neutral-200 transition-all active:scale-90">Logout</button>
          </div>
        )}
      </nav>

      {showSettings && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Interface</h2>
            <div className="space-y-10">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Background</label>
                  <input type="color" value={chatBgColor} onChange={(e) => setChatBgColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Messages</label>
                  <input type="color" value={messageColor} onChange={(e) => setMessageColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer" />
                </div>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-12 bg-white text-black font-black uppercase py-5 rounded-[1.5rem] text-[11px] tracking-widest hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shadow-white/5">Fertig</button>
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
