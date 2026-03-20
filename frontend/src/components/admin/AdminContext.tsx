import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import socketService from '../../services/SocketService';

interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  isAdminEnabled: boolean;
  setIsAdminEnabled: (value: boolean) => void;
  adminToken: string | null;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  setIsAdmin: () => {},
  isAdminEnabled: false,
  setIsAdminEnabled: () => {},
  adminToken: null,
});

export const useAdmin = () => useContext(AdminContext);

interface AdminProviderProps {
  children: ReactNode;
}

// Helper function to check if token is valid
const isTokenValid = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    // Check if token is expired
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminEnabled, setIsAdminEnabled] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Effect to handle token changes
  useEffect(() => {
    // When admin status changes, update socket connection
    if (isAdmin) {
      // Small delay to ensure token is saved before reconnecting
      setTimeout(() => {
        socketService.updateAuthToken();
      }, 100);
    } else {
      // Reset token and reconnect
      localStorage.removeItem('admin_token');
      setAdminToken(null);
      socketService.updateAuthToken();
    }
  }, [isAdmin]);

  // Initial setup — check for token from OIDC redirect or existing localStorage token
  useEffect(() => {
    // Pick up token delivered via ?admin_token= query param after OIDC callback
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('admin_token');
    const authError = params.get('auth_error');

    if (urlToken && isTokenValid(urlToken)) {
      localStorage.setItem('admin_token', urlToken);
      setAdminToken(urlToken);
      setIsAdmin(true);
      // Remove the token from the URL without triggering a page reload
      params.delete('admin_token');
      const newSearch = params.toString();
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
      return;
    }

    if (authError) {
      console.error('OIDC authentication error:', decodeURIComponent(authError));
      params.delete('auth_error');
      const newSearch = params.toString();
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
    }

    // Fall back to persisted token
    const stored = localStorage.getItem('admin_token');
    if (stored && isTokenValid(stored)) {
      setIsAdmin(true);
      setAdminToken(stored);
    } else if (stored) {
      localStorage.removeItem('admin_token');
    }
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        isAdminEnabled,
        setIsAdminEnabled,
        adminToken,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};