/**
 * MTRC ENTREPOSE Therapeutic Modality Color & Label Configuration
 *
 * Specific guidelines:
 * - Distinct colors for each modality so case managers and clinicians can tell them apart instantly.
 * - Warm, grounded color palettes:
 *     - CBT Group: Warm Forest Green
 *     - Psycho-Education: Warm Terracotta / Clay Rust
 *     - Self-Help Group (SHGM): Warm Mulberry / Plum Wine
 *     - Individual Counseling (ICA): Warm Golden Ochre / Caramel Amber
 *     - Conjoint / Family: Warm Olive Bronze / Moss
 * - "Not too light" (solid background tint with substantial borders and deep, high-contrast text).
 */

export const MODALITY_CONFIG = {
  CBT_GROUP: {
    label: "CBT Group Session",
    shortLabel: "CBT",
    bg: "#DCF2E5",
    border: "#8CD1A8",
    text: "#0E432B",
    badgeBg: "#1E6E49",
  },
  PSYCHO_EDUCATION: {
    label: "Psycho-Education",
    shortLabel: "PE",
    bg: "#FADBD0",
    border: "#EAA894",
    text: "#7A2B12",
    badgeBg: "#B84C24",
  },
  SHGM: {
    label: "Self-Help Group",
    shortLabel: "SHGM",
    bg: "#F5DCE7",
    border: "#DA98B8",
    text: "#611A3E",
    badgeBg: "#8F2859",
  },
  INDIVIDUAL_COUNSELING: {
    label: "Individual Counseling",
    shortLabel: "ICA",
    bg: "#FAE5BC",
    border: "#E6B96E",
    text: "#6E3E00",
    badgeBg: "#B56F00",
  },
  CONJOINT_FAMILY: {
    label: "Conjoint / Family",
    shortLabel: "Conjoint",
    bg: "#E5EDBE",
    border: "#B6C978",
    text: "#33430F",
    badgeBg: "#546C20",
  },
};

export function getModalityConfig(type) {
  if (!type) {
    return {
      label: "General Session",
      shortLabel: "Session",
      bg: "#F4F7F4",
      border: "#CBDAD0",
      text: "#2D4A3E",
      badgeBg: "#166534",
    };
  }
  const key = String(type).toUpperCase().trim();
  return (
    MODALITY_CONFIG[key] || {
      label: type,
      shortLabel: "Session",
      bg: "#F4F7F4",
      border: "#CBDAD0",
      text: "#2D4A3E",
      badgeBg: "#166534",
    }
  );
}
