export default function TrustStrip() {
  const trustPoints = [
    {
      title: 'Made Safe',
      description: 'Zero harsh sulphates or toxic fillers',
    },
    {
      title: 'Paraben Free',
      description: 'Clean daily formulations',
    },
    {
      title: 'GMP Certified',
      description: 'Manufactured to medical standards',
    },
    {
      title: 'ISO 9001',
      description: 'Audited quality management',
    },
    {
      title: 'Natural Actives',
      description: 'Botanical oils & verified clinicals',
    },
  ];

  return (
    <section className="bg-white border-b border-[#E8E0D5] py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
          {trustPoints.map((point) => (
            <div key={point.title} className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5]/60">
              <span className="block font-serif text-sm font-bold text-[#5C3D1E]">
                {point.title}
              </span>
              <span className="block text-xs text-[#6B6B6B] mt-1">
                {point.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
