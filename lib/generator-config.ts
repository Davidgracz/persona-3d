export const GENERATION_PRICE_CENTS = 4900;
export const GENERATION_CURRENCY = "pln";
export const GENERATION_PRICE_LABEL = "49 zł";

export type GenerationStyle = "realistic" | "chibi";

export function isGenerationStyle(value: unknown): value is GenerationStyle {
  return value === "realistic" || value === "chibi";
}

export function styleLabel(style: GenerationStyle) {
  return style === "chibi" ? "Figurka chibi" : "Figurka realistyczna";
}
