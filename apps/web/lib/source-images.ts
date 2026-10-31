// Source graphs are served from the static `public` directory and referenced by
// a stable, convention-based URL, so adding a new exam never requires code
// changes: drop the images under `public/images/<exam>/` (and optional
// dark-mode variants under `public/images/<exam>/dark/`) and point the exam's
// `questions.json` at that base with the `image_base` field.
//
// Layout convention:
//   light: {image_base}/{file}
//   dark:  {image_base}/dark/{file}   (falls back to light at render time)

export type SourceImageVariant = "light" | "dark";

/**
 * Builds the public URL for a source image from the exam's image base and the
 * file name stored in `questions.json`.
 */
export function sourceImageUrl(
  imageBase: string,
  name: string | null | undefined,
  variant: SourceImageVariant = "light",
): string | undefined {
  if (!name) return undefined;
  const base = imageBase.replace(/\/+$/, "");
  return variant === "dark" ? `${base}/dark/${name}` : `${base}/${name}`;
}
