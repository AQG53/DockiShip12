import { useEffect, useState } from 'react';
import { Building2, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import Logo from '../assets/logo1.png';
import toast from 'react-hot-toast';
import { useCreateTenant } from '../hooks/useCreateTenant';
import { logout } from '../lib/api';
import { ConfirmModal } from '../components/ConfirmModal';

export default function CompanySetup() {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const createTenantMutation = useCreateTenant();

  useEffect(() => {
    const token = localStorage.getItem('ds_access_token');
    if (!token) {
      toast.error('Session expired. Please log in.');
      navigate('/login/owner');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const openConfirm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setIsSubmitting(true);
      await createTenantMutation.mutateAsync({
        tenantName: formData.name.trim(),
        description: (formData.description || '').trim(),
      });
      toast.success('Company registered successfully');
      logout();
      navigate('/login/owner');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to register company';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login/owner');
  };


  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#fff1c1] via-[#fffae6] to-[#fff1c1] relative">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="DockiShip" className="h-20 w-auto px-15" />
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg text-gray-800 font-medium text-sm px-4 py-2"
        >
          <LogOut size={16} className="text-red-600" />
          Change User
        </button>
      </div>

      <div className="h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-[620px]">
          <div className="bg-white/95 rounded-3xl shadow-2xl border border-yellow-200/60 p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Building2 size={18} className="text-amber-700" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                Register your company
              </h1>
            </div>

            <p className="text-gray-600 text-sm mb-6">
              Set up your company to start managing your operations. You can register exactly one company for this account.
            </p>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-200 mb-5">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Acme Corporation"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description{' '}
                    <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    name="description"
                    placeholder="Brief description of your company..."
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={openConfirm}
              disabled={isSubmitting || !formData.name.trim()}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Registering…' : 'Register Company'}
            </button>
          </div>

          <div className="text-center text-xs text-gray-600 mt-4">
            © 2025 DockiShip • <a href="#" className="hover:text-gray-800">Help</a>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Confirm Company Registration"
          open={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmCreate}
          loading={isSubmitting}
        >
          <div className="space-y-2">
            <p className="text-gray-700">You are about to register the following company:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-semibold">Name:</span>{' '}
                <span className="text-gray-800">{formData.name || '-'}</span>
              </p>
              <p className="text-sm mt-2">
                <span className="font-semibold">Description:</span>{' '}
                <span className="text-gray-800">
                  {formData.description?.trim() ? formData.description : '—'}
                </span>
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Press <span className="font-semibold">Confirm</span> to proceed.
            </p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
