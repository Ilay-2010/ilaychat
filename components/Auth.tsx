
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

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
    
    if (isRegister && !acceptedTerms) {
      setError("Bitte akzeptiere die Nutzungsbedingungen.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Timeout-Logic: Wenn Supabase nach 12s nicht antwortet, brechen wir ab
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Verbindung zu Supabase zu langsam oder ungültiger API Key.")), 12000)
    );

    try {
      if (isRegister) {
        const signUpPromise = supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { username },
            emailRedirectTo: window.location.origin 
          }
        });

        const { error, data }: any = await Promise.race([signUpPromise, timeoutPromise]);
        
        if (error) throw error;
        
        if (data.user) {
          setIsRegister(false);
          setSuccessMsg("Account erstellt! Bitte checke deine E-Mails (auch Spam), um den Account zu bestätigen.");
          setUsername('');
          setEmail('');
          setPassword('');
          setAcceptedTerms(false);
        }
      } else {
        const signInPromise = supabase.auth.signInWithPassword({ email, password });
        const { error }: any = await Promise.race([signInPromise, timeoutPromise]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.message?.includes("Email not confirmed")) {
        setError("Bitte bestätige zuerst deine E-Mail Adresse.");
      } else if (err.message?.includes("Invalid login credentials")) {
        setError("E-Mail oder Passwort falsch.");
      } else {
        setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black z-[1000]">
      <div className="w-full max-w-[400px] animate-slide-up text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white mb-4">
          {isRegister ? 'Erstelle deinen' : 'Login zum'} <br/><span className="text-white/40">Account.</span>
        </h1>
      </div>

      <div className="w-full max-w-[380px] bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl shadow-2xl relative animate-slide-up" style={{animationDelay: '0.1s'}}>
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold text-center leading-relaxed">
            {error}
            <div className="mt-2 opacity-50 font-normal">Tipp: Prüfe, ob dein Supabase Key in services/supabase.ts korrekt ist.</div>
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
              placeholder="Nutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-white/5 focus:border-white/20 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
              required={isRegister}
            />
          )}
          <input
            type="email"
            placeholder="E-Mail Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-white/5 focus:border-white/20 rounded-xl px-4 py-3.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
            required
          />
          <input
            type="password"
            placeholder="Passwort"
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
                Ich akzeptiere die Bedingungen. System-relevante Daten (wie IP) werden zur Sicherheit erhoben.
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
              {loading ? 'Verarbeite...' : (isRegister ? 'Registrieren' : 'Anmelden')}
            </button>

            {loading && (
              <button 
                type="button" 
                onClick={() => setLoading(false)}
                className="w-full text-[9px] font-bold text-white/20 uppercase tracking-widest hover:text-white/40 transition-colors"
              >
                Abbrechen
              </button>
            )}
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
            {isRegister ? 'Bereits einen Account? Login' : "Noch kein Account? Sign up"}
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-white/10 text-[9px] uppercase tracking-[0.4em] font-black">
        Encrypted by Supabase
      </p>
    </div>
  );
};
