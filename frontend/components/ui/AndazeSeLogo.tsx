// Logo for "Andaze Se"
// Mark: open book with a spark above the spine
//   book = exams / studying
//   spark = AI prediction magic
// "andaze" white bold + "se" Discord blue

interface AndazeSeLogoProps {
  size?: "sm" | "md" | "lg";
}

export function AndazeSeLogo({ size = "md" }: AndazeSeLogoProps) {
  const cfg = {
    sm: { s: 18, textA: "text-[14px]", textB: "text-[13px]", gap: "gap-1.5" },
    md: { s: 24, textA: "text-[18px]", textB: "text-[17px]", gap: "gap-2"   },
    lg: { s: 32, textA: "text-[23px]", textB: "text-[22px]", gap: "gap-2.5" },
  }[size];

  const s  = cfg.s;          // bounding box
  const cx = s / 2;          // centre x
  const cy = s / 2 + s * 0.06; // centre y (slightly below mid to give room for spark)

  // Book geometry derived from s
  const bw  = s * 0.82;      // book total width
  const bh  = s * 0.50;      // book height
  const bx  = (s - bw) / 2; // book left x
  const by  = cy - bh * 0.3; // book top y

  const spine = cx;          // spine x (centre)
  const bookB = by + bh;     // book bottom y

  // Spark sits above the spine
  const sparkY = by - s * 0.12;
  const sparkR = s * 0.07;

  return (
    <div className={`flex items-center ${cfg.gap} select-none`}>

      {/* ── Mark ── */}
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left page — slight upward curve at top */}
        <path
          d={`
            M ${spine} ${by + bh * 0.08}
            C ${spine - bw * 0.15} ${by - bh * 0.04},
              ${bx + bw * 0.04}   ${by + bh * 0.02},
              ${bx}               ${by + bh * 0.12}
            L ${bx}     ${bookB}
            L ${spine}  ${bookB}
            Z
          `}
          fill="rgba(88,101,242,0.55)"
        />

        {/* Right page */}
        <path
          d={`
            M ${spine} ${by + bh * 0.08}
            C ${spine + bw * 0.15} ${by - bh * 0.04},
              ${bx + bw * 0.96}   ${by + bh * 0.02},
              ${bx + bw}          ${by + bh * 0.12}
            L ${bx + bw} ${bookB}
            L ${spine}   ${bookB}
            Z
          `}
          fill="#5865F2"
        />

        {/* Spine line */}
        <line
          x1={spine} y1={by + bh * 0.06}
          x2={spine} y2={bookB}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={Math.max(1, s * 0.03)}
        />

        {/* Lines on pages (text lines) */}
        {[0.35, 0.55, 0.75].map((t, i) => (
          <g key={i}>
            <line
              x1={bx + bw * 0.06} y1={by + bh * t}
              x2={spine - bw * 0.06} y2={by + bh * t}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={Math.max(0.8, s * 0.025)}
              strokeLinecap="round"
            />
            <line
              x1={spine + bw * 0.06} y1={by + bh * t}
              x2={bx + bw - bw * 0.06} y2={by + bh * t}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={Math.max(0.8, s * 0.025)}
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* ── Spark / star above spine ── */}
        {/* Glow */}
        <circle cx={spine} cy={sparkY} r={sparkR * 2.5} fill="#FEE75C" opacity="0.15" />
        {/* 4-point star */}
        <path
          d={`
            M ${spine} ${sparkY - sparkR * 2.2}
            L ${spine + sparkR * 0.5} ${sparkY - sparkR * 0.5}
            L ${spine + sparkR * 2.2} ${sparkY}
            L ${spine + sparkR * 0.5} ${sparkY + sparkR * 0.5}
            L ${spine} ${sparkY + sparkR * 2.2}
            L ${spine - sparkR * 0.5} ${sparkY + sparkR * 0.5}
            L ${spine - sparkR * 2.2} ${sparkY}
            L ${spine - sparkR * 0.5} ${sparkY - sparkR * 0.5}
            Z
          `}
          fill="#FEE75C"
        />
      </svg>

      {/* ── Wordmark ── */}
      <div className="flex items-baseline leading-none">
        <span
          className={`font-black text-text-primary ${cfg.textA}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          andaze
        </span>
        <span
          className={`font-black ${cfg.textB}`}
          style={{ color: "#5865F2", letterSpacing: "-0.03em" }}
        >
          &nbsp;se
        </span>
        <span
          className={`font-black ${cfg.textB}`}
          style={{ color: "#FEE75C" }}
        >
          .
        </span>
      </div>
    </div>
  );
}
