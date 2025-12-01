import { useEffect, useState } from 'react';
import { Building2, DollarSign, Clock, Trash2, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthCheck } from '../../auth/hooks/useAuthCheck';
import useUpdateTenant from '../../../hooks/useTenant';
import { deleteCurrentTenant, logout } from '../../../lib/api';

export default function ShopManage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { data, isLoading, isError } = useAuthCheck();
  const [payload, setPayload] = useState(null);
  const updateTenantMutation = useUpdateTenant();
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: '-',
    description: '-',
    currency: '-',
    timeZone: '-',
  });

  const [originalData, setOriginalData] = useState({ ...formData });

  useEffect(() => {
    if (data?.tenant) {
      console.log(data);
      const t = data.tenant;
      setFormData(prev => ({
        ...prev,
        name: t.name ?? prev.name,
        description: t.description ?? prev.description,
        currency: t.currency ?? prev.currency,
        timeZone: t.timezone ?? prev.timeZone,
      }));

      setOriginalData(prev => ({
        ...prev,
        name: t.name ?? prev.name,
        description: t.slug ?? prev.description,
        currency: t.currency ?? prev.currency,
        timeZone: t.timezone ?? prev.timeZone,
      }));
    }
  }, [data]);

  useEffect(() => {
    if (isError) {
      toast.error('Could not fetch profile. Please re-login.');
    }
  }, [isError]);

  const currencies = [
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'CNY', name: 'Chinese Yuan (¥)' },
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'PKR', name: 'Pakistani Rupee (Rs)' },
  ];

  const timeZones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Islamabad',
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
    try {
      setIsSaving(true);
      await updateTenantMutation.mutateAsync({
        name: (formData.name || "").trim(),
        description: (formData.description || "").trim(),
        currency: formData.currency || undefined,
        timezone: formData.timeZone || undefined,
      });
      setIsEditing(false);
    } finally {
      window.location.reload();
      setIsSaving(false);
    }
  };

  const openDelete = () => {
    setConfirmText('');
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCompany = async () => {
    if (confirmText !== 'DELETE' || isDeleting) return;

    try {
      setIsDeleting(true);
      toast.loading('Deleting company…');

      const ok = await deleteCurrentTenant();
      toast.dismiss();

      if (ok) {
        toast.success('Company deleted successfully');
        setShowDeleteConfirm(false);
        logout();
      } else {
        toast.error('Failed to delete company');
      }
    } catch (err) {
      toast.dismiss();
      const msg = err?.response?.data?.message || 'Delete failed';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

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

  // 🔧 Wrapper matches RoleManage layout (space-y-4, settings content area)
  return (
    <div className="space-y-4">
      {/* Page header (aligned with RoleManage) */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shop Manage</h1>
        {!isEditing ? (
          <button onClick={handleEdit} className={primaryBtn}>
            <Edit2 size={16} />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className={secondaryBtn}>
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`${primaryBtn} disabled:opacity-50`}
            >
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

      {/* Company Information */}
      <section className={card}>
        <header className={cardHead}>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={18} className="text-gray-700" />
            Company Information
          </h2>
          <p className="mt-1 text-sm text-gray-600">Your company’s basic details</p>
        </header>

        <div className={cardBody}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div className="flex flex-col gap-1.5">
              <label className={label}>Company Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  className={input}
                  placeholder="e.g., Acme Corporation"
                />
              ) : (
                <p className="text-gray-900">{formData.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className={label}>Description</label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={onChange}
                  rows={3}
                  className={`${input} min-h-[98px]`}
                  placeholder="Brief description of your company…"
                />
              ) : (
                <p className="text-gray-900">{formData.description || '—'}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Preferences (unchanged) */}
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

      {/* Danger Zone → Delete Company */}
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
              <h3 className="font-semibold text-red-800">Delete Company</h3>
              <p className="mt-0.5 text-sm text-red-700">
                Permanently delete your company and all associated data
              </p>
            </div>
            <button onClick={openDelete} className={dangerBtn}>
              <Trash2 size={16} />
              Delete Company
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-[71] flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="px-6 py-4 bg-red-600 text-white">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Trash2 size={18} />
                  Confirm Company Deletion
                </h2>
              </div>

              <div className="px-6 py-5">
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-800">
                    ⚠️ This action cannot be undone.
                  </p>
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
                    onClick={confirmDeleteCompany}
                    disabled={confirmText !== 'DELETE' || isDeleting}
                    className={`${dangerBtn} flex-1 justify-center disabled:opacity-50`}
                  >
                    {isDeleting ? 'Deleting…' : 'Delete Company'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
