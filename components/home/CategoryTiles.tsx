import Link from 'next/link';
import Image from 'next/image';

export default function CategoryTiles() {
  const categories = [
    {
      title: 'Facial Skincare',
      subtitle: 'Gentle Cleansing & Moisture',
      href: '/shop?category=skin',
      image: '/images/vita-c-face-wash-lifestyle-480.webp',
      accent: '#E8651A',
      textColor: '#9C3400',
      bgColor: '#FDF1EA',
    },
    {
      title: 'Hair Strengthening',
      subtitle: 'Nourishes Scalp & Strengthens Roots',
      href: '/shop?category=hair',
      image: '/images/hair-growth-oil-lifestyle-480.webp',
      accent: '#C9952A',
      textColor: '#7A532B',
      bgColor: '#FAF5EA',
    },
    {
      title: 'Lip Nourishment',
      subtitle: 'Deep Moisture & Protection',
      href: '/shop?category=lips',
      image: '/images/lip-balm-jar-480.webp',
      accent: '#4A7FA5',
      textColor: '#244E6E',
      bgColor: '#EBF3F8',
    },
    {
      title: 'Sun Protection',
      subtitle: 'Broad Spectrum SPF-50 PA+++',
      href: '/shop?category=sun',
      image: '/images/spf50-sunscreen-lifestyle-480.webp',
      accent: '#3A7D44',
      textColor: '#245C2D',
      bgColor: '#EDF6EE',
    },
  ];

  return (
    <section className="py-16 bg-[#FBF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl font-bold text-[#3E2914]">
            Targeted Care by Category
          </h2>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Every formulation is tailored to address specific barrier and nourishment needs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group p-5 rounded-2xl border border-[#E8E0D5] bg-white hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              style={{ borderTop: `4px solid ${cat.accent}` }}
            >
              <div>
                {/* Category Product Image Thumbnail */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-[#FDFBF7]">
                  <Image
                    src={cat.image}
                    alt={`${cat.title} showcase`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    loading="lazy"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>

                <span
                  className="text-xs uppercase tracking-wider font-bold"
                  style={{ color: cat.textColor }}
                >
                  Collection
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1A1A1A] mt-1 group-hover:text-[#5C3D1E] transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">
                  {cat.subtitle}
                </p>
              </div>
              <div className="mt-5 flex items-center text-xs font-semibold text-[#5C3D1E] group-hover:text-[#C9952A] transition-colors">
                <span>View Products</span>
                <svg
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
