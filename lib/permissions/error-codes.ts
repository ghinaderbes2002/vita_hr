/**
 * Error codes موحدة — مطابقة لما يصدره الباك فعلياً (branch feature/permissions-upgrade)
 *
 * ملاحظة: AUTH_TOKEN_EXPIRED, AUTH_PERMISSIONS_CHANGED, AUTH_OUT_OF_SCOPE
 * — غير مدعومة من الباك حالياً، فلا تضاف هنا.
 */
export const AUTH_ERROR_CODES = {
  TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  TOKEN_REVOKED: "AUTH_TOKEN_REVOKED",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS",
  ACCOUNT_INACTIVE: "AUTH_ACCOUNT_INACTIVE",
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
