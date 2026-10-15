import type React from "react";
import type { StyleId } from "@/lib/dieline/types";

// Simplified flat blanks: four panels, the closures that make each style.
export function StyleIcon({ style }: { style: StyleId }) {
  const own = OWN[style];
  if (own) return <Svg>{own}</Svg>;
  const body = <path d="M6 18h48v24H6z M18 18v24 M30 18v24 M42 18v24 M54 20l4 2v16l-4 2" />;
  const topLid = <path d="M30 18v-9h12v9 M31 9q0-4 4-4h2q4 0 4 4" />;
  const dustTop = <path d="M18 18l1-5h10l1 5 M42 18l1-5h10l1 5" />;
  const dustBottom = <path d="M18 42l1 5h10l1-5 M42 42l1 5h10l1-5" />;
  let bottom;
  switch (style) {
    case "ste":
      bottom = (
        <>
          {dustBottom}
          <path d="M30 42v9h12v-9 M31 51q0 4 4 4h2q4 0 4-4" />
        </>
      );
      break;
    case "rte":
      bottom = (
        <>
          {dustBottom}
          <path d="M6 42v9h12v-9 M7 51q0 4 4 4h2q4 0 4-4" />
        </>
      );
      break;
    case "crash":
    case "srp":
      bottom = <path d="M6 42l1 10h6l2-3h3M18 42l3 6h4l5-6 M30 42l1 10h6l2-3h3 M42 42l3 6h4l5-6" />;
      break;
    case "snap":
    case "gable":
      bottom = <path d="M6 42v10h3v-4h6v4h3v-10 M18 42l5 5-1 5h8v-10 M30 42l4 4v6h4v-6l4-4 M42 42v10h8l-1-5 5-5" />;
      break;
  }
  const gableTop = <path d="M6 18v-6h12v6 M18 18l6-6 6 6 M30 18v-6h12v6 M42 18l6-6 6 6 M8 12l2-5h6l2 5 M32 12l2-5h6l2 5" />;
  return (
    <Svg>
      {style === "gable" ? gableTop : (
        <>
          {topLid}
          {dustTop}
        </>
      )}
      {body}
      {style === "srp" && <path d="M6 30h12l12-12 M42 18l12 12" strokeDasharray="2 1.5" />}
      {bottom}
    </Svg>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 60 60" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

const OWN: Partial<Record<StyleId, React.ReactNode>> = {
  pillow: <path d="M6 16v28 M30 16v28 M54 16v28l4-3v-22l-4-3 M6 16q12-9 24 0q12-9 24 0 M6 44q12 9 24 0q12 9 24 0 M6 16q12 6 24 0q12 6 24 0 M6 44q12-6 24 0q12-6 24 0" />,
  mailer: <path d="M20 22h20v16h-20z M10 22h10v16h-10z M40 22h10v16h-10z M4 23h6v14h-6z M50 23h6v14h-6z M20 38v8h20v-8 M20 22v-6h20v6 M21 16v-10h18v10 M39 7q6 0 6 6 M21 7q-6 0-6 6" />,
  display: <path d="M18 24h24v16h-24z M18 24v-18h24v18 M42 24h12l-6 16h-6 M18 24h-12l6 16h6 M18 40v6h24v-6 M18 46v6h24v-6" />,
};
