import { useState } from 'react';
import { Eye, EyeOff, Headphones, ChevronDown, Check } from 'lucide-react';
import Logo from '../assets/logo1.png'
import SignupLogo from '../assets/signup.svg'
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';
import { signup_owner } from '../lib/api';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const navigate = useNavigate();

    const passwordRequirements = [
        { text: 'At least 8 characters', met: formData.password.length >= 8 },
        { text: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
        { text: 'Contains lowercase letter', met: /[a-z]/.test(formData.password) },
        { text: 'Contains number', met: /[0-9]/.test(formData.password) },
    ];

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignUp = async (e) => {
        e?.preventDefault?.();
        if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!agreedToTerms) {
            toast.error('Please agree to the Terms of Service and Privacy Policy');
            return;
        }

        setIsLoading(true);

        try {
            const res = await signup_owner({
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                password: formData.password,
            });

            const status = typeof res?.status === 'number' ? res.status : 200;
            const data = res?.data ?? res ?? {};
            const token = data?.access_token || data?.accessToken || data?.token;

            if (status >= 200 && status < 300 && token) {
                toast.success('Account created successfully!');
                // token + user already persisted in signup_owner()
                navigate('/setup/tenant', { replace: true });
                return;
            }

            const msg = data?.message || 'Signup failed.';
            toast.error(msg);
        } catch (err) {
            const msg = err?.response?.data?.message || "Signup failed.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = () => {
        navigate('/login/owner');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSignUp();
        }
    };

    return (
        <div className="min-h-screen flex">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
                <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
            </div>
            <div className="w-3/5 bg-[#fff1c1] p-10 py-5 flex flex-col px-30">
                <img src={Logo} alt="Logo" className='w-50 mx-5' />
                <div className="flex-1 flex flex-col justify-center max-w">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Start Your Journey Today{' '}
                        <span className="inline-block bg-[#fcd33f] text-black text-sm px-3 py-1 rounded-full align-middle">
                            FREE
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg mb-8">
                        Join thousands of merchants who manage their multi-channel ecommerce business
                        with DockiShip. Get started in minutes, no credit card required.
                    </p>

                    <div className="relative">
                        <img
                            src={SignupLogo}
                            alt="Signup"
                            className="w-full h-110 mt-3 hover:rotate-2"
                        />

                    </div>

                </div>

                {/* Footer */}
                <div className="text-sm text-gray-600 mx-10">
                    © 2025 DockiShip <a href="#" className="hover:text-blue-600">Terms of service</a> |
                    <a href="#" className="hover:text-blue-600 ml-1">Privacy policy</a> |
                    <a href="#" className="hover:text-blue-600 ml-1">Help center</a>
                </div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="w-2/5 bg-white flex items-center justify-center p-12">
                <div className="w-full max-w-md">
                    {/* Support Button */}
                    <div className="flex justify-end mb-10">
                        <button className="flex items-center gap-2 text-gray-700 hover:text-blue-600 text-sm font-medium">
                            <Headphones size={18} />
                            Support
                            <ChevronDown size={18} />
                        </button>
                    </div>

                    {/* Signup Form */}
                    <div className="bg-white">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create your account</h2>
                        <p className="text-gray-600 text-sm mb-8">Start managing your business today</p>

                        <div className="space-y-5">
                            {/* Full Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyPress}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                />
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="john@company.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyPress}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Create a strong password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyPress}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {formData.password && (
                                    <div className="mt-2 space-y-1">
                                        {passwordRequirements.map((req, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                    {req.met && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className={req.met ? 'text-green-600' : 'text-gray-500'}>{req.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        placeholder="Re-enter your password"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        onKeyDown={handleKeyPress}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {/* Terms Checkbox */}
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    disabled={isLoading}
                                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-600">
                                    I agree to the{' '}
                                    <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                                </label>
                            </div>

                            {/* Sign Up Button */}
                            <button
                                onClick={handleSignUp}
                                disabled={isLoading}
                                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                        Creating account...
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </button>
                        </div>

                        {/* Sign In Link */}
                        <div className="mt-6 text-center">
                            <span className="text-gray-600">Already have an account? </span>
                            <button
                                onClick={handleSignIn}
                                disabled={isLoading}
                                className="text-[#ffc700] hover:text-[#ffdd63] font-semibold"
                            >
                                Sign in
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}