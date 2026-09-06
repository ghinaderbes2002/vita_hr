// Click-to-chat helpers for the clinic's appointment confirmations.
//
// A wa.me link can only choose the *recipient* — the message is sent from
// whichever WhatsApp account is signed in on the device that opens the link.
// This is the clinic's number, shown next to the button so whoever books can
// check they are signed in as it before sending.
export const CLINIC_WHATSAPP_NUMBER = "00963935813333";

// Local numbers are stored as 09xxxxxxxx; wa.me needs them in international
// form with no plus sign or leading zeros.
const DEFAULT_COUNTRY_CODE = "963";

/**
 * Normalises a stored phone number to the digits-only international form wa.me
 * expects, or null when there is nothing usable to dial.
 */
export function toWhatsappNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  } else if (digits.length === 9 && digits.startsWith("9")) {
    // A local mobile typed without its leading zero.
    digits = DEFAULT_COUNTRY_CODE + digits;
  }

  return digits.length >= 10 ? digits : null;
}

/** The confirmation text the clinic sends when a booking is made. */
export function appointmentConfirmationMessage(opts: {
  patientName: string;
  date: string;
  time: string;
}): string {
  return `السيد/السيدة ${opts.patientName}،

نؤكد لكم تأكيد حجز موعدكم لدى مركزنا، المحدد يوم ${opts.date} الساعة ${opts.time}.

نُود التنويه على أن الالتزام بالموعد المحدد أمر أساسي لتنظيم جدول العمل، وأي تخلف عنه دون سابق إنذار يُلحق ضرراً وتأخيراً مباشراً بمواعيد العملاء الآخرين وهاذ يؤثر على مهنيتنا. وعليه، في حال تعذر الحضور لأي ظرف يرجى تقديم التواصل معنا وابلاغنا قبل يوم الموعد، ليتسنى لنا إعادة جدولة مواعيدنا. ونوضح أنه في حال عدم الاعتذار عن الموعد قبل مدة كافية أو التخلف عن الموعد لأكثر من مرة، سيقوم النظام الالي للشركة بإدراج اسمكم على اللائحة السوداء بشكل تلقائي، وبالتالي لن يُسمح لكم بالاستفادة من خدماتنا مجدداً.

شاكرين تفهمكم وتعاونكم...`;
}

/** wa.me link for the given recipient and message, or null without a number. */
export function whatsappChatUrl(phone: string | null | undefined, message: string): string | null {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
