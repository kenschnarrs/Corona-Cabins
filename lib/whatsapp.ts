// WhatsApp deep link to the property's WhatsApp number. The number lives in
// the NEXT_PUBLIC_WHATSAPP_NUMBER environment variable (digits with country
// code, country code first, no plus sign), never in source. Without it, no link is shown.

export function whatsappDigits(value: string | undefined | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function whatsappNumber(): string {
  const digits = whatsappDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

export function whatsappLink(number: string, message: string): string {
  const digits = whatsappDigits(number);
  if (digits.length < 8 || digits.length > 15) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
