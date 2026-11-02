'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STORE_CONFIG } from '@/lib/config';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/cart';
import { processRazorpayPayment } from '@/lib/razorpay';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'online', // 'online' | 'cod'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsProcessing(true);
    setErrorMessage('');

    const orderNumber = `DRRIA-${Date.now().toString().slice(-6)}`;

    if (formData.paymentMethod === 'cod') {
      // Direct Cash on Delivery placement
      setTimeout(() => {
        clearCart();
        router.push(`/thank-you?orderId=${orderNumber}&method=cod`);
      }, 600);
      return;
    }

    // Online Payment via Razorpay
    await processRazorpayPayment({
      amount: cartTotal,
      name: formData.fullName,
      email: formData.email,
      contact: formData.phone,
      description: `Dr Ria's Order #${orderNumber}`,
      onSuccess: (res) => {
        clearCart();
        router.push(
          `/thank-you?orderId=${orderNumber}&method=online&paymentId=${res.razorpay_payment_id}`
        );
      },
      onFailure: (err) => {
        setIsProcessing(false);
        setErrorMessage(
          err.message || 'Payment was unsuccessful or cancelled. You can also order via WhatsApp below.'
        );
      },
    });
  };

  const whatsAppOrderText = encodeURIComponent(
    `Hello Dr Ria's! I'd like to place an order:\n\n` +
      `*Items:*\n` +
      items.map((i) => `• ${i.product.name} (${i.product.size}) x${i.quantity} = ₹${i.product.price * i.quantity}`).join('\n') +
      `\n\n*Total Amount:* ₹${cartTotal.toLocaleString('en-IN')}\n\n` +
      `*Delivery Details:*\n` +
      `Name: ${formData.fullName || '[Enter Name]'}\n` +
      `Phone: ${formData.phone || '[Enter Phone]'}\n` +
      `Address: ${formData.address1 || ''} ${formData.address2 || ''}, ${formData.city || ''}, ${formData.state || ''} - ${formData.pincode || ''}\n` +
      `Preferred Payment: ${formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI / Online'}`
  );

  if (!hydrated) {
    return (
      <div className="py-24 text-center text-sm text-[#6B6B6B]">
        Initializing checkout...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#3E2914]">Your Cart is Empty</h1>
        <p className="text-sm text-[#6B6B6B]">Add products to your cart before proceeding to checkout.</p>
        <Link
          href="/shop"
          className="inline-block px-6 py-3 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#7A532B]"
        >
          Browse Formulations
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 bg-[#FBF6EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Secure Checkout
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#3E2914] mt-1">
            Complete Your Order
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Standard delivery across all Indian pin codes via express couriers.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Shipping and Payment Form */}
          <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-8">
            {/* Contact Details */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] pb-2 border-b border-[#F3EBDD]">
                1. Customer &amp; Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                  {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] pb-2 border-b border-[#F3EBDD]">
                2. Shipping Address
              </h2>
              <div>
                <label htmlFor="address1" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  House / Flat / Street *
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
                {errors.address1 && <p className="text-[11px] text-red-600 mt-1">{errors.address1}</p>}
              </div>

              <div>
                <label htmlFor="address2" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Landmark / Locality (Optional)
                </label>
                <input
                  type="text"
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleInputChange}
                  placeholder="Near park, temple or market"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                  {errors.city && <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label htmlFor="state" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                  {errors.state && <p className="text-[11px] text-red-600 mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label htmlFor="pincode" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
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
                  {errors.pincode && <p className="text-[11px] text-red-600 mt-1">{errors.pincode}</p>}
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A] pb-2 border-b border-[#F3EBDD]">
                3. Choose Payment Method
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
                      Secure instant checkout via Razorpay. Free delivery included.
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
                      Pay cash to the courier when your parcel arrives.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-xl bg-[#5C3D1E] text-white text-base font-bold hover:bg-[#C9952A] transition-colors shadow-md disabled:opacity-50"
              >
                {isProcessing
                  ? 'Processing Order...'
                  : formData.paymentMethod === 'cod'
                  ? `Place COD Order • ₹${cartTotal.toLocaleString('en-IN')}`
                  : `Pay Securely • ₹${cartTotal.toLocaleString('en-IN')}`}
              </button>

              <div className="text-center">
                <span className="text-xs text-[#6B6B6B]">or choose direct support</span>
              </div>

              {/* WhatsApp Fallback */}
              <a
                href={`https://wa.me/919469088317?text=${whatsAppOrderText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#3A7D44] bg-[#EDF6EE] text-[#3A7D44] text-xs font-semibold hover:bg-[#DDF0DF] transition-colors"
              >
                <span>Order via WhatsApp (+91-9469088317)</span>
              </a>
            </div>
          </form>

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
                      src={product.images[0]?.src || '/images/lip-balm-spa-480.webp'}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#1A1A1A] truncate">{product.name}</h3>
                    <p className="text-[#6B6B6B]">{product.size} &bull; Qty: {quantity}</p>
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
                <span>Shipping</span>
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

            <div className="p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5] text-[11px] text-[#6B6B6B] space-y-1">
              <p className="font-semibold text-[#5C3D1E]">100% Authentic Product Guarantee</p>
              <p>Every bottle is sealed and shipped directly from certified facilities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
