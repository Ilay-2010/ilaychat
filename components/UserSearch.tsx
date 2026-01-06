
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';

interface UserSearchProps {
  currentUserId: string;
  onSelectUser: (profile: Profile) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ currentUserId, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId);
      if (data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, [currentUserId]);

  const filtered = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-2xl mx-auto w-full animate-slide-up">
      <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Find a <span className="text-white/40">Contact</span></h2>
      <div className="relative mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username..."
          className="w-full bg-[#111] border border-white/10 focus:border-white/30 rounded-xl px-5 py-4 text-white outline-none transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-2 pr-2">
        {loading ? (
          <div className="flex justify-center py-10 opacity-20"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-white/20 text-xs uppercase tracking-widest font-bold">No users found</p>
        ) : (
          filtered.map(profile => (
            <button
              key={profile.id}
              onClick={() => onSelectUser(profile)}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black text-xs text-white/40 uppercase">
                  {profile.username?.substring(0, 2)}
                </div>
                <div className="text-left">
                  <div className="text-sm font-black uppercase tracking-tight">{profile.username}</div>
                  <div className="text-[10px] text-white/30 font-bold uppercase">Online</div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
