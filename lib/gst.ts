/**
 * GST (Goods and Services Tax) Calculation Engine for Dr Ria's Formulations
 * 
 * Standard Cosmetic HSN Code: 3304 (Beauty or make-up preparations and skincare)
 * Standard GST Rate: 18% (Applicable across all skincare formulations)
 * Origin State: Jammu & Kashmir (Union Territory)
 * 
 * In India, e-commerce consumer prices are Maximum Retail Prices (MRP), which are inclusive of GST.
 * Formula for GST Inclusive Price:
 * Taxable Amount = Gross Amount / (1 + Rate) = Gross Amount / 1.18
 * Total GST = Gross Amount - Taxable Amount
 * 
 * Tax Classification:
 * - Intra-State (within Jammu & Kashmir): Split equally into CGST (9%) and SGST/UTGST (9%)
 * - Inter-State (outside Jammu & Kashmir): Full IGST (18%)
 */

export const GST_RATE = 0.18; // 18% standard rate
export const ORIGIN_STATE = 'Jammu & Kashmir';

export interface GstBreakdown {
  grossAmount: number;       // Final consumer total (inclusive of tax)
  taxableAmount: number;     // Base taxable value before tax
  totalTax: number;          // Total GST amount (Gross - Taxable)
  isInterState: boolean;     // Whether destination is outside origin state
  cgst: number;              // Central GST (9% for intra-state, 0 for inter-state)
  sgst: number;              // State/UT GST (9% for intra-state, 0 for inter-state)
  igst: number;              // Integrated GST (18% for inter-state, 0 for intra-state)
  hsnCode: string;           // Harmonized System of Nomenclature
  ratePercent: number;       // 18%
}

/**
 * Normalizes state strings to detect if an address belongs to Jammu & Kashmir.
 */
export function isIntraState(destinationState?: string | null): boolean {
  if (!destinationState) return false;
  const normalized = destinationState.toLowerCase().replace(/[^a-z]/g, '');
  return (
    normalized.includes('jammukashmir') ||
    normalized.includes('jk') ||
    normalized === 'jammu' ||
    normalized === 'kashmir'
  );
}

/**
 * Calculates inclusive GST breakdown for a given gross amount in Indian Rupees (₹).
 */
export function calculateGstBreakdown(
  grossAmount: number,
  destinationState?: string | null,
  hsnCode = '3304'
): GstBreakdown {
  if (grossAmount <= 0) {
    return {
      grossAmount: 0,
      taxableAmount: 0,
      totalTax: 0,
      isInterState: !isIntraState(destinationState),
      cgst: 0,
      sgst: 0,
      igst: 0,
      hsnCode,
      ratePercent: 18,
    };
  }

  // Taxable Value = Gross / 1.18
  const rawTaxable = grossAmount / (1 + GST_RATE);
  const taxableAmount = Math.round(rawTaxable * 100) / 100;
  const totalTax = Math.round((grossAmount - taxableAmount) * 100) / 100;

  const isInter = !isIntraState(destinationState);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInter) {
    igst = totalTax;
  } else {
    // 50-50 split for intra-state CGST + UTGST
    cgst = Math.round((totalTax / 2) * 100) / 100;
    sgst = Math.round((totalTax - cgst) * 100) / 100;
  }

  return {
    grossAmount,
    taxableAmount,
    totalTax,
    isInterState: isInter,
    cgst,
    sgst,
    igst,
    hsnCode,
    ratePercent: 18,
  };
}
