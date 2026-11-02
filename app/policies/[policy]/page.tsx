import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

interface PolicyPageProps {
  params: Promise<{
    policy: string;
  }>;
}

const policyData: Record<
  string,
  {
    title: string;
    subtitle: string;
    lastUpdated: string;
    sections: { heading: string; body: string }[];
  }
> = {
  shipping: {
    title: 'Shipping & Delivery Policy',
    subtitle: 'Transparent pan-India logistics and delivery commitments.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: '1. Order Processing Time',
        body: 'All confirmed orders (prepaid and COD) placed before 2:00 PM IST on business days are processed and dispatched within 24–48 hours from our certified distribution facility in Jammu. Orders placed on Sundays or public holidays will be dispatched on the following business day.',
      },
      {
        heading: '2. Shipping Charges & Coverage',
        body: 'We provide Free Standard Shipping on all prepaid orders across eligible PIN codes in India. For Cash on Delivery (COD) orders, a nominal handling fee may be applicable at checkout. We partner with reputed logistics providers including Blue Dart, Delhivery, and DTDC.',
      },
      {
        heading: '3. Estimated Delivery Timelines',
        body: '• Metro Cities (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata): 2 to 4 business days.\n• Tier 2 and Tier 3 Cities: 3 to 6 business days.\n• North-East, J&K remote regions, and Island territories: 5 to 8 business days.\nUnforeseen weather, natural delays, or regional restrictions may occasionally extend delivery schedules.',
      },
      {
        heading: '4. Tracking Your Consignment',
        body: 'Upon shipment, an automated SMS/WhatsApp message containing your AWB tracking number and carrier link will be sent to your registered contact number. You can also contact our team directly at +91-9469088317 for live dispatch assistance.',
      },
    ],
  },
  returns: {
    title: 'Returns & Refund Policy',
    subtitle: 'Hygiene and safety standards for personal cosmetic products.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: '1. Personal Care Hygiene Standard',
        body: 'Due to strict hygiene, cosmetic sterilization, and FDA regulations, opened or used bottles (including lip balms, cleansers, hair oils, moisturizers, and sunscreens) cannot be returned or refunded once the tamper-evident seal is broken.',
      },
      {
        heading: '2. Damaged, Defective or Incorrect Items',
        body: 'In the rare event that your shipment arrives physically damaged in transit, leaking, or with mismatched items, please report it within 48 hours of delivery by messaging our WhatsApp support at +91-9469088317 or emailing simplyria11@gmail.com with clear unboxing photographs or video proof.',
      },
      {
        heading: '3. Replacement Process',
        body: 'Once our quality team verifies transit damage or a packaging defect, a complimentary replacement will be dispatched within 48 business hours at no additional shipping charge to you.',
      },
      {
        heading: '4. Refund Timeline',
        body: 'Approved refunds for non-deliverable consignments or prepaid order cancellations prior to dispatch will be credited back to the original source payment method (UPI / Credit Card / Netbanking) within 5 to 7 business banking days.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How Dr Ria’s protects and respects your personal data.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you explicitly provide during account registration, checkout, or customer support inquiries:\n• Full name, delivery and billing addresses, and PIN code for fulfillment.\n• Email address and mobile phone number for sending order receipts, live shipment updates, and OTP authentication.\n• Order history and saved addresses to provide a unified customer account portal.\nWe do not store or process sensitive credit/debit card numbers or CVVs on our servers.',
      },
      {
        heading: '2. Payment Security & Processing',
        body: 'All online transactions are securely processed through Razorpay, a PCI-DSS Level 1 certified payment gateway. During checkout, your financial credentials are encrypted and transmitted directly to the payment gateway. Dr Ria’s receives only confirmation tokens and transaction identifiers required for fulfillment.',
      },
      {
        heading: '3. Use and Retention of Information',
        body: 'Your information is strictly utilized to process and dispatch orders, communicate shipment tracking via SMS/WhatsApp, manage your customer account, and respond to inquiries. We never sell, rent, or trade your personal data to external advertisers.',
      },
      {
        heading: '4. Cookies & Session Management',
        body: 'Our platform uses essential httpOnly and Secure session cookies managed via Supabase Auth to keep you securely signed in and preserve your shopping cart state. These functional cookies do not track activity across third-party websites.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Standard conditions governing your purchase on Dr Ria’s platform.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By browsing, accessing, or purchasing from drrias.in, you agree to comply with and be bound by these Terms of Service. If you disagree with any part of these terms, please discontinue use of the platform.',
      },
      {
        heading: '2. Product Advisory & Usage Disclaimer',
        body: 'All products sold on this platform are for external cosmetic use only. Although our formulations utilize certified ingredients and natural actives, individuals may possess unexpected botanical allergies. A 24-hour patch test behind the ear or on the inner forearm is mandatory prior to full facial or scalp application.',
      },
      {
        heading: '3. Pricing & Typographical Errors',
        body: 'Prices for our products are subject to change without notice. In the event a product is listed at an incorrect price due to a clerical or typographical error, we reserve the right to cancel or refuse orders placed at the erroneous price.',
      },
      {
        heading: '4. Governing Law & Jurisdiction',
        body: 'These Terms of Service and any transactional disputes arising hereunder shall be governed by and construed in accordance with the laws of India, under the exclusive jurisdiction of the competent courts in Jammu (J&K).',
      },
    ],
  },
};

export async function generateStaticParams() {
  return [
    { policy: 'shipping' },
    { policy: 'returns' },
    { policy: 'privacy' },
    { policy: 'terms' },
  ];
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { policy } = await params;
  const data = policyData[policy];

  if (!data) return { title: 'Policy Not Found' };

  return {
    title: `${data.title} | Dr Ria's`,
    description: data.subtitle,
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { policy } = await params;
  const data = policyData[policy];

  if (!data) {
    notFound();
  }

  return (
    <div className="py-16 sm:py-24 bg-[#FBF6EE]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Template Disclaimer Alert */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <strong>Template Notice:</strong> This policy document is a standardized operational template for Dr Ria’s. Please review and tailor with legal counsel to align with your specific commercial entity.
        </div>

        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Legal &amp; Compliance &bull; Last updated {data.lastUpdated}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
            {data.title}
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">{data.subtitle}</p>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-8">
          {data.sections.map((sec) => (
            <div key={sec.heading} className="space-y-2">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">
                {sec.heading}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-line">
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/contact"
            className="text-xs font-semibold text-[#5C3D1E] hover:text-[#C9952A] underline underline-offset-2"
          >
            Have questions about this policy? Contact customer care
          </Link>
        </div>
      </div>
    </div>
  );
}
