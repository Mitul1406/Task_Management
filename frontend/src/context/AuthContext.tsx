// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  userId: string | null;
  stream: MediaStream | null;
  isScreenshotEnabled: boolean;
  login: (userId: string) => void;
  logout: () => void;
  enableScreenshot: (stream: MediaStream) => void;
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  stream: null,
  isScreenshotEnabled: false,
  login: () => {},
  logout: () => {},
  enableScreenshot: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScreenshotEnabled, setIsScreenshotEnabled] = useState(false);

  const login = (id: string) => {
    setUserId(id);
    localStorage.setItem("userId", id);
  };

  const logout = () => {
    setUserId(null);
    setIsScreenshotEnabled(false);
    setStream(null);
    localStorage.removeItem("userId");
  };

  const enableScreenshot = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setIsScreenshotEnabled(true);
    localStorage.setItem("screenshotEnabled", "true");
  };

  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    const screenshotEnabled = localStorage.getItem("screenshotEnabled") === "true";
    if (storedId) setUserId(storedId);
    if (screenshotEnabled) setIsScreenshotEnabled(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ userId, stream, isScreenshotEnabled, login, logout, enableScreenshot }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
