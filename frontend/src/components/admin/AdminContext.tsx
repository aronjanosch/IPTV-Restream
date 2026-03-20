import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import socketService from '../../services/SocketService';

interface DecodedToken {
  userId: number;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
  exp: number;
}

interface UserContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  userId: number | null;
  username: string | null;
  email: string | null;
  role: string | null;
  adminToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  isLoggedIn: false,
  isAdmin: false,
  userId: null,
  username: null,
  email: null,
  role: null,
  adminToken: null,
  login: () => {},
  logout: () => {},
});

export const useAdmin = () => useContext(UserContext);
export const useUser = () => useContext(UserContext);

interface AdminProviderProps {
  children: ReactNode;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);

  const login = useCallback((token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) return;
    localStorage.setItem('admin_token', token);
    setAdminToken(token);
    setUser(decoded);
    setTimeout(() => socketService.updateAuthToken(), 100);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setUser(null);
    socketService.disconnect();
  }, []);

  // On mount: pick up token from OIDC redirect URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('admin_token');
    const authError = params.get('auth_error');

    if (urlToken) {
      params.delete('admin_token');
      const newSearch = params.toString();
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
      if (decodeToken(urlToken)) {
        login(urlToken);
        return;
      }
    }

    if (authError) {
      console.error('OIDC authentication error:', decodeURIComponent(authError));
      params.delete('auth_error');
      const newSearch = params.toString();
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
    }

    const stored = localStorage.getItem('admin_token');
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setAdminToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem('admin_token');
      }
    }
  }, [login]);

  return (
    <UserContext.Provider
      value={{
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        userId: user?.userId ?? null,
        username: user?.username ?? null,
        email: user?.email ?? null,
        role: user?.role ?? null,
        adminToken,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
