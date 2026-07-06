// src/context/ThemeContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [modTema, setModTema] = useState(() => localStorage.getItem('themeMode') || 'dark');
  
  const teme = {
    dark: { bgCrap: '#0b1329', bgCard: '#0f172a', bgInput: '#1e293b', textPrincipal: '#ffffff', textSecundar: '#94a3b8', border: 'rgba(255,255,255,0.08)', borderCard: 'rgba(255,255,255,0.05)', shadow: 'rgba(0,0,0,0.3)' },
    light: { bgCrap: '#f1f5f9', bgCard: '#ffffff', bgInput: '#f8fafc', textPrincipal: '#0f172a', textSecundar: '#64748b', border: 'rgba(0,0,0,0.08)', borderCard: 'rgba(0,0,0,0.06)', shadow: 'rgba(15,23,42,0.05)' }
  };

  const toggleTema = () => {
    const nouMod = modTema === 'dark' ? 'light' : 'dark';
    setModTema(nouMod);
    localStorage.setItem('themeMode', nouMod);
  };

  return (
    <ThemeContext.Provider value={{ modTema, toggleTema, t: teme[modTema] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);