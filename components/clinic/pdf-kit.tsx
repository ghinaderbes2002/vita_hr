// Client-only shared PDF primitives for the clinic reports (VitaSyr style).
// Header, footer, theme, Arabic pre-shaper and field/section building blocks —
// mirrors the design used by physio-full-pdf.tsx. Imported by the prosthetics
// gait-analysis and full-case PDF documents so they stay visually identical.
import React from "react";
import { Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// ── Theme ────────────────────────────────────────────────────────────────────────
export const BRAND       = "#346180";
export const BRAND_LIGHT = "#EAF2F7";
export const TEXT        = "#111827";
export const MUTED       = "#6b7280";
export const BORDER      = "#d0dde6";

// ── Styles ─────────────────────────────────────────────────────────────────────
export const S = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 10,
    color: TEXT,
    paddingTop: 66,
    paddingBottom: 62,
    paddingHorizontal: 24,
    direction: "rtl",
    textAlign: "right",
    backgroundColor: "#ffffff",
  },
  pageHeader: {
    position: "absolute",
    top: 10,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 5,
  },
  pageFooter: {
    position: "absolute",
    bottom: 8,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: BRAND,
    paddingTop: 5,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageFooterText: { fontSize: 7, color: BRAND },
  sectionHeader: {
    backgroundColor: BRAND,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
    marginTop: 14,
    borderRadius: 3,
  },
  sectionHeaderText: { color: "#ffffff", fontWeight: "bold", fontSize: 11, textAlign: "center" },
  subHeader: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    marginTop: 8,
    borderRadius: 2,
    borderRightWidth: 3,
    borderRightColor: BRAND,
  },
  subHeaderText: { color: BRAND, fontWeight: "bold", fontSize: 9.5 },
  fieldRow: {
    flexDirection: "row-reverse",
    marginBottom: 2,
    flexWrap: "nowrap",
    alignItems: "flex-start",
  },
  fieldLabel: { fontSize: 8.5, color: TEXT, flexShrink: 0 },
  fieldValue: { fontSize: 8.5, color: MUTED, flex: 1, textAlign: "right", paddingRight: 12 },
  yes: { color: "#16a34a" },
  no:  { color: "#9ca3af" },
  divider: { borderBottomWidth: 0.5, borderBottomColor: BORDER, marginVertical: 4 },
  note: { fontSize: 8, color: MUTED, fontStyle: "italic", marginTop: 2 },
  table: { marginTop: 5, marginBottom: 5 },
  tableHeaderRow: {
    flexDirection: "row-reverse",
    backgroundColor: BRAND,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingHorizontal: 6,
    paddingVertical: 3.5,
  },
  tableRowAlt: { backgroundColor: "#F4F8FB" },
  tableCellHead: { flex: 1, fontSize: 8.5, color: "#ffffff", fontWeight: "bold", textAlign: "right" },
  tableCell: { flex: 1, fontSize: 8.5, color: TEXT, textAlign: "right" },
});

