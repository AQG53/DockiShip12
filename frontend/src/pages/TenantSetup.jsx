import { useEffect, useState } from 'react';
import { Plus, Building2, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import Logo from '../assets/logo1.png'
import toast from "react-hot-toast";
import { useCreateTenant } from '../hooks/useCreateTenant';
import { logout } from '../lib/api';

export default function TenantSetup() {
    const [tenants, setTenants] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [isAdding, setIsAdding] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitIndex, setSubmitIndex] = useState(0);
    const createTenantMutation = useCreateTenant();

    useEffect(() => {
        const token = localStorage.getItem("ds_access_token");
        if (!token) {
            toast.error("Session expired. Please log in.");
            navigate("/login/owner");
        }
    }, [navigate]);


    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddTenant = () => {
        if (!formData.name.trim()) {
            toast.error('Please enter a tenant name');
            return;
        }
        setIsAdding(true);
        setTimeout(() => {
            const newTenant = {
                id: Date.now(),
                name: formData.name.trim(),
                description: formData.description.trim(),
                createdAt: new Date().toISOString(),
            };
            setTenants((prev) => [...prev, newTenant]);
            setFormData({ name: '', description: '' });
            setShowSuccess(true);
            setIsAdding(false);
            setTimeout(() => setShowSuccess(false), 1200);
        }, 200);
    };

    const handleRemoveTenant = (id) => {
        if (isSubmitting) return;
        setTenants((t) => t.filter((x) => x.id !== id));
    };

    const handleFinish = async () => {
        if (tenants.length === 0) {
            toast.error('Please create at least one tenant');
            return;
        }
        try {
            setIsSubmitting(true);
            setSubmitIndex(0);

            for (let i = 0; i < tenants.length; i++) {
                setSubmitIndex(i + 1);
                const t = tenants[i];
                await createTenantMutation.mutateAsync({
                    tenantName: t.name,
                    description: t.description || '',
                });
            }

            toast.success(
                `Successfully created ${tenants.length} ${tenants.length === 1 ? 'tenant' : 'tenants'}`
            );
            logout();
            navigate('/login/owner')
            
        } catch (e) {
            const msg = e?.response?.data?.message || 'Failed to create tenants';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
            setSubmitIndex(0);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isAdding) {
            handleAddTenant();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#fff1c1] via-[#fffae6] to-[#fff1c1] flex items-center justify-center p-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
                <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
            </div>

            <div className="w-full max-w-4xl relative">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src={Logo} alt="Logo" className='w-50 mx-5' />

                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-3">
                        Create Your Tenants
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Set up your business entities to start managing your operations. You can create multiple tenants and switch between them anytime.
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    {showSuccess && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <Check size={18} className="text-white" />
                            </div>
                            <p className="text-green-700 font-medium">Tenant added successfully!</p>
                        </div>
                    )}

                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Add New Tenant</h2>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Tenant Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g., Acme Corporation"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyPress}
                                    disabled={isAdding || isSubmitting}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Description <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Brief description of your tenant..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    disabled={isAdding || isSubmitting}
                                    rows="3"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none transition-all"
                                />
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAddTenant}
                                disabled={isAdding || isSubmitting}
                                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isAdding ? (
                                    <>
                                        <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Add Tenant
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {tenants.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Building2 size={20} className="text-blue-600" />
                                Your Tenants ({tenants.length})
                            </h3>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {tenants.map((tenant, index) => (
                                    <div
                                        key={tenant.id}
                                        className="from-blue-50 to-gray-50 bg-gradient-to-r border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:shadow-md transition-all duration-200"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                                    #{index + 1}
                                                </span>
                                                <h4 className="font-bold text-gray-800">{tenant.name}</h4>
                                            </div>
                                            {tenant.description && (
                                                <p className="text-sm text-gray-600 mt-1">{tenant.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                Created: {new Date(tenant.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveTenant(tenant.id)}
                                            className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                        <button
                            onClick={() => setTenants([])}
                            disabled={tenants.length === 0 || isSubmitting}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleFinish}
                            disabled={tenants.length === 0 || isSubmitting}
                            className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    Creating {submitIndex}/{tenants.length}…
                                </>
                            ) : (
                                <>Continue with {tenants.length} {tenants.length === 1 ? 'Tenant' : 'Tenants'}</>
                            )}
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        You can add more tenants later from your dashboard settings
                    </p>
                </div>

                <div className="text-center mt-8 text-sm text-gray-600">
                    © 2025 DockiShip • <a href="#" className="hover:text-gray-800">Help</a>
                </div>
            </div>
        </div>
    );
}