'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STORE_CONFIG } from '@/lib/config';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/cart';
import { processRazorpayPayment } from '@/lib/razorpay';
import { createClient } from '@/lib/supabase/client';
import LoginForm from '@/components/auth/LoginForm';

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [hydrated, setHydrated] = useState(false);

  // User auth state
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'online' as 'online' | 'cod',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    useCartStore.getState().initializeCart();
    setHydrated(true);

    async function loadUserSession() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (currentUser) {
          setUser(currentUser);

          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          // Fetch saved addresses
          const { data: addresses } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('is_default', { ascending: false });

          if (addresses && addresses.length > 0) {
            setSavedAddresses(addresses);
            const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
            setFormData((prev) => ({
              ...prev,
              fullName: defaultAddr.name || profile?.full_name || '',
              phone: defaultAddr.phone || profile?.phone || '',
              email: currentUser.email || '',
              address1: defaultAddr.line1 || '',
              address2: defaultAddr.line2 || '',
              city: defaultAddr.city || '',
              state: defaultAddr.state || '',
              pincode: defaultAddr.pincode || '',
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              fullName: profile?.full_name || (currentUser.user_metadata?.full_name as string) || '',
              phone: profile?.phone || (currentUser.user_metadata?.phone as string) || '',
              email: currentUser.email || '',
            }));
          }
        }
      } catch (err) {
        console.warn('Session check skipped or unauthenticated:', err);
      } finally {
        setCheckingAuth(false);
      }
    }

    loadUserSession();
  }, [supabase]);

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === 'new') {
      setFormData((prev) => ({
        ...prev,
        address1: '',
        address2: '',
        city: '',
        state: '',
        pincode: '',
      }));
      return;
    }

    const addr = savedAddresses.find((a) => a.id === addressId);
    if (addr) {
      setFormData((prev) => ({
        ...prev,
        fullName: addr.name || prev.fullName,
        phone: addr.phone || prev.phone,
        address1: addr.line1,
        address2: addr.line2 || '',
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      }));
    }
  };

  const cartTotal = total();

  const validate = () => {
    const err: Record<string, string> = {};
    if (!formData.fullName.trim()) err.fullName = 'Please enter your full name';
    if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      err.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      err.email = 'Please enter a valid email address';
    }
    if (!formData.address1.trim()) err.address1 = 'Address line 1 is required';
    if (!formData.city.trim()) err.city = 'City is required';
    if (!formData.state.trim()) err.state = 'State is required';
    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      err.pincode = 'Please enter a valid 6-digit PIN code';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!user) {
      setErrorMessage('Please sign in to your Dr Ria’s account above to complete checkout.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const idempotencyKey = `drria_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // 1. Create order on server (recalculating all prices strictly by slug)
      const createRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            slug: i.product.slug,
            quantity: i.quantity,
          })),
          address: {
            name: formData.fullName.trim(),
            phone: formData.phone.trim(),
            line1: formData.address1.trim(),
            line2: formData.address2.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
          },
          paymentMethod: formData.paymentMethod,
          idempotencyKey,
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(orderData.error || 'Failed to initiate order. Please try again.');
      }

      // If COD, order is placed immediately
      if (formData.paymentMethod === 'cod') {
        clearCart();
        router.push(`/thank-you?orderId=${orderData.orderId}&method=cod`);
        return;
      }

      // 2. Online Payment via Razorpay
      await processRazorpayPayment({
        amount: orderData.amount / 100, // paise to rupees
        orderId: orderData.razorpayOrderId,
        name: formData.fullName,
        email: formData.email,
        contact: formData.phone,
        description: `Dr Ria's Order #${orderData.orderId}`,
        onSuccess: async (rzpRes) => {
          try {
            // Verify HMAC signature on server
            const verifyRes = await fetch('/api/orders/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: orderData.orderId,
                razorpay_order_id: rzpRes.razorpay_order_id || orderData.razorpayOrderId,
                razorpay_payment_id: rzpRes.razorpay_payment_id,
                razorpay_signature: rzpRes.razorpay_signature || 'verified_mock',
              }),
            });

            const verifyData = await verifyRes.json();

            // Handle payment received on cancelled order
            if (verifyData.code === 'ORDER_CANCELLED_PAYMENT_RECEIVED') {
              clearCart();
              router.push(
                `/thank-you?orderId=${orderData.orderId}&status=cancelled_payment&paymentId=${rzpRes.razorpay_payment_id}`
              );
              return;
            }

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || verifyData.message || 'Payment signature verification failed.');
            }

            clearCart();
            router.push(
              `/thank-you?orderId=${orderData.orderId}&method=online&paymentId=${rzpRes.razorpay_payment_id}`
            );
          } catch (verifyErr: any) {
            setIsProcessing(false);
            setErrorMessage(
              verifyErr.message ||
                'Payment verification failed. If your account was debited, our team will assist you.'
            );
          }
        },
        onFailure: (rzpErr: any) => {
          setIsProcessing(false);
          setErrorMessage(
            rzpErr.message || 'Payment was cancelled or unsuccessful. You can also order via WhatsApp below.'
          );
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'An error occurred while creating your order.');
    }
  };

  const whatsAppOrderText = encodeURIComponent(
    `Hello Dr Ria's! I'd like to place an order:\n\n` +
      `*Items:*\n` +
      items
        .map(
          (i) =>
            `• ${i.product.name} (${i.product.size}) x${i.quantity} = ₹${
              i.product.price * i.quantity
            }`
        )
        .join('\n') +
      `\n\n*Total Amount:* ₹${cartTotal.toLocaleString('en-IN')}\n\n` +
      `*Delivery Details:*\n` +
      `Name: ${formData.fullName || '[Enter Name]'}\n` +
      `Phone: ${formData.phone || '[Enter Phone]'}\n` +
      `Address: ${formData.address1 || ''} ${formData.address2 || ''}, ${
        formData.city || ''
      }, ${formData.state || ''} - ${formData.pincode || ''}\n` +
      `Preferred Payment: ${
        formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online'
      }`
  );

  if (!hydrated || checkingAuth) {
    return (
      <div className="py-24 text-center text-sm text-[#6B6B6B]">
        Initializing checkout securely...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#3E2914]">Your Cart is Empty</h1>
        <p className="text-sm text-[#6B6B6B]">
          Add formulations to your cart before proceeding to checkout.
        </p>
        <Link
          href="/shop"
          className="inline-block px-6 py-3 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#7A532B] transition-colors"
        >
          Explore Formulations
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#FBF6EE] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Secure Checkout
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#3E2914] mt-1">
            Complete Your Order
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Authentic skincare &amp; haircare delivered directly to your doorstep.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Checkout Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Customer Authentication / Sign In */}
            {!user ? (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#F3EBDD]">
                  <div>
                    <span className="text-[11px] font-bold text-[#C9952A] uppercase tracking-wider">
                      Step 1 of 3
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#1A1A1A]">
                      Sign In to Place Your Order
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FAF5EA] text-[#7A532B] rounded-full text-[11px] font-semibold border border-[#E8E0D5]">
                    Cart Saved
                  </span>
                </div>

                <p className="text-xs text-[#6B6B6B]">
                  Sign in with Google or receiving a 6-digit Email OTP to track your shipment, view invoices, and store your delivery address.
                </p>

                {/* Inline Auth Component */}
                <div className="pt-2">
                  <LoginForm />
                </div>

                {/* Guest WhatsApp Order Alternative */}
                <div className="pt-4 border-t border-[#F3EBDD] text-center space-y-2">
                  <p className="text-xs text-[#6B6B6B]">Prefer not to create an account right now?</p>
                  <a
                    href={`https://wa.me/919469088317?text=${whatsAppOrderText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#3A7D44] bg-[#EDF6EE] text-[#3A7D44] text-xs font-semibold hover:bg-[#DDF0DF] transition-colors"
                  >
                    <span>Order as Guest via WhatsApp (+91-9469088317)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#C5E5C9] bg-[#F7FCF8] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#3A7D44] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2D6A4F]">
                      Signed in as {user.email}
                    </p>
                    <p className="text-[11px] text-[#558B6E]">
                      Your order and shipment tracking will be linked to this account.
                    </p>
                  </div>
                </div>
                <a
                  href="/auth/signout"
                  className="text-xs text-[#7A532B] hover:text-[#5C3D1E] underline shrink-0 font-medium"
                >
                  Switch Account
                </a>
              </div>
            )}

            {/* Step 2 & 3: Shipping & Payment Form (active when signed in) */}
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              {/* Shipping Address */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#F3EBDD]">
                  <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">
                    {user ? '1. Shipping & Contact Details' : '2. Shipping & Contact Details'}
                  </h2>
                  {savedAddresses.length > 0 && (
                    <span className="text-xs text-[#5C3D1E] font-medium">
                      {savedAddresses.length} saved address{savedAddresses.length > 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                {/* Saved Address Selector */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-3 pb-3 border-b border-[#F3EBDD]">
                    <label className="block text-xs font-semibold text-[#1A1A1A]">
                      Select Delivery Address:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr.id)}
                          className={`text-left p-3.5 rounded-xl border text-xs transition-all ${
                            selectedAddressId === addr.id
                              ? 'border-[#5C3D1E] bg-[#FAF5EA] ring-1 ring-[#5C3D1E]'
                              : 'border-[#E8E0D5] bg-white hover:bg-[#FDFBF7]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[#1A1A1A]">
                            <span>{addr.name}</span>
                            {addr.is_default && (
                              <span className="text-[10px] bg-[#EDF6EE] text-[#3A7D44] px-1.5 py-0.5 rounded font-semibold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[#6B6B6B] mt-1 line-clamp-2">
                            {addr.line1}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-[#6B6B6B] mt-0.5 font-mono text-[11px]">
                            {addr.phone}
                          </p>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleSelectSavedAddress('new')}
                        className={`text-left p-3.5 rounded-xl border border-dashed text-xs transition-all flex flex-col justify-center items-center gap-1 ${
                          selectedAddressId === 'new'
                            ? 'border-[#5C3D1E] bg-[#FAF5EA] ring-1 ring-[#5C3D1E]'
                            : 'border-[#E8E0D5] bg-white hover:bg-[#FDFBF7] text-[#6B6B6B]'
                        }`}
                      >
                        <span className="font-semibold text-[#5C3D1E]">+ Use a Different Address</span>
                        <span className="text-[11px] text-[#8C8C8C]">Enter manual address below</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter recipient name"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                        errors.fullName ? 'border-red-500' : 'border-[#E8E0D5]'
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                    >
                      Mobile Phone (10 digits) *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      maxLength={10}
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                        errors.phone ? 'border-red-500' : 'border-[#E8E0D5]'
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                  >
                    Email Address (for order tracking) *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                      errors.email ? 'border-red-500' : 'border-[#E8E0D5]'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="address1"
                    className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                  >
                    House / Flat / Building / Street *
                  </label>
                  <input
                    type="text"
                    id="address1"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    placeholder="Flat No, Building, Street Name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                      errors.address1 ? 'border-red-500' : 'border-[#E8E0D5]'
                    }`}
                  />
                  {errors.address1 && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.address1}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="address2"
                    className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                  >
                    Landmark / Locality (Optional)
                  </label>
                  <input
                    type="text"
                    id="address2"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                    placeholder="Near landmark or market"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                    >
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                        errors.city ? 'border-red-500' : 'border-[#E8E0D5]'
                      }`}
                    />
                    {errors.city && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                    >
                      State / UT *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Jammu & Kashmir"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                        errors.state ? 'border-red-500' : 'border-[#E8E0D5]'
                      }`}
                    />
                    {errors.state && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pincode"
                      className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                    >
                      PIN Code (6 digits) *
                    </label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="180004"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] ${
                        errors.pincode ? 'border-red-500' : 'border-[#E8E0D5]'
                      }`}
                    />
                    {errors.pincode && (
                      <p className="text-[11px] text-red-600 mt-1">{errors.pincode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
                <h2 className="font-serif text-lg font-bold text-[#1A1A1A] pb-2 border-b border-[#F3EBDD]">
                  {user ? '2. Payment Method' : '3. Payment Method'}
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E0D5] cursor-pointer hover:bg-[#FDFBF7] has-checked:border-[#5C3D1E] has-checked:bg-[#FAF5EA]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={formData.paymentMethod === 'online'}
                      onChange={handleInputChange}
                      className="text-[#5C3D1E] focus:ring-[#5C3D1E]"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-bold text-[#1A1A1A]">
                        Pay Online (UPI, Credit/Debit Cards, Netbanking)
                      </span>
                      <span className="block text-xs text-[#6B6B6B]">
                        Encrypted instant checkout via Razorpay. Free standard delivery included.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E0D5] cursor-pointer hover:bg-[#FDFBF7] has-checked:border-[#5C3D1E] has-checked:bg-[#FAF5EA]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      className="text-[#5C3D1E] focus:ring-[#5C3D1E]"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-bold text-[#1A1A1A]">
                        Cash on Delivery (COD)
                      </span>
                      <span className="block text-xs text-[#6B6B6B]">
                        Pay cash directly to the express courier when your package arrives.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-xl bg-[#5C3D1E] text-white text-base font-bold hover:bg-[#C9952A] transition-colors shadow-md disabled:opacity-50"
                >
                  {isProcessing
                    ? 'Processing Order Securely...'
                    : !user
                    ? 'Sign In Above to Complete Checkout'
                    : formData.paymentMethod === 'cod'
                    ? `Place COD Order • ₹${cartTotal.toLocaleString('en-IN')}`
                    : `Pay Securely • ₹${cartTotal.toLocaleString('en-IN')}`}
                </button>

                <div className="text-center">
                  <span className="text-xs text-[#6B6B6B]">or order with personal concierge assistance</span>
                </div>

                {/* WhatsApp Direct Fallback */}
                <a
                  href={`https://wa.me/919469088317?text=${whatsAppOrderText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#3A7D44] bg-[#EDF6EE] text-[#3A7D44] text-xs font-semibold hover:bg-[#DDF0DF] transition-colors"
                >
                  <span>Order Directly via WhatsApp (+91-9469088317)</span>
                </a>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-6">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] pb-3 border-b border-[#F3EBDD]">
              Order Summary ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {items.map(({ product, quantity }) => (
                <div key={product.slug} className="flex gap-3 text-xs">
                  <div className="relative w-14 h-14 rounded-lg bg-[#FDFBF7] border border-[#E8E0D5] overflow-hidden shrink-0">
                    <Image
                      src={product.images[0]?.src || '/images/lip-balm-jar-480.webp'}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#1A1A1A] truncate">{product.name}</h3>
                    <p className="text-[#6B6B6B]">
                      {product.size} &bull; Qty: {quantity}
                    </p>
                    <p className="font-semibold text-[#5C3D1E] mt-1">
                      ₹{(product.price * quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#F3EBDD] space-y-2 text-xs">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Items Subtotal</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Delivery Charges</span>
                {STORE_CONFIG.ENABLE_FREE_SHIPPING_PROMO ? (
                  <span className="text-[#3A7D44] font-medium">Free (Pan-India)</span>
                ) : (
                  <span className="text-[#3A7D44] font-medium">Included</span>
                )}
              </div>
              <div className="flex justify-between text-base font-bold text-[#1A1A1A] pt-3 border-t border-[#F3EBDD]">
                <span>Total Due</span>
                <span className="text-[#5C3D1E]">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5] text-[11px] text-[#6B6B6B] space-y-1.5">
              <p className="font-semibold text-[#5C3D1E]">Authentic Direct-From-Maker Formulations</p>
              <p>
                Every product is freshly bottled, tamper-evident sealed, and dispatched with standard batch tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
