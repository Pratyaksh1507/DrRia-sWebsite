/**
 * Order Confirmation Email Delivery
 * Supports Resend API with graceful fallback to console in local/development.
 */

interface OrderEmailParams {
  toEmail: string;
  customerName: string;
  orderId: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export async function sendOrderConfirmationEmail(params: OrderEmailParams) {
  const { toEmail, customerName, orderId, total, items, address } = params;
  const resendApiKey = process.env.RESEND_API_KEY;

  const itemsListHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0e6d6;">
          <strong>${item.name}</strong> × ${item.quantity}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0e6d6; text-align: right;">
          ₹${(item.price * item.quantity).toLocaleString('en-IN')}
        </td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF5EA; padding: 32px; border-radius: 16px; border: 1px solid #E8E0D5;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #3E2914; margin: 0; font-size: 26px; font-weight: 700;">Dr Ria's</h1>
        <p style="color: #7A532B; margin: 4px 0 0; font-size: 13px;">Pure Ingredients &bull; Transparent Formulas</p>
      </div>

      <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #E8E0D5;">
        <h2 style="color: #3E2914; font-size: 20px; margin-top: 0;">Order Confirmed!</h2>
        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          Hello ${customerName || 'Valued Customer'},<br />
          Thank you for trusting Dr Ria's with your daily skincare and haircare routine. We are preparing your order <strong>#${orderId}</strong> for careful packaging and dispatch.
        </p>

        <h3 style="color: #3E2914; font-size: 15px; margin-top: 24px; border-bottom: 2px solid #5C3D1E; padding-bottom: 6px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #333333; margin-top: 12px;">
          ${itemsListHtml}
          <tr>
            <td style="padding: 12px 0 0; font-weight: bold; font-size: 15px; color: #3E2914;">Total Paid</td>
            <td style="padding: 12px 0 0; text-align: right; font-weight: bold; font-size: 15px; color: #5C3D1E;">
              ₹${total.toLocaleString('en-IN')}
            </td>
          </tr>
        </table>

        <h3 style="color: #3E2914; font-size: 15px; margin-top: 24px; border-bottom: 2px solid #5C3D1E; padding-bottom: 6px;">Delivery Address</h3>
        <p style="color: #555555; font-size: 13px; line-height: 1.5; margin: 12px 0 0;">
          ${address.line1}${address.line2 ? `, ${address.line2}` : ''}<br />
          ${address.city}, ${address.state} — ${address.pincode}
        </p>
      </div>

      <div style="text-align: center; margin-top: 24px; color: #7A532B; font-size: 12px; line-height: 1.6;">
        <p style="margin: 0;">
          Need assistance with your delivery or have a question?<br />
          Customer Care: <strong>+91-9469088317</strong> (Mon–Sat, 10 AM – 7 PM) &bull; Email: <strong>simplyria11@gmail.com</strong>
        </p>
        <p style="margin: 8px 0 0; color: #8C7866; font-size: 11px;">
          Dr Ria's &bull; 93-C Shastri Nagar, Jammu, 180004
        </p>
      </div>
    </div>
  `;

  if (!resendApiKey || resendApiKey.includes('placeholder')) {
    console.log(`[Email Mock] Order confirmation email prepared for: ${toEmail} (Order #${orderId})`);
    return { success: true, simulated: true };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || 'orders@drrias.in';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Dr Ria's <${fromAddress}>`,
        to: [toEmail],
        subject: `Your Dr Ria's Order Confirmation #${orderId}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[Resend Error]', err);
      return { success: false, error: err };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('[Email Send Error]', error);
    return { success: false, error };
  }
}

