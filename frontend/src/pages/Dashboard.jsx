// src/pages/Dashboard.jsx
import React from "react";
import Navbar from "../components/Navbar";
import {
  CheckCircle2,
  ChevronRight,
  Building2,
  Truck,
  PackageOpen,
  ListChecks,
  ShoppingCart,
  BarChart3,
  Store,
  Users,
  Settings,
  SquarePlus,
  Bell,
  PlayCircle,
  LifeBuoy,
} from "lucide-react";

const card = "rounded-2xl border border-gray-200 bg-white shadow-sm";
const sectionTitle = "text-base font-semibold text-gray-900";
const subText = "text-sm text-gray-600";

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        {/* Top grid: Setup Wizard + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Setup wizard */}
          <SetupWizard className="lg:col-span-2" />
          {/* Quick actions */}
          <QuickActions />
        </div>

        {/* Stats row */}
        <div className="mt-6">
          <StatsRow />
        </div>

        {/* Middle grid: Chart + About/Service */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <ChartCard className="lg:col-span-2" />
          <RightInfoRail />
        </div>

        {/* Bottom grid: Special features + Tutorials + Help center */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <SpecialFeatures className="xl:col-span-2" />
          <HelpCenter />
        </div>
      </div>
    </>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */

function SetupWizard({ className = "" }) {
  const steps = [
    { id: 1, title: "Shop Authorization", done: false },
    { id: 2, title: "Publish the first product", done: false },
    { id: 3, title: "Process the first order", done: false },
  ];

  const marketplaces = [
    "Amazon",
    "eBay",
    "Walmart",
    "TikTok Shop",
    "Shopify",
    "Etsy",
    "WooCommerce",
    "Temu",
    "Shein",
    "Kaufland",
    "OTTO",
    "Cdiscount",
    "Miravia",
  ];

  return (
    <section className={`${card} ${className}`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`${sectionTitle}`}>Welcome to DockiShip Setup Wizard</h3>
            <p className={`${subText} mt-1`}>
              Ready to streamline operations? Complete these quick steps.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>0/3</span>
            <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-amber-500" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 border border-gray-200 rounded-xl overflow-hidden">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                i !== steps.length - 1 ? "md:border-r border-gray-200" : ""
              } ${s.done ? "bg-amber-50" : "bg-white"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    s.done ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {String(s.id).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-gray-800">{s.title}</span>
              </div>
              <CheckCircle2
                size={18}
                className={s.done ? "text-amber-600" : "text-gray-300"}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {marketplaces.map((m) => (
            <button
              key={m}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 transition"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  const items = [
    { icon: Store, label: "Connect shop" },
    { icon: Truck, label: "Add carriers" },
    { icon: ListChecks, label: "Processing orders" },
    { icon: PackageOpen, label: "Logistics tracking" },
    { icon: SquarePlus, label: "Listing migration" },
    { icon: ShoppingCart, label: "Create listing" },
  ];

  return (
    <aside className={`${card}`}>
      <div className="p-5">
        <h3 className={sectionTitle}>Quick actions</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {items.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:bg-amber-50 transition"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Icon size={18} className="text-amber-600" />
              </span>
              <span className="text-sm font-medium text-gray-800">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function StatsRow() {
  const stats = [
    { label: "To-Ship", value: 0 },
    { label: "In Process", value: 0 },
    { label: "Awaiting Return", value: 0 },
    { label: "Over 24 hours not picked up", value: 0 },
  ];
  return (
    <section className={`${card}`}>
      <div className="p-5">
        <h3 className={sectionTitle}>To do</h3>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1"
            >
              <span className="text-xs text-gray-500">{s.label}</span>
              <span className="text-2xl font-bold text-gray-900">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartCard({ className = "" }) {
  // Frontend-only placeholder
  const metrics = [
    { title: "Total Sales Revenue (Last 30 days)", value: "$0.00" },
    { title: "Total Orders (Last 30 days)", value: "0" },
  ];

  return (
    <section className={`${card} ${className}`}>
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((m) => (
            <div key={m.title} className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{m.title}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <BarChart3 size={18} className="text-amber-700" />
                </span>
                <p className="text-sm font-medium text-gray-900">Orders & Revenue</p>
              </div>
              <span className="text-xs text-gray-500">Currency: USD</span>
            </div>

            {/* Simple line placeholder */}
            <div className="mt-4 h-48 w-full rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
              Chart placeholder
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RightInfoRail() {
  return (
    <aside className="space-y-6">
      <Announcements />
      <AboutCard />
    </aside>
  );
}

function Announcements() {
  const items = [
    { title: "New: Draft page now supports bulk editing", date: "09-25" },
    { title: "Now supports integration with GOFO", date: "09-18" },
    { title: "Enable inventory sync (linkage)", date: "09-10" },
  ];
  return (
    <section className={`${card}`}>
      <div className="p-5">
        <h3 className={sectionTitle}>Announcements</h3>
        <ul className="mt-3 divide-y divide-gray-200">
          {items.map((a, i) => (
            <li key={i} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800">{a.title}</p>
                <span className="text-xs text-gray-500 shrink-0">{a.date}</span>
              </div>
            </li>
          ))}
        </ul>
        <button className="mt-2 inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900">
          More <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

function AboutCard() {
  return (
    <section className={`${card}`}>
      <div className="p-5">
        <h3 className={sectionTitle}>About DockiShip</h3>
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
          <PlayCircle className="text-amber-600" size={22} />
          <p className="text-sm text-gray-700">Watch a short overview</p>
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">Customer service</h4>
          <div className="flex flex-col gap-2 text-sm">
            <a className="text-amber-700 hover:underline" href="#">
              Messenger
            </a>
            <a className="text-amber-700 hover:underline" href="#">
              WhatsApp
            </a>
            <a className="text-amber-700 hover:underline" href="#">
              support@dockiship.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecialFeatures({ className = "" }) {
  const features = [
    { icon: PackageOpen, title: "Catalog", desc: "Manage multi-channel listings centrally" },
    { icon: ListChecks, title: "Processing orders", desc: "Track & fulfill with ease" },
    { icon: Settings, title: "Inventory Sync", desc: "Keep stock up-to-date" },
    { icon: Users, title: "Amazon MCF", desc: "Leverage Amazon fulfillment" },
  ];
  return (
    <section className={`${card} ${className}`}>
      <div className="p-5">
        <h3 className={sectionTitle}>Special feature</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <Icon size={18} className="text-amber-600" />
                </span>
                <p className="font-medium text-gray-900">{title}</p>
              </div>
              <p className="mt-2 text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>

        {/* Tutorials */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900">Video tutorials</h4>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Manage listings centrally", "Migrate to TikTok quickly", "Shopify to TikTok"]
              .map((t) => (
                <div key={t} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    Thumbnail
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900">{t}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HelpCenter() {
  const items = [
    "How to enable inventory sync",
    "How to fulfill orders via MCF",
    "How to map carriers",
    "Connect your first sales channel",
  ];
  return (
    <section className={`${card}`}>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <LifeBuoy size={18} className="text-amber-600" />
          <h3 className={sectionTitle}>Help center</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {items.map((t) => (
            <li key={t}>
              <a href="#" className="group flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-amber-50">
                <span className="text-sm text-gray-800">{t}</span>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-700" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
