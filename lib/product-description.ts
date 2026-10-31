import "server-only";
import sanitizeHtml from "sanitize-html";

export function sanitizeProductDescription(description: string | null): string | null {
  if (!description) {
    return null;
  }

  return sanitizeHtml(description, {
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
