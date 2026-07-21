import { createContext, useContext, useEffect, useState } from 'react';
import { Api, tokens } from './api';

const Ctx = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refreshMe: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await tokens.load();
      if (tokens.access) {
        try {
          const r = await Api.me();
          setUser(r.data);
        } catch {
          await tokens.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  const refreshMe = async () => {
    const r = await Api.me();
    setUser(r.data);
  };

  const logout = async () => {
    await tokens.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, setUser, refreshMe, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
