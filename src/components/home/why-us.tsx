export function WhyUs() {
  const pillars = [
    {
      title: "Curated Architectural Portfolio",
      description:
        "Every residence in our collection is hand-selected for exceptional architectural merit, prime location, and lasting design value.",
      icon: (
        <svg className="h-6 w-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Transparent Real-Estate Guidance",
      description:
        "We provide transparent property insights, accurate square footages, HOA specifications, and localized neighborhood intelligence.",
      icon: (
        <svg className="h-6 w-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Rapid Lead & Inquiry Routing",
      description:
        "Inquiries route directly with full property context, ensuring immediate, tailored responses from dedicated market specialists.",
      icon: (
        <svg className="h-6 w-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Seamless Private Viewings",
      description:
        "Experience properties on your schedule with coordinated in-person walkthroughs, architectural documentation, and virtual tours.",
      icon: (
        <svg className="h-6 w-6 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="why-us" className="py-20 bg-brand-cream">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
            The Aether Standard
          </p>
          <h2 className="mt-2 font-serif text-3xl text-brand-ink sm:text-4xl">
            Why Choose Aether Estates
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-ink/70">
            We combine high-touch advisory with modern real-estate technology to elevate your property acquisition journey.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="flex flex-col rounded-sm border border-brand-line/80 bg-brand-sand/30 p-6 transition-all duration-200 hover:border-brand-ink/30 hover:bg-brand-sand/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-cream border border-brand-line/60 shadow-xs mb-5">
                {pillar.icon}
              </div>
              <h3 className="font-serif text-lg font-medium text-brand-ink">
                {pillar.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-ink/70">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
