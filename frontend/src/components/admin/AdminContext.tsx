import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  isAdminEnabled: boolean;
  setIsAdminEnabled: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  setIsAdmin: () => {},
  isAdminEnabled: false,
  setIsAdminEnabled: () => {},
});

export const useAdmin = () => useContext(AdminContext);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminEnabled, setIsAdminEnabled] = useState(false);

  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin, isAdminEnabled, setIsAdminEnabled }}>
      {children}
    </AdminContext.Provider>
  );
};