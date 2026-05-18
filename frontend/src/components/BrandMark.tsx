import { useId } from "react";
import { BRAND_SHORT } from "../brand";

type Props = { compact?: boolean };

export function BrandMark({ compact }: Props) {
  const gradId = `vmBrandGrad-${useId().replace(/:/g, "")}`;
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-hidden>
      <svg className="brand-mark__icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="6" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0d8a8d" />
            <stop offset="1" stopColor="#0a4d5c" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
        <path
          d="M20 10v20M12 20h16"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M27 13.5c1.6 1.8 2.5 4 2.5 6.5s-0.9 4.7-2.5 6.5"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <div className="brand-mark__text">
          <span className="brand-mark__name">{BRAND_SHORT}</span>
          <span className="brand-mark__sub">медицинский центр</span>
        </div>
      )}
    </div>
  );
}
