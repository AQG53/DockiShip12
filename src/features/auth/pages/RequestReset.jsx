import { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Logo from '../../../assets/logo1.png';
import { useRequestReset } from '../hooks/usePasswordReset';

export default function RequestReset() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const resetMutation = useRequestReset();

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');
    if (!validateEmail(email)) return toast.error('Please enter a valid email');
    try {
      const res = await resetMutation.mutateAsync({ email });
      const msg =
        res?.message || 'If this email exists, a reset link has been sent.';
      toast.success(msg);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send reset link';
      toast.error(msg);
    }
  };

  const isSubmitting = resetMutation.isPending;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#fff1c1] via-[#fffae6] to-[#fff1c1] relative">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="DockiShip" className="h-20 px-15 w-auto" />
        </div>
        <button
          onClick={() => navigate('/login/owner')}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors mb-8 px-2"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Login</span>
        </button>
      </div>

      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-[520px]">
          <div className="bg-white/95 rounded-3xl shadow-2xl border border-yellow-200/60 p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Lock size={18} className="text-amber-700" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                Reset your password
              </h1>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Enter your email and we’ll send you a secure link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                We’ll email you a secure link to reset your password.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-gray-600 mt-4">
            © 2025 DockiShip • <a href="#" className="hover:text-gray-800">Help</a>
          </div>
        </div>
      </div>
    </div>
  );
}
