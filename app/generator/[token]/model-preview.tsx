"use client";

import { createElement, useEffect } from "react";

export function ModelPreview({ src }: { src: string }) {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return createElement("model-viewer", {
    src,
    className: "model-viewer-element",
    alt: "Wygenerowany model figurki 3D",
    "camera-controls": true,
    "auto-rotate": true,
    "rotation-per-second": "18deg",
    "shadow-intensity": "1",
    "environment-image": "neutral",
    exposure: "1.05",
    loading: "eager",
    reveal: "auto",
    "touch-action": "pan-y",
  });
}
