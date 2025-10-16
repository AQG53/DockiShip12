import { useState } from 'react';
import { Check, ChevronDown, Eye, EyeOff, Headphones } from 'lucide-react';
import Logo from '../assets/logo1.png'
import LoginLogo from '../assets/login.svg'
import toast from 'react-hot-toast';
import { useLogin_Owner } from '../hooks/useLogin';
import { useNavigate } from 'react-router';
import { setTenantId } from '../lib/axios';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending } = useLogin_Owner();
  const navigate = useNavigate();
  const [needTenantSelection, setNeedTenantSelection] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const extractError = (error) => {
    const data = error?.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (data?.error) return data.error;
    return 'Login failed';
  };

  const doFinalLogin = (tenantId) => {
    setTenantId(tenantId);
    mutate(
      { email, password, tenantId },
      {
        onSuccess: (res) => {
          const userName = res?.user?.fullName || 'there';
          toast.success(`Welcome back, ${userName}!`);
          navigate('/');
        },
        onError: (err) => {
          toast.error(extractError(err));
        },
      }
    );
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignIn = (e) => {
    e?.preventDefault?.();
    if (!email || !password) return toast.error('Please fill in all fields');
    if (!validateEmail(email)) return toast.error('Please enter a valid email address');

    mutate(
      { email, password },
      {
        onSuccess: (res) => {
          if (res?.access_token) {
            const userName = res?.user?.fullName || 'there';
            toast.success(`Welcome back, ${userName}!`);
            return navigate('/');
          }

          if (res?.needTenantSelection && Array.isArray(res?.ownedTenants)) {
            if (res.ownedTenants.length === 1) {
              const onlyTenant = res.ownedTenants[0];
              doFinalLogin(onlyTenant.id);
            } else if (res.ownedTenants.length > 1) {
              setTenants(res.ownedTenants);
              setSelectedTenantId('');
              setNeedTenantSelection(true);
              toast('Select a company to continue', { icon: '🏢' });
            } else {
              toast.error('User not found, please create an account.');
            }
          }
          else {
            toast.error('Unexpected login response.');
          }
        },
        onError: (err) => {
          console.log(err)
          toast.error(extractError(err));
        },
      }
    );
  };

  const handleContinueWithTenant = () => {
    if (!selectedTenantId) return toast.error('Please select a company');
    doFinalLogin(selectedTenantId);
  };

  const handleSignUp = () => {
    navigate('/signup/owner');
  };

  const handleForgotPassword = () => {
    navigate('/password/request');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignIn(e);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden md:overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>
      <div className="w-3/5 bg-[#fff1c1] p-10 py-5 flex flex-col justify-between px-15 h-full">
        <img src={Logo} alt="Logo" className='w-40 mx-4' />

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-800 mt-4">
            One-Stop Master For Your Business{' '}
            <span className="inline-block bg-[#fcd33f] text-black text-sm px-3 py-1 rounded-full align-middle">
              FREE
            </span>
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Your platform is an omni-channel ecommerce solution that helps merchants easily
            to manage your business in real-time across multiple channels.
          </p>

          <div className="flex justify-center">
            <img
              src={LoginLogo}
              alt="Login"
              className="w-3/4 max-w-md object-contain transition-transform hover:rotate-2"
            />
          </div>
        </div>
      </div>

      <div className="w-2/5 bg-white h-full p-8 flex flex-col max-w-full">
        {/* Support (same location; stays visible) */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-3">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
              <Headphones size={18} />
              Support
              <ChevronDown size={18} />
            </button>
          </div>
          <div className="flex justify-end mt-5">
            <button
              onClick={() => navigate('/login/member')}
              className="px-4 py-2 mt-2 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-200"
            >
              Member Login
            </button>
          </div>
        </div>

        {/* Main content (scrolls if needed; same order) */}
        <div className="flex-1 pr-1">
          <div className="bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-5">Log in to your account</h2>

            <div className="space-y-5">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={needTenantSelection}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={needTenantSelection}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={handleForgotPassword} className="text-sm text-gray-600 hover:text-blue-600">
                  Forgot password?
                </button>
              </div>

              {needTenantSelection && tenants.length > 1 && (
                <div className="space-y-3">
                  <label className="text-sm text-gray-700">Select company</label>

                  <Listbox value={selectedTenantId} onChange={setSelectedTenantId}>
                    <div className="relative">
                      <ListboxButton className="w-full flex justify-between items-center border border-gray-300 rounded-lg px-4 py-3 text-left text-gray-700 focus:outline-none">
                        <span>
                          {selectedTenantId
                            ? tenants.find((t) => t.id === selectedTenantId)?.name
                            : 'Choose company…'}
                        </span>
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      </ListboxButton>

                      <Transition
                        enter="transition ease-out duration-100"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <ListboxOptions className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {tenants.map((t) => (
                            <ListboxOption
                              key={t.id}
                              value={t.id}
                              className={({ active, selected }) =>
                                `cursor-pointer mx-1 select-none px-4 py-2 ${active ? 'bg-gray-50' : ''
                                } ${selected ? 'text-blue-600 font-medium' : 'text-gray-700'}`
                              }
                            >
                              {({ selected }) => (
                                <div className="flex justify-between items-center">
                                  <span>{t.name}</span>
                                  {selected && <Check className="h-4 w-4" />}
                                </div>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Transition>
                    </div>
                  </Listbox>

                  <button
                    onClick={handleContinueWithTenant}
                    disabled={isPending}
                    className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
                  >
                    {isPending ? 'Signing in…' : 'Continue'}
                  </button>
                </div>
              )}

              {!needTenantSelection && (
                <button
                  onClick={handleSignIn}
                  disabled={isPending}
                  className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              )}

              <div className="mt-2 text-center">
                <span className="text-gray-600 text-sm">Don't have an account? </span>
                <button onClick={handleSignUp} className="text-[#ffc700] hover:text-[#ffdd63] font-semibold text-sm">
                  Sign up for free
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (same location; stays visible) */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-3 mt-3 text-center text-xs text-gray-600">
          © 2025 DockiShip •{' '}
          <a href="#" className="hover:text-blue-600">Terms of service</a> •{' '}
          <a href="#" className="hover:text-blue-600">Privacy policy</a> •{' '}
          <a href="#" className="hover:text-blue-600">Help center</a>
        </div>
      </div>
    </div>
  );
}