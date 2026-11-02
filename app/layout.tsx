import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawerWrapper from '@/components/cart/CartDrawerWrapper';
import SkipToContent from '@/components/layout/SkipToContent';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://drrias.in'),
  title: {
    default: "Dr Ria's — Dermatologist-Designed Skincare & Haircare",
    template: "%s | Dr Ria's",
  },
  description: "Dermatologist-designed skincare and haircare crafted with pure botanical extracts and clinical actives. Shop clinical lip balm, face wash, hair oil, moisturizer and SPF-50 sunscreen.",
  authors: [
    { name: 'Sachin Kashyap', url: 'https://drrias.in/about' },
    { name: 'Pratyaksh Kalsi', url: 'https://drrias.in/about' },
  ],
  creator: 'Pratyaksh Kalsi',
  publisher: "Dr Ria's",
  keywords: [
    "Dr Ria's",
    'skincare India',
    'hair growth oil',
    'SPF-50 sunscreen',
    'hydroboost moisturizer',
    'vita c face wash',
    'anti pigmentation lip balm',
    'clinical skincare',
    'paraben free',
  ],
  openGraph: {
    title: "Dr Ria's — Dermatologist-Designed Skincare & Haircare",
    description: "Pure botanical actives and clinically-backed formulas crafted for Indian skin and hair. Made safe and certified.",
    url: 'https://drrias.in',
    siteName: "Dr Ria's",
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/images/hydroboost-moisturizer-lifestyle-1200.webp',
        width: 1200,
        height: 1200,
        alt: "Dr Ria's Clinical Skincare Collection",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Dr Ria's — Dermatologist-Designed Skincare & Haircare",
    description: "Pure botanical actives and clinically-backed formulas crafted for Indian skin and hair.",
    images: ['/images/hydroboost-moisturizer-lifestyle-1200.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: "Dr Ria's",
    url: 'https://drrias.in',
    logo: 'https://drrias.in/images/hydroboost-moisturizer-benefits-768.webp',
    description: 'Dermatologist-designed skincare and haircare formulated with pure botanical extracts and clinical actives.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9469088317',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '93-C Shastri Nagar',
      addressLocality: 'Jammu',
      postalCode: '180004',
      addressCountry: 'IN',
    },
  };

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FBF6EE] text-[#1A1A1A] font-sans antialiased selection:bg-[#C9952A]/20 selection:text-[#5C3D1E]">
        <SkipToContent />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CartDrawerWrapper />
      </body>
    </html>
  );
}
