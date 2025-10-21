import { useEffect, useState, Fragment } from 'react';
import { User, Mail, Globe, Save, Edit2, X, Key, Trash2, ChevronDown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { updateMyProfile } from '../lib/api';
import { useRequestReset } from '../hooks/usePasswordReset';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';

function cleanPhone(val) {
    return (val || '').trim();
}

export default function MyProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const resetMutation = useRequestReset();

    const [formData, setFormData] = useState({
        fullName: '-',
        email: '-',
        phone: '-',
        countryName: '',
        countryCode: '',
    });
    const [originalData, setOriginalData] = useState({ ...formData });

    const [phoneCode, setPhoneCode] = useState('+92');
    const [phoneLocal, setPhoneLocal] = useState('');

    const [countries, setCountries] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(true);

    const { data, isLoading, isError } = useAuthCheck();

    useEffect(() => {
        if (data?.user) {
            const u = data.user;
            setFormData(prev => ({
                ...prev,
                fullName: u.fullName ?? prev.fullName,
                email: u.email ?? prev.email,
                phone: u.phone ?? prev.phone,
                countryCode: u.country ?? prev.countryCode ?? '',
                countryName: prev.countryName,
            }));

            const p = (u.phone || '').trim();
            const match = p.match(/^\s*(\+\d{1,4})\s*(.*)$/);
            if (match) {
                setPhoneCode(match[1]);
                setPhoneLocal(match[2] || '');
            } else {
                setPhoneLocal(p || '');
            }

            setOriginalData(prev => ({
                ...prev,
                fullName: u.fullName ?? prev.fullName,
                email: u.email ?? prev.email,
                phone: u.phone ?? prev.phone ?? '-',
                countryCode: u.country ?? prev.countryCode ?? '',
                countryName: prev.countryName,
            }));
        }
    }, [data]);

    useEffect(() => {
        if (isError) {
            toast.error('Could not fetch profile. Please re-login.');
        }
    }, [isError]);

    useEffect(() => {
        let cancelled = false;
        async function loadCountries() {
            try {
                setLoadingCountries(true);
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd');
                const json = await res.json();
                const rows = (Array.isArray(json) ? json : [])
                    .map(r => {
                        const name = r?.name?.common ?? '';
                        const code = (r?.cca2 ?? '').toUpperCase();
                        const root = r?.idd?.root || '';
                        const suffixes = Array.isArray(r?.idd?.suffixes) ? r.idd.suffixes : [];
                        const dial = root && suffixes && suffixes.length
                            ? `${root}${suffixes[0]}`
                            : (root || '');
                        return { name, code, dial: dial ? (dial.startsWith('+') ? dial : `+${dial}`) : '' };
                    })
                    .filter(r => r.name && r.code)
                    .sort((a, b) => a.name.localeCompare(b.name));

                if (!cancelled) {
                    setCountries(rows);

                    const code = (formData.countryCode || '').toUpperCase();
                    if (code) {
                        const found = rows.find(c => c.code === code);
                        if (found) {
                            setFormData(prev => ({ ...prev, countryName: found.name, countryCode: found.code }));
                            setOriginalData(prev => ({ ...prev, countryName: found.name, countryCode: found.code }));
                        }
                    } else if (formData.countryName) {
                        const found = rows.find(c => c.name.toLowerCase() === formData.countryName.toLowerCase());
                        if (found) {
                            setFormData(prev => ({ ...prev, countryName: found.name, countryCode: found.code }));
                            setOriginalData(prev => ({ ...prev, countryName: found.name, countryCode: found.code }));
                        }
                    }
                }
            } catch {
                if (!cancelled) toast.error('Failed to load countries.');
            } finally {
                if (!cancelled) setLoadingCountries(false);
            }
        }
        loadCountries();
        return () => { cancelled = true; };
    }, []);

    const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSelectCountry = (country) => {
        if (!country) return;
        setFormData(prev => ({
            ...prev,
            countryCode: country.code,
            countryName: country.name,
        }));
    };

    const handleEdit = () => {
        setOriginalData({ ...formData });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setFormData({ ...originalData });
        setIsEditing(false);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const payload = {
                fullName: formData.fullName?.trim(),
                phone: cleanPhone(`${(phoneCode || '').trim()} ${phoneLocal?.trim()}`),
                country: (formData.countryCode || '').toUpperCase(),
            };
            await updateMyProfile(payload);
            setIsEditing(false);
            setOriginalData({ ...formData });
            setFormData(prev => ({ ...prev, phone: payload.phone }));
            toast.success('Profile updated successfully!');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to update profile';
            toast.error(String(msg));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        toast.loading('Sending reset link...', { duration: 1000 });
        try {
            const email = formData.email;
            const res = await resetMutation.mutateAsync({ email });
            const msg = res?.message || 'If this email exists, a reset link has been sent.';
            toast.success(`Reset link has been sent on ${formData.email}`);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to send reset link';
            toast.error(msg);
        }
    };

    const openDelete = () => {
        setConfirmText('');
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = () => {
        toast.loading('Deleting account...', { duration: 1000 });
        setTimeout(() => {
            toast.success('Account deleted successfully');
            setShowDeleteConfirm(false);
        }, 1200);
    };

    const card = 'rounded-2xl border border-gray-200 bg-white shadow-sm';
    const cardHead = 'px-6 py-4 border-b border-gray-200';
    const cardBody = 'px-6 py-5';
    const label = 'text-sm font-medium text-gray-700';
    const input =
        'w-full h-[40px] rounded-lg border border-gray-300 px-3.5 py-2.5 text-gray-900 ' +
        'focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-transparent';
    const primaryBtn =
        'inline-flex items-center gap-2 rounded-lg bg-[#FCD33F] px-4 py-2 text-sm font-semibold text-gray-900 ' +
        'shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10';
    const secondaryBtn =
        'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 ' +
        'hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10';
    const dangerBtn =
        'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white ' +
        'hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300';
    const selectedCountry = countries.find(c => c.code === (formData.countryCode || '').toUpperCase()) || null;

    const panelClasses =
        'absolute z-[100] mt-1 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm ' +
        'shadow-lg focus:outline-none min-w-[22rem] md:min-w-[28rem]';

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
                            <p className="text-sm text-gray-600">Manage your personal information</p>
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
                                    <div className="flex gap-2">
                                        {/* Dial code (Headless UI) */}
                                        <div className="w-[160px]">
                                            <Listbox value={phoneCode} onChange={setPhoneCode}>
                                                <div className="relative">
                                                    <ListboxButton className="relative w-full h-[40px] cursor-default rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                                        <span className="block">{phoneCode || '+—'}</span>
                                                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                                            <ChevronDown size={16} className="text-gray-500" />
                                                        </span>
                                                    </ListboxButton>
                                                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                        <ListboxOptions className={panelClasses}>
                                                            {countries
                                                                .filter(c => c.dial)
                                                                .map((c) => (
                                                                    <ListboxOption
                                                                        key={`${c.code}-${c.dial}`}
                                                                        value={c.dial}
                                                                        className={({ active }) =>
                                                                            `relative cursor-pointer select-none px-3 py-2 ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                                            }`
                                                                        }
                                                                    >
                                                                        {({ selected }) => (
                                                                            <div className="flex items-start gap-2 whitespace-normal break-words">
                                                                                <span className="min-w-[3.25rem] font-medium text-gray-900">{c.dial}</span>
                                                                                <span className="flex-1">{c.name}</span>
                                                                                {selected && <Check size={14} className="text-gray-900 mt-0.5" />}
                                                                            </div>
                                                                        )}
                                                                    </ListboxOption>
                                                                ))}
                                                        </ListboxOptions>
                                                    </Transition>
                                                </div>
                                            </Listbox>
                                        </div>

                                        {/* Local number */}
                                        <input
                                            type="tel"
                                            value={phoneLocal}
                                            onChange={(e) => setPhoneLocal(e.target.value)}
                                            className={`${input} flex-1`}
                                            placeholder="300 0000000"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-gray-900">{formData.phone}</p>
                                )}
                            </div>

                            {/* Country */}
                            <div className="flex flex-col gap-1.5">
                                <label className={label}>Country</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <Listbox
                                            value={selectedCountry}
                                            onChange={onSelectCountry}
                                            disabled={loadingCountries}
                                        >
                                            <div className="relative">
                                                <ListboxButton className="relative w-full h-[40px] cursor-default rounded-lg border border-gray-300 bg-white pl-3 pr-8 text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                                    <span className="block">
                                                        {selectedCountry ? selectedCountry.name : (loadingCountries ? 'Loading…' : 'Select a country')}
                                                    </span>
                                                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                                        <ChevronDown size={16} className="text-gray-500" />
                                                    </span>
                                                </ListboxButton>
                                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                    <ListboxOptions className={panelClasses}>
                                                        {!loadingCountries && countries.map((c) => (
                                                            <ListboxOption
                                                                key={c.code}
                                                                value={c}
                                                                className={({ active }) =>
                                                                    `relative cursor-pointer select-none px-3 py-2 ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                                    }`
                                                                }
                                                            >
                                                                {({ selected }) => (
                                                                    <div className="flex items-start gap-2 whitespace-normal break-words">
                                                                        <span className="min-w-[3.25rem] text-gray-500">{c.code}</span>
                                                                        <span className="flex-1">{c.name}</span>
                                                                        {selected && <Check size={14} className="text-gray-900 mt-0.5" />}
                                                                    </div>
                                                                )}
                                                            </ListboxOption>
                                                        ))}
                                                    </ListboxOptions>
                                                </Transition>
                                            </div>
                                        </Listbox>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-900">
                                        <Globe size={16} className="text-gray-500" />
                                        {(formData.countryName && formData.countryName !== '-' ? formData.countryName : '') || formData.countryCode || '—'}
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
                {/* <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
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
                </section> */}

                {/* Delete Confirmation Modal */}
                {/* {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[70]">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
                        <div className="relative z-[71] flex min-h-screen items-center justify-center p-4">
                            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
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

                                    <p className="mb-2 text-sm text-gray-700">
                                        Type <span className="font-semibold text-red-600">DELETE</span> to confirm:
                                    </p>
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
                                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex-1 justify-center"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )} */}
            </div>
        </>
    );
}
