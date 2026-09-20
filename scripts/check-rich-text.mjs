import assert from "node:assert/strict";
import sanitizeHtml from "sanitize-html";
const clean = (value) => sanitizeHtml(value, { allowedTags: ["p","br","strong","em","u","h2","h3","ul","ol","li"], allowedAttributes: {}, disallowedTagsMode: "discard", enforceHtmlBoundary: true }).trim();
assert.equal(clean('<h2 onclick="x">Hello <strong>world</strong></h2><script>alert(1)</script><img src=x onerror=x>'), '<h2>Hello <strong>world</strong></h2>');
assert.equal(clean('<p><u>Safe</u> <em>formatting</em></p>'), '<p><u>Safe</u> <em>formatting</em></p>');
console.log("rich-text sanitizer check passed");
