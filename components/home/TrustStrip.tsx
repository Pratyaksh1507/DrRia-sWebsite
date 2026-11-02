export default function TrustStrip() {
  const trustPoints = [
    {
      title: 'Made in India',
      description: 'Formulated and produced locally',
    },
    {
      title: 'Ingredient lists on every product',
      description: '100% transparent packaging disclosure',
    },
    {
      title: 'Patch-test guidance',
      description: 'Recommended before first application',
    },
    {
      title: 'Customer care: +91-9469088317',
      description: 'Available Mon–Sat for assistance',
    },
  ];

  return (
    <section className="bg-white border-b border-[#E8E0D5] py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {trustPoints.map((point) => (
            <div key={point.title} className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5]/60 flex flex-col justify-center">
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
