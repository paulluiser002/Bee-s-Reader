export function BeeMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g
        className="bee-flight"
        stroke="#392719"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M44 31q-2-9-10-11m22 11q2-9 10-11" fill="none" />
        <circle cx="33" cy="19" r="3" fill="#392719" stroke="none" />
        <circle cx="67" cy="19" r="3" fill="#392719" stroke="none" />
        <path
          className="bee-wing bee-wing-left"
          d="M34 52C10 53 9 26 23 31c8 2 13 10 17 16Z"
          fill="#fff5d4"
        />
        <path
          className="bee-wing bee-wing-right"
          d="M66 52c24 1 25-26 11-21-8 2-13 10-17 16Z"
          fill="#fff5d4"
        />
        <ellipse cx="50" cy="50" rx="21" ry="22" fill="#f6bb49" />
        <path d="M31 53q19 8 38 0" fill="none" />
        <circle cx="43" cy="43" r="2" fill="#392719" stroke="none" />
        <circle cx="57" cy="43" r="2" fill="#392719" stroke="none" />
        <path d="M47 47q3 4 6 0" fill="none" strokeWidth="2" />
        <path d="M50 67q-13-11-31-8v19q17-2 31 8 14-10 31-8V59q-18-3-31 8Zm0 0v19" fill="#fff5d4" />
        <path d="M27 67q8 0 15 4m16 0q7-4 15-4" fill="none" strokeWidth="2" />
      </g>
    </svg>
  );
}
