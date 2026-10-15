import type { StyleId } from "@/lib/dieline/types";

// Simplified flat blanks: four panels, the closures that make each style.
export function StyleIcon({ style }: { style: StyleId }) {
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
      bottom = <path d="M6 42l1 10h6l2-3h3M18 42l3 6h4l5-6 M30 42l1 10h6l2-3h3 M42 42l3 6h4l5-6" />;
      break;
    case "snap":
      bottom = <path d="M6 42v10h3v-4h6v4h3v-10 M18 42l5 5-1 5h8v-10 M30 42l4 4v6h4v-6l4-4 M42 42v10h8l-1-5 5-5" />;
      break;
  }
  return (
    <svg viewBox="0 0 60 60" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" aria-hidden>
      {topLid}
      {dustTop}
      {body}
      {bottom}
    </svg>
  );
}
