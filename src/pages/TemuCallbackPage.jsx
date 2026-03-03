import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";

function readParam(search, key) {
  return new URLSearchParams(search).get(key) || "";
}

export default function TemuCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthUser();

  const status = useMemo(() => readParam(location.search, "status").toLowerCase(), [location.search]);
  const message = useMemo(() => readParam(location.search, "message"), [location.search]);
  const channelId = useMemo(() => readParam(location.search, "channelId"), [location.search]);
  const tenantId = useMemo(() => readParam(location.search, "tenantId"), [location.search]);

  const isSuccess = status === "success";
  const ctaPath = isAuthenticated ? "/settings/shop" : "/login/owner";
  const ctaLabel = isAuthenticated ? "Go to Settings" : "Go to Login";

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(ctaPath, { replace: true });
    }, 5000);
    return () => clearTimeout(t);
  }, [navigate, ctaPath]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl p-6 md:p-8">
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
          isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {isSuccess ? "Temu Connected" : "Temu Connection Failed"}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {isSuccess ? "Store authorization completed" : "Store authorization error"}
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          {isSuccess
            ? "Your Temu authorization callback was received. You can continue in settings."
            : (message || "Could not complete Temu authorization. Please try again.")}
        </p>

        {(channelId || tenantId) && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
            {tenantId ? <div><span className="font-semibold">Tenant:</span> {tenantId}</div> : null}
            {channelId ? <div><span className="font-semibold">Channel:</span> {channelId}</div> : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(ctaPath, { replace: true })}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {ctaLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Go Home
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">Redirecting automatically in 5 seconds...</p>
      </div>
    </div>
  );
}
