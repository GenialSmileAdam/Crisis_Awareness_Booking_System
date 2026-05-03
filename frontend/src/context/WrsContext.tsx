import { createContext, useContext, useState, ReactNode } from "react";

interface WrsCtx {
  wrs: number;
  setWrs: (n: number) => void;
}
const WrsContext = createContext<WrsCtx>({ wrs: 72, setWrs: () => {} });

export function WrsProvider({ children }: { children: ReactNode }) {
  const [wrs, setWrs] = useState<number>(72);
  return <WrsContext.Provider value={{ wrs, setWrs }}>{children}</WrsContext.Provider>;
}
export const useWrs = () => useContext(WrsContext);
