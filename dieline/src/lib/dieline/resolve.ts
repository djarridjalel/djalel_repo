// Turns user parameters (with "auto" values) into concrete construction
// dimensions, and collects the issues found on the way. Every warning that
// has an obvious remedy carries a one-click fix.

import { clamp, round } from "./geom";
import type { CartonParams, Issue, Resolved } from "./types";

export interface ResolveResult {
  r: Resolved;
  issues: Issue[];
}

const r1 = (v: number) => round(v, 1);
/** Largest 0.1 mm step that stays within a maximum, so a suggested fix never re-triggers its own check. */
const down1 = (v: number) => Math.floor(v * 10 + 1e-9) / 10;

export function resolve(p: CartonParams): ResolveResult {
  const issues: Issue[] = [];
  const t = clamp(p.caliper || 0.4, 0.15, 1.5);
  if (p.caliper < 0.2 || p.caliper > 1) {
    issues.push({ severity: "warning", field: "caliper", message: `Caliper ${p.caliper} mm is unusual for folding boxboard (0.2–1.0 mm).` });
  }

  const outside = p.dimMode === "outside";
  const Li = outside ? p.L - 2 * t : p.L;
  const Wi = outside ? p.W - 2 * t : p.W;
  const Hi = outside ? p.H - 2 * t : p.H;

  for (const [k, v, name] of [
    ["L", p.L, "Length"],
    ["W", p.W, "Width"],
    ["H", p.H, "Height"],
  ] as const) {
    if (!(v >= 10)) issues.push({ severity: "error", field: k, message: `${name} must be at least 10 mm.` });
    if (v > 600) issues.push({ severity: "error", field: k, message: `${name} above 600 mm is outside the folding-carton range.` });
  }

  const bottomLocks = p.style === "crash" || p.style === "snap";
  if (Wi > Li) {
    issues.push(
      bottomLocks
        ? {
            severity: "error",
            field: "W",
            message: "Lock bottoms need Length greater than Width: the front and back flaps form the base.",
            fix: { field: "W", value: r1(Math.max(10, p.L - 10)), label: `Set Width to ${r1(Math.max(10, p.L - 10))}` },
          }
        : {
            severity: "info",
            field: "W",
            message: "Width is larger than Length, so the lid closes across the long side. Swap them if the lid should span the short side.",
          },
    );
  }

  const panelWidths: [number, number, number, number] = [Li + t, Wi + t, Li + t, Wi];
  const bodyHeight = Hi + t;
  const lidDepth = Wi - t / 2;

  // Tuck flap
  const tuckAuto = clamp(round(Wi * 0.33, 0), 8, 25);
  let tuckDepth = p.tuckDepth ?? tuckAuto;
  const tuckMax = Math.max(6, Math.min(bodyHeight * 0.6, lidDepth + 5));
  if (tuckDepth > tuckMax) {
    issues.push({
      severity: "warning",
      field: "tuckDepth",
      message: `Tuck depth ${tuckDepth} mm is too deep for this carton (max ${down1(tuckMax)} mm).`,
      fix: { field: "tuckDepth", value: down1(tuckMax), label: `Use ${down1(tuckMax)} mm` },
    });
    tuckDepth = tuckMax;
  }
  if (tuckDepth < 6) {
    issues.push({ severity: "warning", field: "tuckDepth", message: "Tuck flaps under 6 mm do not hold the lid closed.", fix: { field: "tuckDepth", value: 6, label: "Use 6 mm" } });
    tuckDepth = 6;
  }

  const slitOffset = round(Math.max(2 * t, 0.8), 2);
  const sideClear = round(t / 2 + 0.2, 2);
  const lidW = panelWidths[2];
  const slitAuto = clamp(round(lidW * 0.12, 1), slitOffset + sideClear + 2, 8);
  let slitLength = p.slitLength ?? slitAuto;
  const slitMax = Math.max(slitOffset + sideClear + 1.5, lidW * 0.3);
  if (p.lock === "slit" && slitLength > slitMax) {
    issues.push({ severity: "warning", field: "slitLength", message: `Lock slits longer than ${down1(slitMax)} mm weaken the tuck.`, fix: { field: "slitLength", value: down1(slitMax), label: `Use ${down1(slitMax)} mm` } });
    slitLength = slitMax;
  }
  if (p.lock === "slit" && slitLength < slitOffset + sideClear + 1.5) {
    slitLength = slitOffset + sideClear + 1.5;
  }

  const radiusMax = Math.max(0, Math.min(tuckDepth - slitOffset - 0.5, (lidW - 2 * sideClear) / 2 - 1));
  let tuckRadius = p.tuckRadius ?? round(Math.min(tuckDepth * 0.75, radiusMax), 1);
  if (tuckRadius > radiusMax) {
    issues.push({ severity: "warning", field: "tuckRadius", message: `Tuck corner radius is limited to ${down1(radiusMax)} mm by the tuck depth.`, fix: { field: "tuckRadius", value: down1(radiusMax), label: `Use ${down1(radiusMax)} mm` } });
    tuckRadius = radiusMax;
  }
  tuckRadius = Math.max(0, tuckRadius);

  // Dust flaps fold toward each other along the length.
  const dustMax = Li / 2 - 1;
  const dustAuto = clamp(round(Li * 0.33, 0), 6, Math.max(6, dustMax));
  let dustDepth = p.dustDepth ?? dustAuto;
  if (dustDepth > dustMax) {
    issues.push({ severity: "warning", field: "dustDepth", message: `Dust flaps deeper than ${down1(dustMax)} mm collide when folded.`, fix: { field: "dustDepth", value: down1(dustMax), label: `Use ${down1(dustMax)} mm` } });
    dustDepth = Math.max(5, dustMax);
  }
  if (dustDepth < 5) dustDepth = 5;

  // Manufacturer's joint
  const glueAuto = clamp(15, 8, Math.max(8, Li * 0.5));
  let glueWidth = p.glueWidth ?? glueAuto;
  if (glueWidth > Li - 3) {
    const v = down1(Math.max(8, Li - 5));
    issues.push({ severity: "warning", field: "glueWidth", message: "Glue flap is wider than the panel it is glued to.", fix: { field: "glueWidth", value: v, label: `Use ${v} mm` } });
    glueWidth = Math.max(5, Li - 5);
  }
  if (glueWidth < 10) {
    issues.push({ severity: "info", field: "glueWidth", message: "Most folder-gluers need a glue flap of at least 10–12 mm.", fix: { field: "glueWidth", value: 12, label: "Use 12 mm" } });
  }
  const glueAngle = clamp(p.glueAngle ?? (p.style === "crash" ? 45 : 15), 0, 60);

  // Lock bottoms
  let bottomExtension = p.bottomExtension ?? round(Wi * 0.25, 1);
  if (bottomLocks) {
    const c = Wi / 2 + t / 2;
    const maxE = c - 3;
    if (bottomExtension > maxE) {
      if (p.bottomExtension != null) {
        issues.push({ severity: "warning", field: "bottomExtension", message: `Base lock extension is limited to ${down1(maxE)} mm for these dimensions.`, fix: { field: "bottomExtension", value: down1(maxE), label: `Use ${down1(maxE)} mm` } });
      }
      bottomExtension = Math.max(3, maxE);
    }
    if (p.style === "snap" && Li - Wi < 10) {
      issues.push({ severity: "error", field: "L", message: "Snap-lock bottoms need Length at least 10 mm more than Width for the centre tongue. Use crash-lock or a tuck end instead." });
    }
    if (p.style === "crash" && Wi > Li - 2) {
      issues.push({ severity: "error", field: "W", message: "Crash-lock bottoms need Length clearly greater than Width." });
    }
  }

  if (p.bleed < 0 || p.bleed > 10) issues.push({ severity: "warning", field: "bleed", message: "Bleed is normally 0–5 mm." });

  return {
    r: {
      Li,
      Wi,
      Hi,
      t,
      panelWidths,
      bodyHeight,
      lidDepth,
      tuckDepth: round(tuckDepth, 2),
      tuckRadius: round(tuckRadius, 2),
      slitLength: round(slitLength, 2),
      slitOffset,
      sideClear,
      dustDepth: round(dustDepth, 2),
      glueWidth: round(glueWidth, 2),
      glueAngle,
      bottomExtension: round(bottomExtension, 2),
    },
    issues,
  };
}
