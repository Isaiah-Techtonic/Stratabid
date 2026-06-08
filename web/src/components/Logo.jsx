import { Link } from 'react-router-dom';

// Inline brand icon: three stacked gold "strata" slabs with navy bedding lines,
// and a small gold gavel poised above. No background box — transparent, reads
// cleanly on the navy header. Colors are the brand gold (#d97706) + navy (#1e3a5f).
export function BrandIcon({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" role="img" aria-label="StrataBid">
      {/* stacked strata slabs (gold), slight pyramid */}
      <rect x="6" y="29" width="28" height="6" rx="2" fill="#d97706" />
      <rect x="9" y="21" width="22" height="6" rx="2" fill="#d97706" />
      <rect x="12" y="13" width="16" height="6" rx="2" fill="#d97706" />
      {/* strata bedding lines (navy) on the slabs */}
      <rect x="8" y="31.4" width="24" height="1.3" rx="0.65" fill="#1e3a5f" />
      <rect x="11" y="23.4" width="18" height="1.3" rx="0.65" fill="#1e3a5f" />
      <rect x="14" y="15.4" width="12" height="1.3" rx="0.65" fill="#1e3a5f" />
      {/* gavel accent (gold), poised above the strata */}
      <g transform="rotate(-40 18 9)">
        <rect x="11.5" y="4" width="13" height="5" rx="2.5" fill="#d97706" />
        <rect x="16.7" y="8" width="2.6" height="10" rx="1.3" fill="#d97706" />
        <rect x="16.9" y="7.2" width="2.2" height="2.8" rx="0.8" fill="#1e3a5f" />
      </g>
    </svg>
  );
}

// The full logo lockup: icon + "STRATA"(white) "BID"(gold) wordmark, linking home.
export default function Logo({ className = '' }) {
  return (
    <Link to="/" aria-label="StrataBid home" className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <BrandIcon className="h-8 w-8" />
      <span className="font-display text-2xl uppercase tracking-wide">
        Strata<span className="text-gold">Bid</span>
      </span>
    </Link>
  );
}
