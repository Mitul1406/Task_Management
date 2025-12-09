import { createContext, useContext, useState } from "react";

type ScreenShareContextType = {
  globalStream: MediaStream | null;
  setGlobalStream: (s: MediaStream | null) => void;
};

const ScreenShareContext = createContext<ScreenShareContextType>({
  globalStream: null,
  setGlobalStream: () => {},
});

export const ScreenShareProvider = ({ children }: any) => {
  const [globalStream, setGlobalStream] = useState<MediaStream | null>(null);

  return (
    <ScreenShareContext.Provider value={{ globalStream, setGlobalStream }}>
      {children}
    </ScreenShareContext.Provider>
  );
};

export const useScreenShare = () => useContext(ScreenShareContext);