// ── Arabic pre-shaper ────────────────────────────────────────────────────────────
// react-pdf does NOT apply OpenType GSUB for Arabic — letters appear disconnected
// without pre-shaping. We convert to Unicode Presentation Forms (FB50-FDFF) which
// Amiri has in its cmap, so fontkit renders the correct contextual glyph.
const _AF: Record<number, readonly [string,string,string,string]> = {
  0x0622:['آ','ﺂ','',''],   0x0623:['أ','ﺄ','',''],   0x0624:['ؤ','ﺆ','',''],
  0x0625:['إ','ﺈ','',''],   0x0626:['ﺉ','ﺊ','ﺋ','ﺌ'], 0x0627:['ﺍ','ﺎ','',''],
  0x0628:['ﺏ','ﺐ','ﺑ','ﺒ'], 0x0629:['ﺓ','ﺔ','',''],   0x062A:['ﺕ','ﺖ','ﺗ','ﺘ'],
  0x062B:['ﺙ','ﺚ','ﺛ','ﺜ'], 0x062C:['ﺝ','ﺞ','ﺟ','ﺠ'], 0x062D:['ﺡ','ﺢ','ﺣ','ﺤ'],
  0x062E:['ﺥ','ﺦ','ﺧ','ﺨ'], 0x062F:['ﺩ','ﺪ','',''],   0x0630:['ﺫ','ﺬ','',''],
  0x0631:['ﺭ','ﺮ','',''],   0x0632:['ﺯ','ﺰ','',''],   0x0633:['ﺱ','ﺲ','ﺳ','ﺴ'],
  0x0634:['ﺵ','ﺶ','ﺷ','ﺸ'], 0x0635:['ﺹ','ﺺ','ﺻ','ﺼ'], 0x0636:['ﺽ','ﺾ','ﺿ','ﻀ'],
  0x0637:['ﻁ','ﻂ','ﻃ','ﻄ'], 0x0638:['ﻅ','ﻆ','ﻇ','ﻈ'], 0x0639:['ﻉ','ﻊ','ﻋ','ﻌ'],
  0x063A:['ﻍ','ﻎ','ﻏ','ﻐ'], 0x0641:['ﻑ','ﻒ','ﻓ','ﻔ'], 0x0642:['ﻕ','ﻖ','ﻗ','ﻘ'],
  0x0643:['ﻙ','ﻚ','ﻛ','ﻜ'], 0x0644:['ﻝ','ﻞ','ﻟ','ﻠ'], 0x0645:['ﻡ','ﻢ','ﻣ','ﻤ'],
  0x0646:['ﻥ','ﻦ','ﻧ','ﻨ'], 0x0647:['ﻩ','ﻪ','ﻫ','ﻬ'], 0x0648:['ﻭ','ﻮ','',''],
  0x0649:['ﻯ','ﻰ','',''],   0x064A:['ﻱ','ﻲ','ﻳ','ﻴ'],
};
const _NJL = new Set([0x0621,0x0622,0x0623,0x0624,0x0625,0x0627,0x0629,0x062F,0x0630,0x0631,0x0632,0x0648,0x0649]);
const _LA: Record<number,[string,string]> = {
  0x0622:['ﻵ','ﻶ'], 0x0623:['ﻷ','ﻸ'], 0x0625:['ﻹ','ﻺ'], 0x0627:['ﻻ','ﻼ'],
};
const _CMB = new Set([
  0x0610,0x0611,0x0612,0x0613,0x0614,0x0615,0x0616,0x0617,0x0618,0x0619,0x061A,
  0x064B,0x064C,0x064D,0x064E,0x064F,0x0650,0x0651,0x0652,0x0653,0x0654,0x0655,
  0x0656,0x0657,0x0658,0x0659,0x065A,0x065B,0x065C,0x065D,0x065E,0x065F,0x0640,
]);

export function ar(s: string): string {
  if (!s) return "";
  if (!/[؀-ۿ]/.test(s)) return s;
  const cs = [...s];
  const out: string[] = [];
  const base = (idx: number, dir: -1 | 1): number => {
    let i = idx + dir;
    while (i >= 0 && i < cs.length) {
      const cp = cs[i].codePointAt(0) ?? 0;
      if (!_CMB.has(cp)) return cp;
      i += dir;
    }
    return 0;
  };
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i].codePointAt(0) ?? 0;
    if (_CMB.has(c)) { out.push(cs[i]); continue; }
    const f = _AF[c];
    if (!f) { out.push(cs[i]); continue; }
    const p = base(i, -1);
    const n = base(i,  1);
    if (c === 0x0644 && _LA[n]) {
      const pj = !!(p && _AF[p] && !_NJL.has(p));
      out.push(_LA[n][pj ? 1 : 0]);
      i++;
      while (i + 1 < cs.length && _CMB.has(cs[i + 1].codePointAt(0) ?? 0)) {
        out.push(cs[++i]);
      }
      continue;
    }
    const pj = !!(p && _AF[p] && !_NJL.has(p));
    const nj = !_NJL.has(c) && !!(n && _AF[n]);
    out.push(f[pj && nj ? 3 : pj ? 1 : nj ? 2 : 0] || cs[i]);
  }
  return out.join('');
}

// ── Page header & footer ─────────────────────────────────────────────────────────
export const PageHeader = () => (
  <View style={S.pageHeader} fixed>
    <View style={{ flexDirection: "column" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: BRAND, letterSpacing: 0.5 }}>VitaSyr.</Text>
    </View>
  </View>
);

export const PageFooter = () => (
  <View style={S.pageFooter} fixed>
    <View style={{ alignItems: "flex-end", gap: 2 }}>
      <Text style={S.pageFooterText}>{ar("سوريا - حلب - حي حلب الجديدة شمالي")}</Text>
      <Text style={S.pageFooterText}>{ar("خلف فيلا العقاد - شارع إيكاردا")}</Text>
    </View>
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={S.pageFooterText}>www.VitaSyr-center.com</Text>
      <Text style={S.pageFooterText}>info@VitaSyr-center.com</Text>
    </View>
    <View style={{ alignItems: "flex-start", gap: 2 }}>
      <Text style={S.pageFooterText}>MOB: +963 935 813 333</Text>
      <Text style={S.pageFooterText}>TEL: +963 21 5226391  |  FAX: +963 21 5226392</Text>
    </View>
  </View>
);

