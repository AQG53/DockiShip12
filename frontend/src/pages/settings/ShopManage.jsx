import { useState } from 'react';
import { Clock, DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShopManage() {
  const [form, setForm] = useState({
    currency: 'USD',
    timeZone: 'Asia/Karachi',
  });

  const currencies = [
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'CNY', name: 'Chinese Yuan (¥)' },
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'PKR', name: 'Pakistani Rupee (₨)' },
  ];

  const timeZones = [
    'Asia/Karachi',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSave = () => {
    toast.success('Preferences saved (frontend only)');
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

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pt-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Shop Manage</h1>
          <button onClick={onSave} className={primaryBtn}>
            <Save size={16} />
            Save
          </button>
        </div>

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
                <select name="currency" value={form.currency} onChange={onChange} className={select}>
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Zone */}
              <div className="flex flex-col gap-1.5">
                <label className={label}>Time Zone</label>
                <select name="timeZone" value={form.timeZone} onChange={onChange} className={select}>
                  {timeZones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
