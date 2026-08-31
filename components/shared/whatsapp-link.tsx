"use client";

// lucide-react ships no brand icons, so the WhatsApp glyph is inlined.
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.943c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.93 11.93 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.945a11.87 11.87 0 00-3.480-8.408" />
    </svg>
  );
}

/** Numbers are written locally as 09xxxxxxxx, so the default is Syria's code. */
const DEFAULT_COUNTRY = "963";

/** wa.me takes digits only, in full international form — no +, spaces or dashes. */
export const whatsAppNumber = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith(DEFAULT_COUNTRY)) return digits;
  return DEFAULT_COUNTRY + digits.replace(/^0+/, "");
};

/**
 * The number as written, opening a WhatsApp chat when tapped. Falls back to
 * plain text when there are no digits to dial.
 */
export function WhatsAppLink({ phone, className }: { phone: string; className?: string }) {
  const number = whatsAppNumber(phone);
  if (!number) return <span dir="ltr">{phone}</span>;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      title="فتح محادثة واتساب"
      className={`inline-flex items-center gap-1.5 hover:underline ${className ?? ""}`}
    >
      <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366]" />
      {phone}
    </a>
  );
}