// ── Building blocks ──────────────────────────────────────────────────────────────
export const SecHead = ({ label, break: brk }: { label: string; break?: boolean }) => (
  <View style={S.sectionHeader} break={brk}>
    <Text style={S.sectionHeaderText}>{ar(label)}</Text>
  </View>
);

export const SubHead = ({ label }: { label: string }) => (
  <View style={S.subHeader}>
    <Text style={S.subHeaderText}>{ar(label)}</Text>
  </View>
);

export const F = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={S.fieldRow} wrap={false}>
      <Text style={S.fieldLabel}>{ar(label)}</Text>
      <Text style={S.fieldValue}>{ar(v) || "—"}</Text>
    </View>
  );
};

export const Bool = ({ label, value }: { label: string; value: boolean | null | undefined }) => (
  <View style={S.fieldRow} wrap={false}>
    <Text style={S.fieldLabel}>{ar(label)}</Text>
    <Text style={[S.fieldValue, value ? S.yes : S.no]}>
      {value ? `✓ ${ar("نعم")}` : `✗ ${ar("لا")}`}
    </Text>
  </View>
);

const BOX = { width: 9, height: 9, borderWidth: 0.8, borderColor: BRAND, justifyContent: "center" as const, alignItems: "center" as const };
export const Chk = ({ checked, label }: { checked: boolean; label: string }) => (
  <View wrap={false} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 3 }}>
    <View style={{ ...BOX, backgroundColor: checked ? BRAND : "transparent" }}>
      {checked && <Text style={{ fontSize: 6, color: "#ffffff", lineHeight: 1 }}>{"✓"}</Text>}
    </View>
    <Text style={{ fontSize: 8.5, color: TEXT }}>{ar(label)}</Text>
  </View>
);

export type Opt = { v: string; l: string };

// Renders a list of options as a checkbox grid. `selected` may be a single code
// (single-select field) or an array of codes (multi-select).
export const OptGrid = ({
  label, options, selected, cols = 2,
}: { label?: string; options: Opt[]; selected: string | string[]; cols?: number }) => {
  const sel = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const width = cols === 3 ? "33%" : cols === 1 ? "100%" : "50%";
  return (
    <View style={{ marginBottom: 4 }} wrap={false}>
      {label && <Text style={{ fontSize: 8.5, color: TEXT, marginBottom: 3, textAlign: "right" }}>{ar(label)}</Text>}
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
        {options.map((o) => (
          <View key={o.v} style={{ width }}>
            <Chk checked={sel.includes(o.v)} label={o.l} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Card-style field: small label above, bold value below.
export const FC = ({ label, value }: { label: string; value?: string | number | null }) => {
  const v = value == null ? "" : String(value).trim();
  return (
    <View style={{ marginBottom: 6 }} wrap={false}>
      <Text style={{ fontSize: 7.5, color: TEXT, marginBottom: 2 }}>{ar(label)}</Text>
      <Text style={{ fontSize: 10, color: MUTED, fontWeight: "bold" }}>{ar(v) || "—"}</Text>
    </View>
  );
};

// Grid of FC cards (33% each) — used for the patient / case info blocks.
export const InfoGrid = ({ items }: { items: { label: string; value?: string | number | null }[] }) => (
  <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
    {items.map((f) => (
      <View
        key={f.label}
        style={{
          width: "33%",
          paddingHorizontal: 6,
          paddingVertical: 8,
          borderBottomWidth: 0.5,
          borderBottomColor: BORDER,
        }}
      >
        <FC label={f.label} value={f.value} />
      </View>
    ))}
  </View>
);

// ── Font registration + download helper ──────────────────────────────────────────
let fontsRegistered = false;
export function ensureAmiriFonts() {
  if (fontsRegistered) return;
  const origin = window.location.origin;
  Font.register({
    family: "Amiri",
    fonts: [
      { src: `${origin}/fonts/amiri-regular.ttf`, fontWeight: "normal", fontStyle: "normal" },
      { src: `${origin}/fonts/amiri-bold.ttf`,    fontWeight: "bold",   fontStyle: "normal" },
      { src: `${origin}/fonts/amiri-italic.ttf`,  fontWeight: "normal", fontStyle: "italic" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Fetch an image URL and return a data URI. Returns "" on any failure (e.g. CORS)
// so the PDF still renders without the image.
export async function toDataUri(url: string | undefined | null): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}
