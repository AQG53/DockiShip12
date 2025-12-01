import { useEffect, useState } from "react";
import { TOKEN_KEY, USER_KEY } from "../../../lib/axios";

export default function useAuthUser() {
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const readUser = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setAuthUser(readUser());
    setIsLoading(false);

    const handleStorage = (e) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY) {
        setAuthUser(readUser());
      }
    };
    const handleAuthChanged = () => setAuthUser(readUser());

    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  return {
    isLoading,
    authUser,
    isAuthenticated: Boolean(authUser),
  };
}
