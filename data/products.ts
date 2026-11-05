export interface ProductImage {
  src: string;
  webpSrcSet: string;
  avifSrcSet: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: 'lips' | 'skin' | 'hair' | 'sun';
  categoryLabel: string;
  accentColor: string;
  price: number;
  mrp?: number;
  discountPercentage?: number;
  size: string;
  images: ProductImage[];
  heroImageIndex: number;
  keyIngredients: string[];
  benefits: string[];
  fullIngredients: string;
  howToUse: string;
  storage?: string;
  complianceNote: string;
  manufacturerDetails: string;
  marketedBy: string;
  mfgLicNo?: string;
  badges?: string[];
  description: string;
  inStock: boolean;
  stockQuantity?: number;
  hsnCode?: string;
  taxRate?: number;
  isActive?: boolean;
}

export const products: Product[] = [
  {
    id: 'drria-lip-balm',
    slug: 'anti-pigmentation-lip-balm',
    name: 'Anti Pigmentation Lip Balm',
    tagline: 'Deep Moisture & Lip Protection',
    category: 'lips',
    categoryLabel: 'Lip Care',
    accentColor: '#4A7FA5',
    price: 333,
    size: '',
    heroImageIndex: 0,
    description:
      'Lip care formulated to provide deep moisture, nourishing care, and smoother-looking lips with botanical butters and gentle actives.',
    badges: ['Natural Butters', 'Deep Moisture'],
    keyIngredients: [
      'Shea Butter',
      'Jojoba Oil',
      'Avocado Butter',
      'Hyaluronic Acid',
      'Ceramide NP',
      'Kojic Acid',
      'Alpha Arbutin',
    ],
    benefits: [
      'Deep Moisture',
      'Nourishes & Protects',
      'Smoother-Looking Lips',
    ],
    fullIngredients:
      'Octyl Palmitate, Jojoba Oil (Simmondsia Chinensis Seed Oil), Avocado Butter (Persea Gratissima), Ozokerite Wax, Microcrystalline Wax, Candelilla Wax, Butyrospermum Parkii (Shea Butter), Citrus Nobilis (Mandarin Orange) Peel Oil, Octocrylene, Kojic Acid, Alpha Arbutin, Tocopheryl Acetate, Perfume, Ceramide NP, Hyaluronic Acid.',
    howToUse:
      'Take a small amount and apply evenly on lips. Reapply as needed for soft, smooth and nourished lips.',
    storage: 'Store in a cool and dry place. Keep away from direct heat and sunlight.',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use. Discontinue use if irritation occurs.',
    marketedBy: '93-c Shastri Nagar, Jammu 180004',
    manufacturerDetails:
      'Trassally International Pvt. Ltd., B 35, Sector 57, Noida, G.B. Nagar, U.P 201301',
    mfgLicNo: 'COS8UP2025000021',
    inStock: true,
    images: [
      {
        src: '/images/lip-balm-jar-768.webp',
        webpSrcSet:
          '/images/lip-balm-jar-480.webp 480w, /images/lip-balm-jar-768.webp 768w, /images/lip-balm-jar-1200.webp 1200w',
        avifSrcSet:
          '/images/lip-balm-jar-480.avif 480w, /images/lip-balm-jar-768.avif 768w, /images/lip-balm-jar-1200.avif 1200w',
        alt: "Dr Ria's Anti Pigmentation Lip Balm jar",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRrYAAABXRUJQVlA4IKoAAADQBACdASoUABQAPtFgqU+oJSOiKAgBABoJYwCo9AfbyQYmIxpjiiOmS44RdbOkwAD+mfGdjNkBBCPmiidncWJdmRzjTMTqhRsuRZXwii34h96drfVCyYXUCccisOJtviBDuQmPnWF1hV7594gZ664nXvyEOC5SbDVQ/due2f3PThp3xvihwgOFg5WOlGWDp2+GSiBkUJmkN3fxKR/S0ETiQXHnoMEnA3+uAA==',
      },
      {
        src: '/images/lip-balm-benefits-768.webp',
        webpSrcSet:
          '/images/lip-balm-benefits-480.webp 480w, /images/lip-balm-benefits-768.webp 768w, /images/lip-balm-benefits-1200.webp 1200w',
        avifSrcSet:
          '/images/lip-balm-benefits-480.avif 480w, /images/lip-balm-benefits-768.avif 768w, /images/lip-balm-benefits-1200.avif 1200w',
        alt: "Dr Ria's Anti Pigmentation Lip Balm key benefits infographic highlighting deep moisture and nourishment",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAADwBACdASoUABQAPtFaqE4oJKQiKAqpABoJQBibAexsOeQIThNGInLH5dZyUHBCr4AA/spo/BF2dPNiT7Ek0dIWc0B7xzDMr4dy+4YZreLGoVpUam47S2EEXogSGUDwdVN5CvCBbXwzslFlxA6w4nA8NIWzJQLaJiV/bSH9M8rnn3NEaGxx8S/48vV29+SpwZ4oEFLlsT+aNPt6pkxlIjKB+U30hWHsPKCcNwAA',
      },
      {
        src: '/images/lip-balm-label-768.webp',
        webpSrcSet:
          '/images/lip-balm-label-480.webp 480w, /images/lip-balm-label-768.webp 768w, /images/lip-balm-label-1200.webp 1200w',
        avifSrcSet:
          '/images/lip-balm-label-480.avif 480w, /images/lip-balm-label-768.avif 768w, /images/lip-balm-label-1200.avif 1200w',
        alt: "Dr Ria's Anti-Pigmentation Lip Balm packaging back label and detailed ingredient specification",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRsIAAABXRUJQVlA4ILYAAAAwBQCdASoUABQAPtFao02oJSMiKA1RABoJQBj8gjG1pPxGzdvulfO/SMO7iGmK1mpXAAD+8i7h1ojbrOoPnPxmSN991MMKObsdd2MXjYvk1HMA6Ggre0rJu+sqHtGUvcOnMruRRKcnsSQA3A43cm0gwlILkfu2MjCDAzuvJlzKPs+f++bhmjvqOBN9aJBNX4X3p7nHKOleOQ/7y537G1qpPIBOtOmrPuizwkwHG1JOvQvQQ3K4AA==',
      },
    ],
  },
  {
    id: 'drria-vita-c-face-wash',
    slug: 'vita-c-daily-glow-face-wash',
    name: 'Vita C Daily Glow Face Wash',
    tagline: 'Brightens & Refreshes Natural Glow',
    category: 'skin',
    categoryLabel: 'Facial Care',
    accentColor: '#E8651A',
    price: 444,
    size: '100 ml',
    heroImageIndex: 0,
    description:
      'A gentle brightening daily cleanser crafted with Sodium Ascorbyl Phosphate and Orange Peel extract to wash away impurities without stripping essential moisture.',
    badges: ['Made Safe', 'Daily Glow', 'Gentle Cleansing'],
    keyIngredients: [
      'Vitamin C (Sodium Ascorbyl Phosphate)',
      'Orange Peel Extract',
      'Aloe Vera',
      'Glycerin',
    ],
    benefits: [
      'Brightens Skin Tone',
      'Cleanses Without Drying',
      'Refreshes & Hydrates',
      'Restores Natural Glow',
    ],
    fullIngredients:
      'Sodium Ascorbyl Phosphate, Orange Peel Extract, Alphaolefinic Sulphonate, Sodium Lauryl Sulphate, Decyl Glucoside, Cocamidopropyl Betaine, Cocoamidoprop Dimethiconol, Glycerin, Aloe Vera Distillate, Polyquaternium 10, Carbomer, Fragrance, Lemon, DM Water, Phenoxyethanol.',
    howToUse:
      'Wet your face. Massage a small amount in circular motion. Rinse well with water. Use twice daily.',
    storage: 'Store in a cool and dry place away from direct sunlight.',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use. Discontinue use if irritation occurs.',
    marketedBy: "Dr Ria's, 93-c Shastri Nagar, Jammu 180004",
    manufacturerDetails:
      'Ambient Bio Care, Naresh Park Industrial Area, Nangloi, Delhi 110041',
    inStock: true,
    images: [
      {
        src: '/images/vita-c-face-wash-lifestyle-768.webp',
        webpSrcSet:
          '/images/vita-c-face-wash-lifestyle-480.webp 480w, /images/vita-c-face-wash-lifestyle-768.webp 768w, /images/vita-c-face-wash-lifestyle-1200.webp 1200w',
        avifSrcSet:
          '/images/vita-c-face-wash-lifestyle-480.avif 480w, /images/vita-c-face-wash-lifestyle-768.avif 768w, /images/vita-c-face-wash-lifestyle-1200.avif 1200w',
        alt: "Dr Ria's Vita C Daily Glow Face Wash luxury bottle displayed alongside fresh citrus botanicals",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRuYAAABXRUJQVlA4INoAAAAQBQCdASoUABQAPtFcpk4oJSOiKAqpABoJbACw+iABy0hya9wMUUSAVSgQfqMMRyIgAPdPHkYMST6MJW+NuGvmhfZqmtIFbNh1+Tne7fFf++rQXpNTT8E3Bm21kBJBlJih6xlbBapFMOM+yb3ZKgIT9k0RGT/eQrQgQfiyW65y/sfA4w9oqNVSVtVZ0IBaYFFvp0Ldij3G8MugPfbjKFuefjRZ1g8Fqarvj2MXtPpm075E8jAZGEcG42hbyu7UrmJQB1+WKgLg7/7EyT+l9QgEthSJXcMqqAAAAA==',
      },
      {
        src: '/images/vita-c-face-wash-benefits-768.webp',
        webpSrcSet:
          '/images/vita-c-face-wash-benefits-480.webp 480w, /images/vita-c-face-wash-benefits-768.webp 768w, /images/vita-c-face-wash-benefits-1200.webp 1200w',
        avifSrcSet:
          '/images/vita-c-face-wash-benefits-480.avif 480w, /images/vita-c-face-wash-benefits-768.avif 768w, /images/vita-c-face-wash-benefits-1200.avif 1200w',
        alt: "Dr Ria's Vita C Daily Glow Face Wash benefits diagram showcasing brightening and hydration features",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRrwAAABXRUJQVlA4ILAAAAAwBQCdASoUABQAPtFcpE6oJSMiKAqpABoJagB3hlKoA3FRZhL/ObT3qLpp/IohmUTpQAD+ZrF7KOHO5PmnPfwiddpdmU+W2yvObyZVBk5mSJge1Y6NTRpz9X/3iNs0xdZw4bPz0IgtH1ay7vGZGSEjcIu/QCEcrOhcuOJYvBWSuIVw8NZe0CI100gDL7PnQZswR/upcv3KAACITnMTWSJQdbS3fvb63INb2N/AB3vgAA==',
      },
      {
        src: '/images/vita-c-face-wash-label-768.webp',
        webpSrcSet:
          '/images/vita-c-face-wash-label-480.webp 480w, /images/vita-c-face-wash-label-768.webp 768w, /images/vita-c-face-wash-label-1200.webp 1200w',
        avifSrcSet:
          '/images/vita-c-face-wash-label-480.avif 480w, /images/vita-c-face-wash-label-768.avif 768w, /images/vita-c-face-wash-label-1200.avif 1200w',
        alt: "Dr Ria's Vita C Glow Face Wash packaging label showing full composition and manufacturing credentials",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAAAQBQCdASoUABQAPsFOn0unpCKht/qoAPAYCUAVxtwA/AB5nL0ZHI3+4AFoJzSz7iAAAP7zlwQq/UqDS1xbh06c9rWTwSn60wSjyvsIQDQKfqi4l9H/VSEBlJ0dJewhbg6UCHZMJ1JGeRo/Fxhe5/bs9TQnQ9sOO9x6D1TJ+XwTSNd3CFVL3UYCY7wAAA==',
      },
    ],
  },
  {
    id: 'drria-hair-growth-oil',
    slug: 'hair-growth-oil',
    name: 'Hair Growth Oil',
    tagline: 'Advanced Hair Strengthening Formula',
    category: 'hair',
    categoryLabel: 'Hair Care',
    accentColor: '#C9952A',
    price: 411,
    size: '100 ml',
    heroImageIndex: 0,
    description:
      'Crafted with natural actives that nourish the scalp and strengthen roots.',
    badges: ['Paraben Free', 'GMP Certified', 'ISO 9001 Certified', 'Made Safe'],
    keyIngredients: [
      'Fenugreek Oil',
      'Refined Onion Oil',
      'Amla Oil',
      'Bhringraj Oil',
      'Neem Oil',
      'Castor Oil',
      'Hibiscus Oil',
      'Grape Seed Oil',
      'Olive Oil',
      'Vitamin E (Tocopherol)',
      'Almond Oil',
      'Peppermint Oil',
      'Isopropyl Myristate',
      'Phenoxyethanol',
      'Sunflower',
    ],
    benefits: [
      'Reduces Hair Fall',
      'Builds Healthy & Strong Roots',
      'Prevents Premature Greying',
      'Removes Frizziness',
    ],
    fullIngredients:
      'Fenugreek Oil, Refined Onion Oil, Amla Oil, Bhringraj Oil, Neem Oil, Castor Oil, Hibiscus Oil, Grape Seed Oil, Olive Oil, Vitamin E (Tocopherol), Almond Oil, Peppermint Oil, Isopropyl Myristate, Phenoxyethanol, Sunflower.',
    howToUse:
      'Take a few drops in your palm. Gently massage into scalp and hair roots for 5-10 minutes. Leave overnight or at least 1 hour. Wash with a mild, sulfate-free shampoo. Use 2-3 times a week.',
    storage:
      'Cool & dry place, away from direct sunlight. FOR EXTERNAL USE ONLY. Use within 3 years of Mfg.',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use. Discontinue use if irritation occurs.',
    marketedBy: "Dr Ria's, 93-C Shastri Nagar, Jammu 180004",
    manufacturerDetails:
      'Ambient Bio Care, Nangloi, Delhi 110041',
    mfgLicNo: 'SW(0660)/23/CM/590',
    inStock: true,
    images: [
      {
        src: '/images/hair-growth-oil-lifestyle-768.webp',
        webpSrcSet:
          '/images/hair-growth-oil-lifestyle-480.webp 480w, /images/hair-growth-oil-lifestyle-768.webp 768w, /images/hair-growth-oil-lifestyle-1200.webp 1200w',
        avifSrcSet:
          '/images/hair-growth-oil-lifestyle-480.avif 480w, /images/hair-growth-oil-lifestyle-768.avif 768w, /images/hair-growth-oil-lifestyle-1200.avif 1200w',
        alt: "Dr Ria's Hair Growth Oil in an elegant spa retreat setting with golden botanical lighting",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRvQAAABXRUJQVlA4IOgAAABQBQCdASoUABQAPtFeqE+oJKOiKAgBABoJYgCdMoAvQTOAL4gX8L1EVoAFM6RGWnisOMAA/pRLKX/tpXtwTU1sQGX6hPvF1+XLijUiJcICNSBPyTzmv7VEy6bwLG0QLLsnF6Z5CPk91VIdAi/zbx/D3vlxB9AVRQVftJ4eKXhleQ55CBpDe6/jokS5gp9ahvQBPEAdqQlhi5zby1gCjNa3DBjDRKjYEOsRIu2szbLzzlHqiKeOSLu1MjIzRd47BPVW+adHwEFLU4ANzj5MU1BG9YPJkfFAjItsRb2FySS1X3lFocxu5oAA',
      },
      {
        src: '/images/hair-growth-oil-benefits-768.webp',
        webpSrcSet:
          '/images/hair-growth-oil-benefits-480.webp 480w, /images/hair-growth-oil-benefits-768.webp 768w, /images/hair-growth-oil-benefits-1200.webp 1200w',
        avifSrcSet:
          '/images/hair-growth-oil-benefits-480.avif 480w, /images/hair-growth-oil-benefits-768.avif 768w, /images/hair-growth-oil-benefits-1200.avif 1200w',
        alt: "Dr Ria's Hair Growth Oil benefits infographic detailing root strengthening and frizz reduction",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRvQAAACQBQCdASoUABYAPtFepE6oJSMiKAqpABoJZgCpBftsVPaHZvNfvRSDwaPlU0KiS53H3lGwgAD88LC2GjRtD+9ounAAMk8eP34amxB7SvrqsPz5cqPwvWev6O16gOY+ulap210GzAiIe5gdP69KhT3sItZsGJN4uGTDoJvqIBOl2XXc+6Qf5jnJrhiNf6zJSHTmCl2VKzRG5lkf3BWYC2/FQVvLipwwVB8sg+1MLx8+pNCP5sy8WwJQOkoNt8p/GjdZtpP9/dvGt82QCtNnYCg/O7XPb57JW5p5XYdEzcjOiWW58RlwAAAA',
      },
      {
        src: '/images/hair-growth-oil-label-768.webp',
        webpSrcSet:
          '/images/hair-growth-oil-label-480.webp 480w, /images/hair-growth-oil-label-768.webp 768w, /images/hair-growth-oil-label-1200.webp 1200w',
        avifSrcSet:
          '/images/hair-growth-oil-label-480.avif 480w, /images/hair-growth-oil-label-768.avif 768w, /images/hair-growth-oil-label-1200.avif 1200w',
        alt: "Dr Ria's Hair Growth Oil product information label with GMP and ISO 9001 certified credentials",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAADQAwCdASoUABQAPtFgqE+oJSOiKAgBABoJZScC3Ul0ECwhWEHMGcAA/vCBSK3GB36F3qeO7/VXBomqm8cJnUScbhk0I6sEv9aCfJwZi05eBv+JTBbYZQvZPUvUfGd/a/Y7gl8nJvtd9lZquXn7GqCbgAAAAA==',
      },
    ],
  },
  {
    id: 'drria-hydroboost-moisturizer',
    slug: 'hydroboost-face-moisturizer',
    name: 'Hydroboost Face Moisturizer',
    tagline: 'Repair, Regenerate, Restore',
    category: 'skin',
    categoryLabel: 'Facial Care',
    accentColor: '#4A7FA5',
    price: 444,
    size: '50 gm / 1.76 oz',
    heroImageIndex: 0,
    description:
      'An ultra-hydrating daily facial cream powered by Hyaluronic Acid, Ceramides, and Peptides to restore the moisture barrier and lock in intense hydration.',
    badges: ['Moisture Barrier Support', 'Ceramides + Peptides', 'Deep Hydration'],
    keyIngredients: [
      'Hyaluronic Acid',
      'Ceramides',
      'Peptides',
      'Niacinamide',
      'Alpha-Arbutin',
      'Shea Butter',
      'Licorice Root Extract',
    ],
    benefits: [
      'Deep Hydration (Hyaluronic Acid)',
      'Moisture Barrier Support (Ceramides)',
      'Skin Renewal Support (Peptides)',
    ],
    fullIngredients:
      'Purified water, EDTA, Glycerin, Niacinamide, Alpha-Arbutin, Allantoin, Hyaluronic Acid, Carbomer, Oryza Sativa Extract, PEG-12 Dimethicone, Propanediol, Caprylic Capric Triglyceride, Cyclopentasiloxane, Dimethicone, Coconut Oil, Butyrospermum Parkii (Shea) Butter, Glycyrrhiza Glabra (Licorice) Root Extract, Phenoxyethanol, Triethanolamine, N-Hydroxylitol, Xylitol, Aloe barbadensis Leaf Extract, Scutellaria Baicalensis Root Extract, Paeonia Suffruticosa Root Extract, Saxifraga Sarmentosa Extract, Fragrance.',
    howToUse:
      'Clean face and neck thoroughly. Take a little quantity, divide and apply all over the face and body using circular motion, twice a day.',
    storage: 'Store in a cool and dry place away from heat and direct sunlight.',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use. Discontinue use if irritation occurs.',
    marketedBy: 'RIAUPPAL, 93-C Uppal Niwas, Shastri Nagar, Jammu 180004',
    manufacturerDetails:
      'Vancom Solutions, 543-B, FF, Pace City-II, Sector 37, Gurgaon, Haryana 122004',
    mfgLicNo: 'COSBHR2025000003',
    inStock: true,
    images: [
      {
        src: '/images/hydroboost-moisturizer-lifestyle-768.webp',
        webpSrcSet:
          '/images/hydroboost-moisturizer-lifestyle-480.webp 480w, /images/hydroboost-moisturizer-lifestyle-768.webp 768w, /images/hydroboost-moisturizer-lifestyle-1200.webp 1200w',
        avifSrcSet:
          '/images/hydroboost-moisturizer-lifestyle-480.avif 480w, /images/hydroboost-moisturizer-lifestyle-768.avif 768w, /images/hydroboost-moisturizer-lifestyle-1200.avif 1200w',
        alt: "Dr Ria's Hydroboost Face Moisturizer featured in an elegant spa editorial setting",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRroAAABXRUJQVlA4IK4AAADwBQCdASoUABQAPtFgqE+oJSOiKAgBABoJZgCdMoSCyKm/JQJ/22TTP2P0h3/o1UtcUURWgf9NQAD3iIstuK5wjcatyo2/wxPzRomivgUel2YYpVlwRhmuhPC0ZnIaoHHshWZv/0fwIm+MPDgCDjOQBBuq8bmO9oYFzojl20Xn+PoZT/YPTFpWvizt9en9z4iAwtExJaCLbOWZakM+GF6zt+K+IBZ+YYhDwbwPoAA=',
      },
      {
        src: '/images/hydroboost-moisturizer-benefits-768.webp',
        webpSrcSet:
          '/images/hydroboost-moisturizer-benefits-480.webp 480w, /images/hydroboost-moisturizer-benefits-768.webp 768w, /images/hydroboost-moisturizer-benefits-1200.webp 1200w',
        avifSrcSet:
          '/images/hydroboost-moisturizer-benefits-480.avif 480w, /images/hydroboost-moisturizer-benefits-768.avif 768w, /images/hydroboost-moisturizer-benefits-1200.avif 1200w',
        alt: "Dr Ria's Hydroboost Moisturizer hydration benefits advertisement highlighting repair and restore action",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRpQAAABXRUJQVlA4IIgAAADwBACdASoUABQAPtFap04oJKOiKAqpABoJZQC2yywA0P8RKG/zlEc9L/v6S7x4/cAA/pqH1g7BBBKwsM3SmV1FQJ3YgmZ4Bavqk3bkt48WGRDOHdNCltwwTanCG06izYNTL+Y03QWKMmEDzbgtUOxJH/qmqvqxNIIiUPwCa/BI2niqeM+XzAAA=',
      },
      {
        src: '/images/hydroboost-moisturizer-label-768.webp',
        webpSrcSet:
          '/images/hydroboost-moisturizer-label-480.webp 480w, /images/hydroboost-moisturizer-label-768.webp 768w, /images/hydroboost-moisturizer-label-1200.webp 1200w',
        avifSrcSet:
          '/images/hydroboost-moisturizer-label-480.avif 480w, /images/hydroboost-moisturizer-label-768.avif 768w, /images/hydroboost-moisturizer-label-1200.avif 1200w',
        alt: "Dr Ria's Hydroboost Moisturizer mint green back panel with complete ingredient list and directions",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAABwBACdASoUABQAPtFgqU+oJSOiKAgBABoJZQDH5BDer1Q/jCXKx/6ysU7QAAD+7/iE1F+dbE02nvsZZkrl13WYIaN77644nMZjc6TLue2kmkB2dHpa7feuIYEIOkVv83PRkkKV43Bhy8i0n2tnVvCFgGoVAAAA',
      },
    ],
  },
  {
    id: 'drria-spf50-sunscreen',
    slug: 'spf50-sunscreen',
    name: 'SPF-50 PA+++ Sunscreen',
    tagline: 'With Liquorice + Aloe Vera + Vitamin E',
    category: 'sun',
    categoryLabel: 'Sun Care',
    accentColor: '#3A7D44',
    price: 555,
    size: '50 ml / 1.69 fl oz',
    heroImageIndex: 0,
    description:
      'High-protection broad spectrum sunscreen shielding skin from both UVA and UVB rays while deeply hydrating and brightening with botanical liquorice and aloe.',
    badges: ['Broad Spectrum UVA/UVB', 'PA+++ Certified', 'Non-Greasy Shield'],
    keyIngredients: [
      'Liquorice (Glycyrrhiza Glabra)',
      'Aloe Vera',
      'Vitamin E (Tocopheryl Acetate)',
      'Shea Butter',
      'Sunflower Oil',
    ],
    benefits: [
      'Broad Spectrum Protection (UVA & UVB)',
      'Deeply Hydrates',
      'Brightens Skin',
      'Strengthens Skin Barrier',
    ],
    fullIngredients:
      'Purified water, EDTA, Carbomer, Glycerin, Stearic Acid, Paraffinum Liquidum, Cetyl Alcohol, Butyrospermum Parkii (Shea) Butter, Cetearyl Olivate & Sorbitan Olivate, Sunflower Oil (Glyceryl Stearate & PEG-100 Stearate), Tocopheryl Acetate, Dimethicone, Aqua, Ethylhexyl Methoxycinnamate, Butyl methoxydibenzoylmethane, Benzophenone-3, Butylene Glycol, Phospholipids, Hydroxyphenyl-3, Hydroxyethylurea, Xylitylglucoside, Anhydroxylitol & Xylitol, Aloe barbadensis Leaf Extract, Phenoxyethanol, Ethylhexylglycerin, Fragrance, Elastomer, Acrylates Copolymer.',
    howToUse:
      'Apply evenly 15-20 mins before sun exposure. Reapply every 2-3 hrs if required. Use daily for best results.',
    storage: 'Store in a cool and dry place away from direct sunlight.',
    complianceNote:
      'Individual results may vary. For external use only. Do a patch test before first use. Discontinue use if irritation occurs.',
    marketedBy: 'RIAUPPAL, Jammu 180004',
    manufacturerDetails:
      'Vancom Solutions, Gurgaon, Haryana 122004',
    mfgLicNo: 'COSBHR2025000003',
    inStock: true,
    images: [
      {
        src: '/images/spf50-sunscreen-lifestyle-768.webp',
        webpSrcSet:
          '/images/spf50-sunscreen-lifestyle-480.webp 480w, /images/spf50-sunscreen-lifestyle-768.webp 768w, /images/spf50-sunscreen-lifestyle-1200.webp 1200w',
        avifSrcSet:
          '/images/spf50-sunscreen-lifestyle-480.avif 480w, /images/spf50-sunscreen-lifestyle-768.avif 768w, /images/spf50-sunscreen-lifestyle-1200.avif 1200w',
        alt: "Dr Ria's Botanical SPF-50 Sunscreen still life displayed in soft natural lighting",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRs4AAABXRUJQVlA4IMIAAACwBQCdASoUABQAPtFgqU+oJSOiKAgBABoJQBYj6u3/xbJRxlXqEMCCz/eyJXKl7Hcu+glMsAAA/dViu3bZLIBnsu6dMXaD7nzT7sb7nQ39Kk02QfECIxqw2IXAzS3jdOyeusdVvxszx19C7xATiLqHu6MPdfmRqV4TpewecOGiiq8p5aedUkUxS8uf3q2v0CXM7XAhOH4PsCBQ9vprftMp0XGEtQS7D8pN78cS9qSh3ySqSN58b0kJ93wP54Eo1GAAAA==',
      },
      {
        src: '/images/spf50-sunscreen-benefits-768.webp',
        webpSrcSet:
          '/images/spf50-sunscreen-benefits-480.webp 480w, /images/spf50-sunscreen-benefits-768.webp 768w, /images/spf50-sunscreen-benefits-1200.webp 1200w',
        avifSrcSet:
          '/images/spf50-sunscreen-benefits-480.avif 480w, /images/spf50-sunscreen-benefits-768.avif 768w, /images/spf50-sunscreen-benefits-1200.avif 1200w',
        alt: "Dr Ria's SPF-50 PA+++ Sunscreen key benefits infographic highlighting broad spectrum UVA UVB protection",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRpYAAABXRUJQVlA4IIoAAABQBACdASoUABQAPtFaqE4oJSQiKAqpABoJQBYdgkfBXg1VxbHlYUWHfWAAAP4LHstRUkPrKQ2ztElP+AcrqNbHJsuP2rnsgRHp9XQOVUEXKqCtgv0lUqVrtTXvFYKBjoT8peGBUYc76cvsQ9VPvyxjgrUodCXQGtdaae6uuXCOiVqpLT9+cU0gAAA=',
      },
      {
        src: '/images/spf50-sunscreen-label-768.webp',
        webpSrcSet:
          '/images/spf50-sunscreen-label-480.webp 480w, /images/spf50-sunscreen-label-768.webp 768w, /images/spf50-sunscreen-label-1200.webp 1200w',
        avifSrcSet:
          '/images/spf50-sunscreen-label-480.avif 480w, /images/spf50-sunscreen-label-768.avif 768w, /images/spf50-sunscreen-label-1200.avif 1200w',
        alt: "Dr Ria's SPF-50 Sunscreen aloe skincare ingredient back label and specifications",
        width: 768,
        height: 768,
        blurDataURL:
          'data:image/webp;base64,UklGRowAAABXRUJQVlA4IIAAAADwBACdASoUABQAPslSoEunpKMht/VYAPAZCUAYZoI+pPFZ7rBH8cA+CPZpsSgKLAAA/vPI2qx9fhhXOY72iTE3n9f5fOd+7N4JPpVeOWyCYf5k1k64DQEv8RGQxhc5TssZAozQ1yrACUyxkjMB3L3LR3FAUPXT65cn8UlA7AAAAA==',
      },
    ],
  },
];

// Build-time console notice: log confirmed catalog prices during build
if (typeof window === 'undefined') {
  console.log(
    '\n✓ Catalog prices confirmed:\n' +
      products
        .map((p) => `   • ${p.name}: ₹${p.price}`)
        .join('\n') +
      '\n'
  );
}

export function getProductBySlugSync(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getAllProductsSync(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getAllProducts(): Product[] {
  return products;
}

export function getProductsByCategory(category: string): Product[] {
  if (category === 'all') return products;
  return products.filter((p) => p.category === category);
}

export function getRelatedProducts(currentSlug: string, count = 3): Product[] {
  return products.filter((p) => p.slug !== currentSlug).slice(0, count);
}

export function isValidProductSlug(slug: string): boolean {
  return products.some((p) => p.slug === slug);
}
