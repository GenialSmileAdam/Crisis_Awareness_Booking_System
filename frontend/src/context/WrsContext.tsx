import { createContext, useContext, useState, ReactNode } from "react";

interface WrsCtx {
  wrs: number;
  setWrs: (n: number) => void;
}
const WrsContext = createContext<WrsCtx>({ wrs: 50, setWrs: () => {} });

const WRS_KEY = "psyunit_wrs";

export function WrsProvider({ children }: { children: ReactNode }) {
  const [wrs, setWrsState] = useState<number>(() => {
    try {
      const v = localStorage.getItem(WRS_KEY);
      if (v !== null) {
        const n = parseInt(v, 10);
        if (n >= 0 && n <= 100) return n;
      }
    } catch {}
    return 50;
  });

  const setWrs = (n: number) => {
    setWrsState(n);
    try { localStorage.setItem(WRS_KEY, String(n)); } catch {}
  };

  return <WrsContext.Provider value={{ wrs, setWrs }}>{children}</WrsContext.Provider>;
}
export const useWrs = () => useContext(WrsContext);
