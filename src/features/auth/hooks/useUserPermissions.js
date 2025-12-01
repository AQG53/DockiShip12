import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "ds_access_token";

export default function useUserPermissions() {
    const [claims, setClaims] = useState(null);
    const [ready, setReady] = useState(false);

    const compute = () => {
        try {
            const t = localStorage.getItem(TOKEN_KEY);
            if (!t) {
                setClaims(null);
                setReady(true);
                return;
            }
            const raw = t.startsWith("Bearer ") ? t.slice(7) : t;
            const dec = jwtDecode(raw);
            setClaims(dec || null);
        } catch (e) {
            console.error("usePermissions: failed to decode token", e);
            setClaims(null);
        } finally {
            setReady(true);
        }
    };

    useEffect(() => {
        compute(); // initial
        const onAuthChanged = () => compute();
        const onStorage = (e) => {
            if (e.key === TOKEN_KEY) compute();
        };
        window.addEventListener("auth-changed", onAuthChanged);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("auth-changed", onAuthChanged);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const perms = useMemo(() => {
        const list = Array.isArray(claims?.perms) ? claims.perms : [];
        return new Set(list.map(String));
    }, [claims]);

    return { perms, claims, ready };
}
