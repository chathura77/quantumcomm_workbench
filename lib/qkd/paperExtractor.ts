import { formatId } from "@/lib/math";

export type ExtractedParameter = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  span: string;
  confidence: "low" | "medium" | "high";
};

const PATTERNS: Array<{
  label: string;
  unit?: string;
  regex: RegExp;
  confidence: ExtractedParameter["confidence"];
}> = [
  { label: "Protocol", regex: /\b(BB84|decoy[- ]state BB84|E91|BBM92|MDI[- ]QKD|TF[- ]QKD|CV[- ]QKD|continuous[- ]variable)\b/i, confidence: "high" },
  { label: "Distance", unit: "km", regex: /\b(?:over\s+|up to\s+|distance(?: of)?\s*)?(\d+(?:\.\d+)?)\s*[- ]?km\b/i, confidence: "high" },
  { label: "Loss", unit: "dB", regex: /\b(\d+(?:\.\d+)?)\s*dB\b/i, confidence: "medium" },
  { label: "Attenuation", unit: "dB/km", regex: /\b(\d+(?:\.\d+)?)\s*dB\/km\b/i, confidence: "high" },
  { label: "QBER", regex: /\b(?:QBER|error rate)(?: of|=|:)?\s*(\d+(?:\.\d+)?\s*%|0\.\d+)\b/i, confidence: "high" },
  { label: "Secret key rate", regex: /\b(?:secret key rate|key rate)(?: of|=|:)?\s*(\d+(?:\.\d+)?)\s*(kbps|kbit\/s|Mbps|Mbit\/s|bps|bit\/s)\b/i, confidence: "high" },
  { label: "Wavelength", unit: "nm", regex: /\b(\d+(?:\.\d+)?)\s*nm\b/i, confidence: "high" },
  { label: "Detector efficiency", regex: /\b(?:detector )?efficiency(?: of|=|:)?\s*(\d+(?:\.\d+)?)\s*%\b/i, confidence: "medium" },
  { label: "Dark count rate", regex: /\b(?:dark count(?: rate)?)(?: of|=|:)?\s*(\d+(?:\.\d+)?)\s*(cps|Hz|s-1)\b/i, confidence: "high" },
  { label: "Repetition rate", regex: /\b(?:repetition rate|clock rate|source rate)(?: of|=|:)?\s*(\d+(?:\.\d+)?)\s*(GHz|MHz|kHz|Hz)\b/i, confidence: "high" }
];

export function extractPaperParameters(text: string): ExtractedParameter[] {
  const results: ExtractedParameter[] = [];
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const value = match[1]?.trim() ?? match[0].trim();
    results.push({
      id: formatId(pattern.label),
      label: pattern.label,
      value,
      unit: pattern.unit ?? match[2],
      span: match[0],
      confidence: pattern.confidence
    });
  }
  return results;
}
