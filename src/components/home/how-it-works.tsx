export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Discover & Filter",
      description:
        "Browse curated listings by location, price range, bedrooms, and architectural property types with real-time database queries.",
    },
    {
      number: "02",
      title: "Inquire with Context",
      description:
        "Request detailed spec sheets, floorplans, or HOA information directly from the property page with one simple inquiry form.",
    },
    {
      number: "03",
      title: "Private Walkthroughs",
      description:
        "Coordinate private on-site viewings or virtual walkthroughs with an assigned estate specialist dedicated to your schedule.",
    },
    {
      number: "04",
      title: "Effortless Closing",
      description:
        "Navigate offers, contract disclosures, and closing steps with transparent guidance at every stage of the transaction.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-brand-sand/40 border-t border-brand-line/60">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-brand-gold">
            The Process
          </p>
          <h2 className="mt-2 font-serif text-3xl text-brand-ink sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-ink/70">
            A frictionless, transparent workflow designed to help you find and acquire exceptional real estate.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative flex flex-col rounded-sm border border-brand-line/80 bg-brand-cream p-6 shadow-xs"
            >
              <div className="font-serif text-3xl font-light text-brand-gold">
                {step.number}
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium text-brand-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-ink/70">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
