import React from 'react';

interface DoctorReplyCardProps {
  response: string;
  respondedAt?: string | null;
}

export default function DoctorReplyCard({ response, respondedAt }: DoctorReplyCardProps) {
  const formattedDate = respondedAt
    ? new Date(respondedAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mt-4 p-4 rounded-xl bg-[#F6EFE6] border border-[#E8E0D5]/80 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Clinical Stethoscope / Medical Verification Shield SVG */}
          <div className="w-5 h-5 rounded-full bg-[#5C3D1E] flex items-center justify-center text-white text-[10px]">
            <svg
              className="w-3 h-3 text-white fill-current"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xs font-bold text-[#5C3D1E] tracking-wide uppercase">
            Dr. Ria&apos;s Clinical Team
          </span>
        </div>
        {formattedDate && (
          <span className="text-[11px] text-[#6B6B6B]">{formattedDate}</span>
        )}
      </div>
      <p className="text-xs sm:text-sm text-[#3E2914] leading-relaxed italic">
        &ldquo;{response}&rdquo;
      </p>
    </div>
  );
}
