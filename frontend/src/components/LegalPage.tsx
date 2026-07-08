import { LEGAL_LINKS, LegalDocument } from "../legalDocuments";

export default function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <div data-theme="dark" className="legal-page min-h-screen bg-[#05070a] px-5 py-8 text-neutral-200">
      <main className="mx-auto max-w-3xl">
        <a href="/" className="mb-8 inline-flex text-sm font-semibold text-neutral-400 transition hover:text-white">
          ← На главную
        </a>

        <header className="mb-8 border-b border-neutral-900 pb-6">
          <h1 className="font-display text-3xl font-bold leading-tight text-white">{document.title}</h1>
          {document.effectiveDate && (
            <p className="mt-3 text-sm text-neutral-500">Дата вступления в силу: {document.effectiveDate}</p>
          )}
        </header>

        <div className="space-y-8">
          {document.sections.map((section, index) => (
            <section key={`${section.title || "section"}-${index}`} className="space-y-3">
              {section.title && <h2 className="font-display text-lg font-semibold text-neutral-100">{section.title}</h2>}
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-neutral-350">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="space-y-2 pl-5 text-sm leading-7 text-neutral-350">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <nav className="mt-10 grid gap-2 border-t border-neutral-900 pt-6 text-sm">
          {LEGAL_LINKS.filter((link) => link.href !== document.path).map((link) => (
            <a key={link.href} href={link.href} className="text-neutral-500 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
