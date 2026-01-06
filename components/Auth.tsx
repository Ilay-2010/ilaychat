
import React, { useState } from 'react';
import { supabase, SUPABASE_ANON_KEY } from '../services/supabase';

export const Auth: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 20) {
      setError("Configuration Error: API Key missing.");
      return;
    }

    if (isRegister && !acceptedTerms) {
      setError("Please accept the Terms of Service.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isRegister) {
        // ENFORCE UNIQUE USERNAME CHECK
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle();

        if (existingUser) {
          throw new Error("This username is already taken.");
        }

        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { username: username.trim() },
            emailRedirectTo: window.location.origin 
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data?.user) {
          setIsRegister(false);
          setSuccessMsg("Account created! Please check your email (including spam) to confirm.");
          setUsername('');
          setEmail('');
          setPassword('');
          setAcceptedTerms(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err.message || "";
      
      if (isRegister) {
        if (msg.includes("User already registered")) {
          setError("This email address is already in use.");
        } else if (msg.includes("Password should be")) {
          setError("Password is too short (min. 6 characters).");
        } else {
          setError(msg || `Registration failed.`);
        }
      } else {
        if (err.status === 400 || err.status === 401) {
          setError("Login failed: Incorrect email or password.");
        } else if (msg.includes("Email not confirmed")) {
          setError("Please confirm your email address first.");
        } else {
          setError(`Error: ${msg}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black z-[1000]">
      <div className="w-full max-w-[400px] animate-slide-up text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white mb-4">
          {isRegister ? 'Create your' : 'Login to your'} <br/><span className="text-white/40">Account.</span>
        </h1>
      </div>

      <div className="w-full max-w-[380px] bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl shadow-2xl relative animate-slide-up" style={{animationDelay: '0.1s'}}>
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold text-center leading-relaxed">
            <span className="block mb-1">⚠️ NOTE</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-[10px] font-bold text-center leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-white/5 focus:border-white/20 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
              required={isRegister}
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-white/5 focus:border-white/20 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-white/5 focus:border-white/20 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
            required
          />

          {isRegister && (
            <div className="flex items-start gap-3 px-1 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/10 bg-black text-white focus:ring-0 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-[9px] leading-tight text-white/30 font-medium cursor-pointer hover:text-white/50 transition-colors">
                I accept the terms. System-relevant data (like IP) will be collected for security purposes.
              </label>
            </div>
          )}
          
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-neutral-200 active:scale-[0.98] transition-all text-[11px] uppercase tracking-widest flex items-center justify-center gap-3"
            >
              {loading && <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>}
              {loading ? 'Processing...' : (isRegister ? 'Register' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            {isRegister ? 'Already have an account? Login' : "No account yet? Sign up"}
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-white/10 text-[9px] uppercase tracking-[0.4em] font-black">
        ilay.chat secure access
      </p>
    </div>
  );
};
