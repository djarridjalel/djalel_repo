// Links between the dieline drawing, the checks and the fields that shape them:
// clicking a panel or a check brings its field into view.

import type { PanelId, StyleId } from "@/lib/dieline/types";

/** The sections each field sits in (a field can sit in different sections for different styles). */
export const FIELD_SECTIONS: Record<string, string[]> = {
  L: ["Size"],
  W: ["Size"],
  H: ["Size"],
  caliper: ["Board"],
  gsm: ["Board"],
  tuckDepth: ["Closures"],
  tuckRadius: ["Closures"],
  slitLength: ["Closures"],
  glueAngle: ["Closures"],
  glueWidth: ["Closures", "Handle"],
  bottomExtension: ["Closures", "Handle"],
  "gable.handleHeight": ["Handle"],
  "srp.tearDepth": ["Tear-away front"],
  "display.header": ["Display"],
  "display.rise": ["Display"],
  bleed: ["Print setup"],
  safeMargin: ["Print setup"],
};

/** The field that sizes a panel of the blank. */
export function fieldOfPanel(id: PanelId | string, style: StyleId): string {
  switch (id) {
    case "front":
    case "back":
    case "base":
      return "L";
    case "sideA":
    case "sideB":
      return style === "mailer" || style === "display" ? "H" : "W";
    case "topTuck":
    case "bottomTuck":
      return style === "mailer" ? "H" : "tuckDepth";
    case "topLid":
    case "bottomLid":
      return style === "gable" ? "L" : "W";
    case "glueFlap":
      return "glueWidth";
    case "handle":
      return "gable.handleHeight";
    case "header":
      return "display.header";
    default:
      return "L";
  }
}

/** The panels a field shapes, to point at them on the dieline. */
export function panelsOfField(field: string | undefined, style: StyleId): string[] {
  if (!field) return [];
  const all = ["front", "back", "base", "sideA", "sideB", "topTuck", "bottomTuck", "topLid", "bottomLid", "glueFlap", "handle", "header"];
  if (field === "H") return style === "mailer" || style === "display" ? ["front", "back", "sideA", "sideB"] : ["front", "back", "sideA", "sideB", "glueFlap"];
  return all.filter((id) => fieldOfPanel(id, style) === field);
}
