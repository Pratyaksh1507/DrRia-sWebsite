import React, { Suspense } from 'react';
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
    default: "Dr Ria's — Skincare & Haircare, Made with Care in India",
    template: "%s | Dr Ria's",
  },
  description:
    "Dr Ria's skincare and haircare crafted with botanical extracts and targeted ingredients. Explore lip balm, face wash, hair oil, moisturizer and SPF-50 sunscreen.",
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
    'botanical skincare',
  ],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Dr Ria's — Skincare & Haircare, Made with Care in India",
    description:
      'Botanical extracts and thoughtful formulas crafted with care in India. Transparent ingredients on every label.',
    url: 'https://drrias.in',
    siteName: "Dr Ria's",
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/brand/og-default.png',
        width: 1200,
        height: 630,
        alt: "Dr Ria's",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Dr Ria's — Skincare & Haircare, Made with Care in India",
    description:
      'Botanical extracts and thoughtful formulas crafted with care in India.',
    images: ['/brand/og-default.png'],
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
    logo: 'https://drrias.in/brand/dr-rias-logo.png',
    description:
      'Skincare and haircare formulated with botanical extracts and targeted ingredients, made with care in India.',
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
      <body className="min-h-screen flex flex-col font-sans bg-[#FBF6EE] text-[#1A1A1A] antialiased">
        <SkipToContent />
        <Suspense
          fallback={
            <header className="sticky top-0 z-40 w-full bg-[#FBF6EE]/95 border-b border-[#E8E0D5]">
              <div className="bg-[#5C3D1E] h-[29px]" />
              <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" />
            </header>
          }
        >
          <Header />
        </Suspense>
        <main id="main-content" className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        <CartDrawerWrapper />
      </body>
    </html>
  );
}
