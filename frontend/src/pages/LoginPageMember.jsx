import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Headphones } from 'lucide-react';
import Logo from '../assets/logo1.png'
import LoginLogo from '../assets/login.svg'
import toast from 'react-hot-toast';
import { useLogin_Member } from '../hooks/useLogin';
import { useNavigate } from 'react-router';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, isError, error } = useLogin_Member();
  const navigate = useNavigate();

  const handleSignIn = () => {
    if (!email || !password) return toast.error('Please fill in all fields');
    mutate(
      { email, password },
      {
        onSuccess: ({ user }) => {
          toast.success(`Welcome back, ${user.fullName}!`);
          navigate('/');
        }
      }
    );
  };

  const handleSignUp = () => {
    console.log('Navigate to sign up page');
    alert('Redirecting to sign up page...');
  };

  const handleForgotPassword = () => {
    console.log('Navigate to forgot password page');
    alert('Redirecting to password recovery...');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-3/5 bg-[#fff1c1] p-10 py-5 flex flex-col px-30">
        <img src={Logo} alt="Logo" className='w-50 mx-5' />

        <div className="flex-1 flex flex-col justify-center max-w">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            One-Stop Master For Your Business{' '}
            <span className="inline-block bg-[#fcd33f] text-black text-sm px-3 py-1 rounded-full align-middle">
              FREE
            </span>
          </h1>
          <p className="text-gray-600 text-lg">
            Your platform is an omni-channel ecommerce solution that helps merchants easily
            to manage your business in real-time across multiple channels.
          </p>

          <div className="relative">
            <img
              src={LoginLogo}
              alt="Login"
              className="w-full h-110 mt-3 hover:rotate-2"
            />

          </div>
        </div>
      </div>

      <div className="w-2/5 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-10">
            <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
              <Headphones size={18} />
              Support
              <ChevronDown size={18} />
            </button>
          </div>

          <div className='flex justify-end mb-6'>
            <button
              onClick={() => navigate('/login/owner')}
              className="px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200"
            >
              Owner Login
            </button>
          </div>

          <div className="bg-white">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Log in to your member account</h2>

            <div className="space-y-6">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {isError && (
                <p className="text-sm text-red-600">
                  {error?.response?.data?.message || "Login failed"}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleForgotPassword}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleSignIn}
                disabled={isPending}
                className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

            </div>

            <div className="mt-6 text-center">
              <span className="text-gray-600">Don't have an account? </span>
              <button
                onClick={handleSignUp}
                className="text-[#ffc700] hover:text-[#ffdd63] font-semibold cursor-pointer"
              >
                Sign up for free
              </button>
            </div>

            <div className="text-sm text-gray-600 mt-10 px-5">
              © 2025 DockiShip <a href="#" className="hover:text-blue-600">Terms of service</a> |
              <a href="#" className="hover:text-blue-600 ml-1">Privacy policy</a> |
              <a href="#" className="hover:text-blue-600 ml-1">Help center</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}