export interface RazorpayOptions {
  amount: number; // in INR
  orderId?: string;
  name: string;
  email: string;
  contact: string;
  description: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onFailure: (error: any) => void;
}

// Load script ONLY when called (strictly on user Pay click)
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function processRazorpayPayment({
  amount,
  orderId,
  name,
  email,
  contact,
  description,
  onSuccess,
  onFailure,
}: RazorpayOptions) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    onFailure(new Error('Failed to load Razorpay checkout SDK. Please try WhatsApp checkout or reload.'));
    return;
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

  const options: Record<string, any> = {
    key: keyId,
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    name: "Dr Ria's",
    description,
    image: '/brand/dr-rias-logo.png',
    prefill: {
      name,
      email,
      contact,
    },
    theme: {
      color: '#5C3D1E',
    },
    handler: onSuccess,
    modal: {
      ondismiss: () => {
        onFailure(new Error('Payment window closed.'));
      },
    },
  };

  if (orderId) {
    options.order_id = orderId;
  }

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
