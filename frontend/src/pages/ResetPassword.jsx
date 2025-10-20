import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Logo from '../assets/logo1.png';
import { useResetPassword } from '../hooks/usePasswordReset';
import { logout } from '../lib/api';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const { search } = useLocation();
  const token = useMemo(() => new URLSearchParams(search).get('token') || '', [search]);

  const requirements = [
    { text: 'At least 8 characters', met: newPassword.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { text: 'Contains number', met: /[0-9]/.test(newPassword) },
  ];
  const allMet = requirements.every((r) => r.met);
  const match = newPassword === confirmPassword && newPassword.length > 0;

  const mutation = useResetPassword();
  const isSubmitting = mutation.isPending;

  useEffect(() => {
      logout();
    }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Missing reset token. Open the link from your email.');
    if (!allMet) return toast.error('Please meet all password requirements');
    if (!match) return toast.error('Passwords do not match');

    try {
      const res = await mutation.mutateAsync({ token, newPassword });
      toast.success(res?.message || 'Password reset successfully!');
      navigate('/login/owner');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to reset password';
      toast.error(msg);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#fff1c1] via-[#fffae6] to-[#fff1c1] relative">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
        <img src={Logo} alt="DockiShip" className="h-20 px-15 w-auto" />
      </div>

      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-[560px]">
          <div className="bg-white/95 rounded-3xl shadow-2xl border border-yellow-200/60 p-6 md:p-7">
            <div className="mb-4">
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Create new password</h1>
              <p className="text-gray-600 text-sm mt-1">
                Choose a strong password to secure your account.
              </p>
            </div>

            {!token && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
                <AlertTriangle size={18} className="mt-0.5" />
                <p className="text-sm">Unauthorized Access</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting || !token}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-3 space-y-2">
                    {requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                        >
                          {req.met && <Check size={10} className="text-white" />}
                        </div>
                        <span className={req.met ? 'text-green-600 font-medium' : 'text-gray-500'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting || !token}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${match ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    >
                      {match && <Check size={10} className="text-white" />}
                    </div>
                    <span className={match ? 'text-green-600 font-medium' : 'text-red-600'}>
                      {match ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !allMet || !match}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Resetting…
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Didn&apos;t get an email?{' '}
              <button
                onClick={() => navigate('/password/request')}
                className="text-[#ffc700] hover:text-[#ffdd63] font-semibold"
              >
                Request reset again
              </button>
            </p>
          </div>

          <div className="text-center text-xs text-gray-600 mt-4">
            © 2025 DockiShip • <a href="#" className="hover:text-gray-800">Help</a>
          </div>
        </div>
      </div>
    </div>
  );
}
