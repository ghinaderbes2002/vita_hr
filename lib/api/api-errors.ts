/**
 * Reading errors the API returns, across the two envelopes it uses: the newer
 * flat `{ code, message }` body and the older `{ error: { code, message } }`.
 */

type ApiErrorBody = {
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
};
type ApiErrorLike = { response?: { data?: ApiErrorBody } };

export function apiErrorCode(error: unknown): string | undefined {
  const d = (error as ApiErrorLike)?.response?.data;
  return d?.error?.code ?? d?.code;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const d = (error as ApiErrorLike)?.response?.data;
  return d?.error?.message || d?.message || fallback;
}

/**
 * A second request of the same type from the same employee within five minutes.
 * The API answers 400, but nothing failed — the first request was saved, and
 * this is the guard against a double submit. It must never read as a generic
 * error, or the user retries something that already went through.
 */
export const DUPLICATE_REQUEST_CODE = "DUPLICATE_REQUEST";

export const isDuplicateRequestError = (error: unknown) =>
  apiErrorCode(error) === DUPLICATE_REQUEST_CODE;

/** Fallback if the API sends the code without its own message. */
export const DUPLICATE_REQUEST_FALLBACK =
  "تم تقديم طلب من نفس النوع قبل قليل — الرجاء الانتظار بضع دقائق قبل إعادة المحاولة";

/** Shown beneath the API's message so the user knows nothing was lost. */
export const DUPLICATE_REQUEST_HINT =
  "طلبك الأول وصل وتم حفظه — لا حاجة لإعادة الإرسال. تحقق من صفحة طلباتي.";
