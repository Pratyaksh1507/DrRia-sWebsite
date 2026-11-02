export default function WhyDrRias() {
  const pillars = [
    {
      title: 'Dermatologist-Designed',
      description:
        'Crafted with clinical-grade active percentages and proven hydrators like Hyaluronic Acid, Ceramides, and Kojic Acid.',
      accent: '#4A7FA5',
    },
    {
      title: 'Natural Actives & Pure Oils',
      description:
        'Formulated with cold-pressed botanical oils (Bhringraj, Fenugreek, Amla, Jojoba) without dilution, parabens, or heavy petroleum fillers.',
      accent: '#C9952A',
    },
    {
      title: 'Made in India for Indian Climates',
      description:
        'Engineered to resist humidity, non-greasy on oily zones, and deeply protective against tropical UV exposure and hard water.',
      accent: '#3A7D44',
    },
  ];

  return (
    <section className="py-16 bg-white border-y border-[#E8E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-widest uppercase text-[#7A532B]">
            The Clinical Luxury Standard
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
            Why Choose Dr Ria&apos;s?
          </h2>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Clean cosmetic science rooted in authentic botanical integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="p-8 rounded-2xl bg-[#FDFBF7] border border-[#E8E0D5] flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-5 shadow-xs"
                  style={{ backgroundColor: pillar.accent }}
                >
                  ✓
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed mt-3">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
