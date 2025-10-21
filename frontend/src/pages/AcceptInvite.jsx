import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import toast from "react-hot-toast";
import { acceptInvite, logout } from "../lib/api.js";
import PageLoader from "../components/PageLoader.jsx";

export default function AcceptInvite() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const token = new URLSearchParams(search).get("token");
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;
        
        (async () => {
            try {
                try { logout(); } catch { }

                if (!token) {
                    toast.error("Missing invitation token.");
                    navigate("/login/member", { replace: true });
                    return;
                }

                const { needsPasswordReset, resetToken } = await acceptInvite({ token });

                if (needsPasswordReset) {
                    if (!resetToken) {
                        toast.error("Invitation accepted, but no reset token received.");
                        navigate("/login/member", { replace: true });
                        return;
                    }
                    toast.success("Invitation accepted, please reset your password");
                    navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`, { replace: true });
                } else {
                    toast.success("Invitation accepted, please log in to your account");
                    navigate("/login/member", { replace: true });
                }
            } catch (err) {
                const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Invalid or expired invitation link.";
                toast.error(msg);
                navigate("/login/member", { replace: true });
            }
        })();
    }, [token, navigate]);

    return <PageLoader />;
}
