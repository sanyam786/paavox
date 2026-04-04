'use client';

/**
 * Contiq logo mark.
 *
 * The mark is a bracket-style "C" (two horizontal arms + one vertical spine)
 * — impossible to read as an "O" — with a filled dot sitting in the open gap,
 * representing the intelligence / IQ half of the brand name.
 *
 * Swap VARIANT to try the three different logo concepts:
 *   'bracket'  – bold bracket C + dot  (default, cleanest)
 *   'lines'    – stacked content lines + spark dot
 *   'arc'      – wide-open arc C + dot (more circular, use with caution)
 */

type Variant = 'bracket' | 'lines' | 'arc' | 'arc-spark' | 'bracket-spark';

interface Props {
  size?: number;
  variant?: Variant;
}

export default function ContiqLogo({ size = 32, variant = 'bracket' }: Props) {
  const r = Math.round(size * 0.28);       // border-radius
  const inner = Math.round(size * 0.66);   // inner SVG size

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: 'linear-gradient(140deg, #6366f1 0%, #4338ca 100%)',
        boxShadow: '0 2px 10px rgba(79,70,229,0.40)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {variant === 'bracket' && (
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
          {/*
            Bracket C:
            Top arm  → left spine → bottom arm
            The right side is FULLY OPEN — cannot look like O.
          */}
          <path
            d="M 16 5 H 8 Q 5 5 5 8 V 16 Q 5 19 8 19 H 16"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* IQ dot — sits in the centre of the open gap */}
          <circle cx="19.5" cy="12" r="2" fill="white" />
        </svg>
      )}

      {variant === 'lines' && (
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
          {/* Three content lines — classic "document" mark */}
          <line x1="4" y1="7"  x2="20" y2="7"  stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="4" y1="12" x2="15" y2="12" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="4" y1="17" x2="10" y2="17" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          {/* Spark at the end of the last line — the IQ element */}
          <circle cx="13.5" cy="17" r="2.2" fill="white" />
          <line x1="13.5" y1="14.2" x2="13.5" y2="13"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <line x1="13.5" y1="19.8" x2="13.5" y2="21"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <line x1="16.3" y1="17"   x2="17.5" y2="17"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          <line x1="10.7" y1="17"   x2="9.5"  y2="17"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
        </svg>
      )}

      {variant === 'arc' && (
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
          {/*
            Wide-arc C: 260° span, 100° opening.
            Center (10,12) radius 8.
            Tips at approx (15.1, 5.9) and (15.1, 18.1)
          */}
          <path
            d="M 15.1 5.9 A 8 8 0 1 0 15.1 18.1"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="19.5" cy="12" r="1.8" fill="white" />
        </svg>
      )}

      {variant === 'bracket-spark' && (
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
          {/* Same bracket C as 'bracket' variant */}
          <path
            d="M 16 5 H 8 Q 5 5 5 8 V 16 Q 5 19 8 19 H 16"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Spark dot — circle + 4 rays, centred in the open gap */}
          <circle cx="19.5" cy="12" r="2.0" fill="white" />
          <line x1="19.5" y1="9.2"  x2="19.5" y2="8.0"  stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="19.5" y1="14.8" x2="19.5" y2="16.0" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="16.7" y1="12"   x2="15.5" y2="12"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="22.3" y1="12"   x2="23.5" y2="12"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        </svg>
      )}

      {variant === 'arc-spark' && (
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
          {/* Same wide-arc C as 'arc' variant */}
          <path
            d="M 15.1 5.9 A 8 8 0 1 0 15.1 18.1"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Spark dot — circle + 4 rays, centred in the open gap */}
          <circle cx="19.5" cy="12" r="2.0" fill="white" />
          <line x1="19.5" y1="9.2"  x2="19.5" y2="8.0"  stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="19.5" y1="14.8" x2="19.5" y2="16.0" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="16.7" y1="12"   x2="15.5" y2="12"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
          <line x1="22.3" y1="12"   x2="23.5" y2="12"   stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        </svg>
      )}
    </div>
  );
}
