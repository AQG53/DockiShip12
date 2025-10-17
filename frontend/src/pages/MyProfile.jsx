import { useEffect, useState } from 'react';
import { User, Mail, Phone, Globe, DollarSign, Clock, Key, Trash2, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { useAuthCheck } from '../hooks/useAuthCheck';

export default function MyProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const [formData, setFormData] = useState({
        fullName: 'John Doe',
        email: 'john.doe@dockiship.com',
        phone: '+1 234 567 8900',
        country: 'United States',
        currency: 'USD',
        timeZone: 'America/New_York',
    });

    const [originalData, setOriginalData] = useState({ ...formData });

    const { data, isLoading, isError } = useAuthCheck();

    useEffect(() => {
        if (data?.user) {
            setFormData(prev => ({
                ...prev,
                fullName: data.user.fullName ?? prev.fullName,
                email: data.user.email ?? prev.email,
            }));
            setOriginalData(prev => ({
                ...prev,
                fullName: data.user.fullName ?? prev.fullName,
                email: data.user.email ?? prev.email,
            }));
        }
    }, [data]);

    useEffect(() => {
        if (isError) {
            toast.error('Could not fetch profile. Please re-login.');
        }
    }, [isError]);

    const countries = [
        'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
        'France', 'Japan', 'China', 'India', 'Brazil'
    ];

    const currencies = [
        { code: 'USD', name: 'US Dollar ($)' },
        { code: 'EUR', name: 'Euro (€)' },
        { code: 'GBP', name: 'British Pound (£)' },
        { code: 'CAD', name: 'Canadian Dollar (C$)' },
        { code: 'AUD', name: 'Australian Dollar (A$)' },
        { code: 'JPY', name: 'Japanese Yen (¥)' },
        { code: 'CNY', name: 'Chinese Yuan (¥)' },
        { code: 'INR', name: 'Indian Rupee (₹)' },
    ];

    const timeZones = [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
        'Australia/Sydney', 'Pacific/Auckland'
    ];

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleEdit = () => {
        setOriginalData({ ...formData });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setFormData({ ...originalData });
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // TODO: connect to backend: await api.updateProfile(formData)
        setTimeout(() => {
            setIsSaving(false);
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        }, 1200);
    };

    const handlePasswordReset = () => {
        toast.loading('Sending reset link...', { duration: 1000 });
        // TODO: connect to backend: await api.sendResetLink(formData.email)
        setTimeout(() => {
            toast.success(`Password reset link sent to ${formData.email}`);
        }, 1200);
    };

    const openDelete = () => {
        setConfirmText('');
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = () => {
        toast.loading('Deleting account...', { duration: 1000 });
        // TODO: connect to backend: await api.deleteAccount()
        setTimeout(() => {
            toast.success('Account deleted successfully');
            setShowDeleteConfirm(false);
        }, 1200);
    };

    // Shared UI tokens
    const card = 'rounded-2xl border border-gray-200 bg-white shadow-sm';
    const cardHead = 'px-6 py-4 border-b border-gray-200';
    const cardBody = 'px-6 py-5';
    const label = 'text-sm font-medium text-gray-700';
    const input =
        'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 ' +
        'focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-transparent';
    const select = input;
    const primaryBtn =
        'inline-flex items-center gap-2 rounded-lg bg-[#FCD33F] px-4 py-2 text-sm font-semibold text-gray-900 ' +
        'shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10';
    const secondaryBtn =
        'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 ' +
        'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10';
    const dangerBtn =
        'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white ' +
        'hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300';

    return (
        <>
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pt-20">
                {/* Page header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-10 shrink-0 rounded-lg bg-amber-100 border border-gray-200 flex items-center justify-center">
                            <User className="text-amber-700" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                            <p className="text-sm text-gray-600">Manage your personal information and preferences</p>
                        </div>
                    </div>

                    {!isEditing ? (
                        <button onClick={handleEdit} className={primaryBtn} disabled={isLoading}>
                            <Edit2 size={16} />
                            {isLoading ? 'Loading…' : 'Edit Profile'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={handleCancel} className={secondaryBtn}>
                                <X size={16} />
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className={`${primaryBtn} disabled:opacity-50`}>
                                {isSaving ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Personal Information */}
                <section className={card}>
                    <header className={cardHead}>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <User size={18} className="text-gray-700" />
                            Personal Information
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">Your basic profile details</p>
                    </header>

                    <div className={cardBody}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={onChange}
                                        className={input}
                                        placeholder="Enter your full name"
                                    />
                                ) : (
                                    <p className="text-gray-900">{formData.fullName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Email Address</label>
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-500" />
                                    <p className="text-gray-900">{formData.email}</p>
                                    <span className="ml-auto text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-600">Read-only</span>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Phone Number</label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={onChange}
                                        className={input}
                                        placeholder="+92 300 0000000"
                                    />
                                ) : (
                                    <p className="text-gray-900">{formData.phone}</p>
                                )}
                            </div>

                            {/* Country */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Country</label>
                                {isEditing ? (
                                    <select name="country" value={formData.country} onChange={onChange} className={select}>
                                        {countries.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Globe size={16} className="text-gray-500" />
                                        {formData.country}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences */}
                <section className={card}>
                    <header className={cardHead}>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Clock size={18} className="text-gray-700" />
                            Preferences
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">Localization and defaults</p>
                    </header>

                    <div className={cardBody}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Currency */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Currency</label>
                                {isEditing ? (
                                    <select name="currency" value={formData.currency} onChange={onChange} className={select}>
                                        {currencies.map((curr) => (
                                            <option key={curr.code} value={curr.code}>
                                                {curr.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <DollarSign size={16} className="text-gray-500" />
                                        {currencies.find((c) => c.code === formData.currency)?.name || formData.currency}
                                    </div>
                                )}
                            </div>

                            {/* Time Zone */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Time Zone</label>
                                {isEditing ? (
                                    <select name="timeZone" value={formData.timeZone} onChange={onChange} className={select}>
                                        {timeZones.map((tz) => (
                                            <option key={tz} value={tz}>
                                                {tz.replace(/_/g, ' ')}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Clock size={16} className="text-gray-500" />
                                        {formData.timeZone.replace(/_/g, ' ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className={card}>
                    <header className={cardHead}>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Key size={18} className="text-gray-700" />
                            Security
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">Manage your password and account security</p>
                    </header>

                    <div className={`${cardBody} pt-4`}>
                        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">Password</h3>
                                <p className="mt-0.5 text-sm text-gray-600">Last changed 30 days ago</p>
                            </div>
                            <button onClick={handlePasswordReset} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                                <Key size={16} />
                                Reset Password
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
                    <header className="px-6 py-4 border-b border-red-200">
                        <h2 className="text-base font-semibold text-red-700 flex items-center gap-2">
                            <Trash2 size={18} />
                            Danger Zone
                        </h2>
                        <p className="mt-1 text-sm text-red-600">Irreversible and destructive actions</p>
                    </header>

                    <div className="px-6 py-5">
                        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-red-800">Delete Account</h3>
                                <p className="mt-0.5 text-sm text-red-700">Permanently delete your account and all associated data</p>
                            </div>
                            <button onClick={openDelete} className={dangerBtn}>
                                <Trash2 size={16} />
                                Delete Account
                            </button>
                        </div>
                    </div>
                </section>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[70]">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
                        <div className="relative z-[71] flex min-h-screen items-center justify-center p-4">
                            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                                <div className="px-6 py-4 bg-red-600 text-white">
                                    <h2 className="text-base font-semibold flex items-center gap-2">
                                        <Trash2 size={18} />
                                        Confirm Account Deletion
                                    </h2>
                                </div>

                                <div className="px-6 py-5">
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                        <p className="text-sm font-semibold text-red-800">⚠️ This action cannot be undone.</p>
                                    </div>

                                    <p className="mb-2 text-sm text-gray-700">Type <span className="font-semibold text-red-600">DELETE</span> to confirm:</p>
                                    <input
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="Type DELETE to confirm"
                                        className={input}
                                    />

                                    <div className="mt-5 flex gap-3">
                                        <button onClick={() => setShowDeleteConfirm(false)} className={secondaryBtn}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDeleteAccount}
                                            disabled={confirmText !== 'DELETE'}
                                            className={`${dangerBtn} flex-1 justify-center disabled:opacity-50`}
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
