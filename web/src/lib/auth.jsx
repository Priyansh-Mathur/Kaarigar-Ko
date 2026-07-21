import { createContext, useContext, useEffect, useState } from 'react';
import { Api, session } from './api';

const Ctx = createContext({
  user: null,
  loading: true,
  refreshMe: async () => {},
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cached = session.user();
      if (cached) setUserState(cached);
      if (session.access()) {
        try {
          const r = await Api.me();
          setUserState(r.data);
          session.setUser(r.data);
        } catch {
          /* token invalid — stay logged out */
        }
      }
      setLoading(false);
    })();
  }, []);

  const refreshMe = async () => {
    const r = await Api.me();
    setUserState(r.data);
    session.setUser(r.data);
  };

  const setUser = (u) => {
    setUserState(u);
    session.setUser(u);
  };

  const logout = () => {
    session.clear();
    setUserState(null);
  };

  return <Ctx.Provider value={{ user, loading, refreshMe, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
