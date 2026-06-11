import { useEffect } from "react";
import { useConfig } from "@/hooks/queries";
import { useAuth } from "@/context/AuthContext";
import { setTierThresholds } from "@/lib/wrs";

/**
 * Headless component: once authenticated, loads system config and pushes the
 * WRS tier thresholds into the runtime so client-side tier/colour helpers
 * (lib/wrs) reflect admin configuration everywhere.
 */
export function ConfigSync() {
  const { isAuthenticated } = useAuth();
  const { data } = useConfig(isAuthenticated);

  useEffect(() => {
    if (data?.wrs?.thresholds) {
      setTierThresholds(data.wrs.thresholds);
    }
  }, [data]);

  return null;
}
