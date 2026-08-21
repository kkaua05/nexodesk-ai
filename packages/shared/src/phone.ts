import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface NormalizedPhone {
  /** E.164 — the canonical form used for dedup lookups (e.g. "+5551999999999") */
  normalized: string;
  /** as originally provided/received */
  raw: string;
  countryCode: string | undefined;
  callingCode: string | undefined;
  isValid: boolean;
}

/**
 * Normalizes any phone representation (WhatsApp JID, dialed number, pasted number)
 * into E.164. Defaults to BR since the target user base is Brazilian, but any
 * country code present in the raw value takes precedence.
 */
export function normalizePhone(raw: string, defaultCountry: "BR" = "BR"): NormalizedPhone {
  const cleaned = raw.replace(/@c\.us$/, "").replace(/@s\.whatsapp\.net$/, "").trim();

  const phone = parsePhoneNumberFromString(cleaned, defaultCountry);

  if (!phone) {
    const digitsOnly = cleaned.replace(/\D/g, "");
    return {
      normalized: digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`,
      raw,
      countryCode: undefined,
      callingCode: undefined,
      isValid: false,
    };
  }

  return {
    normalized: phone.number,
    raw,
    countryCode: phone.country,
    callingCode: phone.countryCallingCode,
    isValid: phone.isValid(),
  };
}

export function whatsappJidToPhone(jid: string): string {
  return jid.split("@")[0] ?? jid;
}
