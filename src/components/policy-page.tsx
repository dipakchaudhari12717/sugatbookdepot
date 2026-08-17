interface Section {
  heading: string;
  body: string[];
}

/** Shared layout for the shipping / privacy / terms pages. */
export function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  sections: Section[];
}) {
  return (
    <div className="container-page py-12 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="rule-ornament mt-4 font-display text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          {title}
        </h1>
        {intro && <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-soft">{intro}</p>}

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold text-ink">{section.heading}</h2>
              <div className="prose-book mt-3 text-[0.9375rem]">
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-rule pt-6 text-xs text-ink-faint">
          Questions about this policy? Write to sugat4books@gmail.com.
        </p>
      </div>
    </div>
  );
}
