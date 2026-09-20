import sanitizeHtml from "sanitize-html";

export const ALLOWED_RICH_TEXT_TAGS = ["p", "br", "strong", "em", "u", "h2", "h3", "ul", "ol", "li"];

export function sanitizeRichText(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value, {
    allowedTags: ALLOWED_RICH_TEXT_TAGS,
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  }).trim();
}

export function richTextHasContent(value: string): boolean {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\u00a0/g, " ").trim().length > 0;
}
