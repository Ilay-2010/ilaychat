
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';

export const AdminPanel: React.FC = () => {
  const [bannedIps, setBannedIps] = useState<{ ip: string; created_at: string }[]>([]);
  const [bannedUsers, setBannedUsers] = useState<{ user_id: string; created_at: string }[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [activeTab, setActiveTab] = useState<'ips' | 'users'>('ips');

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch IPs
    const { data: ips } = await supabase.from('banned_ips').select('*').order('created_at', { ascending: false });
    if (ips) setBannedIps(ips);

    // Fetch Banned User IDs
    const { data: bu } = await supabase.from('banned_users').select('*').order('created_at', { ascending: false });
    if (bu) setBannedUsers(bu);

    // Fetch All Profiles
    const { data: profiles } = await supabase.from('profiles').select('*').order('username', { ascending: true });
    if (profiles) setAllUsers(profiles);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBanIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    const { error } = await supabase.from('banned_ips').insert([{ ip: newIp.trim() }]);
    if (!error) {
      setNewIp('');
      fetchData();
    }
  };

  const handleUnbanIp = async (ip: string) => {
    const { error } = await supabase.from('banned_ips').delete().eq('ip', ip);
    if (!error) fetchData();
  };

  const handleBanUser = async (userId: string) => {
    const { error } = await supabase.from('banned_users').insert([{ user_id: userId }]);
    if (!error) fetchData();
  };

  const handleUnbanUser = async (userId: string) => {
    const { error } = await supabase.from('banned_users').delete().eq('user_id', userId);
    if (!error) fetchData();
  };

  const isUserBanned = (userId: string) => bannedUsers.some(bu => bu.user_id === userId);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-4xl mx-auto w-full animate-slide-up overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Admin <span className="text-red-500">Panel</span></h2>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold italic">System Governance & User Management</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('ips')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ips' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            IP Bans
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
          >
            User Bans
          </button>
        </div>
      </div>

      {activeTab === 'ips' ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4">Restrict New IP</h3>
            <form onSubmit={handleBanIp} className="flex gap-2">
              <input 
                type="text" 
                value={newIp} 
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className="flex-grow bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-500/50 transition-all"
              />
              <button type="submit" className="bg-red-500 text-white font-black uppercase px-6 py-3 rounded-xl text-[10px] tracking-widest hover:bg-red-600 active:scale-95 transition-all">
                Ban IP
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 px-2">Active IP Restrictions ({bannedIps.length})</h3>
            {loading ? (
              <div className="py-10 flex justify-center opacity-20"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
            ) : bannedIps.length === 0 ? (
              <p className="text-center py-12 text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold border-2 border-dashed border-white/5 rounded-2xl">Clean IP list</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {bannedIps.map((item) => (
                  <div key={item.ip} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                    <div>
                      <div className="text-sm font-mono text-white/80">{item.ip}</div>
                      <div className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-1">restricted: {new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <button 
                      onClick={() => handleUnbanIp(item.ip)}
                      className="p-2 text-white/20 hover:text-green-500 transition-colors"
                      title="Unban IP"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 px-2">System Users ({allUsers.length})</h3>
            {loading ? (
              <div className="py-10 flex justify-center opacity-20"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allUsers.map(profile => {
                        const banned = isUserBanned(profile.id);
                        if (profile.username === 'Admin') return null; // Protect Admin from listed actions
                        
                        return (
                          <tr key={profile.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-[10px] uppercase">
                                  {profile.username?.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="font-bold">{profile.username}</div>
                                  <div className="text-[9px] text-white/20 font-mono">{profile.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${banned ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                {banned ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {banned ? (
                                <button 
                                  onClick={() => handleUnbanUser(profile.id)}
                                  className="text-[9px] font-black uppercase tracking-widest text-green-500 hover:bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 transition-all"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleBanUser(profile.id)}
                                  className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all"
                                >
                                  Suspend
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-12 p-6 border-t border-white/5 text-center">
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.3em]">ilaychat system control v1.2</p>
      </div>
    </div>
  );
};
