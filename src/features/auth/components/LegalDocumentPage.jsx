import { ArrowLeft, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router';
import Logo from '../../../assets/logo1.png';

const slugify = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function LegalDocumentPage({
  title,
  subtitle,
  effectiveDate,
  icon: Icon,
  website,
  companyName = 'DockiShip',
  sections = [],
  contact = [],
}) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const sectionLinks = sections.map((section, index) => ({
    title: section.title,
    id: `section-${index + 1}-${slugify(section.title)}`,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff1c1] via-[#fffae6] to-[#fff1c1] relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-8 w-72 h-72 rounded-full bg-yellow-200/70 blur-3xl" />
        <div className="absolute top-36 right-8 w-72 h-72 rounded-full bg-orange-200/60 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 w-72 h-72 rounded-full bg-amber-200/60 blur-3xl" />
      </div>

      <header className="absolute inset-x-0 top-0 z-20 px-4 sm:px-6 py-4">
        <div className="w-full flex items-center justify-between">
          <img src={Logo} alt="DockiShip" className="h-16 sm:h-20 w-auto" />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      <main className="relative z-10 px-4 sm:px-6 pb-10">
        <div className="w-full pt-24 sm:pt-28">
          <div className="overflow-hidden rounded-3xl border border-yellow-200/60 bg-white/95 shadow-2xl">
            <div className="border-b border-yellow-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-white px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-wrap items-start gap-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  {Icon ? <Icon size={20} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600">{subtitle}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-gray-200">
                      <Clock3 size={14} />
                      Effective Date: {effectiveDate}
                    </span>
                    {website ? (
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 border border-gray-200">
                        {website}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
              <article className="space-y-4 p-6 sm:p-8">
                {sections.map((section, index) => (
                  <section
                    key={sectionLinks[index].id}
                    id={sectionLinks[index].id}
                    className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
                  >
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">{section.title}</h2>
                    <div className="mt-3 space-y-3 text-sm sm:text-base leading-7 text-gray-700">
                      {Array.isArray(section.paragraphs)
                        ? section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                        : null}
                      {Array.isArray(section.points) && section.points.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5">
                          {section.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                ))}

                {contact.length > 0 ? (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Contact Information</h2>
                    <div className="mt-3 space-y-2 text-sm sm:text-base text-gray-700">
                      {contact.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </section>
                ) : null}
              </article>

              <aside className="hidden lg:block border-l border-gray-100 bg-gray-50/70">
                <div className="sticky top-24 p-6">
                  <p className="text-sm font-semibold text-gray-800">On this page</p>
                  <nav className="mt-3 space-y-2">
                    {sectionLinks.map((link) => (
                      <a
                        key={link.id}
                        href={`#${link.id}`}
                        className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                      >
                        {link.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-600">
            {currentYear} {companyName}. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
