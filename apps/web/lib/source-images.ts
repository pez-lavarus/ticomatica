// Source graphs are served from the static `public` directory and referenced by
// a stable, convention-based URL, so adding a new exam never requires code
// changes.
//
// Layout convention:
//   raster (PNG fallback):  {image_base}/{file}
//   vector (SVG preferred): {svg_base}/{file with .svg extension}
//
// SVGs are preferred and rendered inline so their `currentColor` strokes adapt
// to the theme (white in dark mode, dark grey in light mode). When an SVG is
// missing, the raster image is used as the fallback.

/**
 * Builds the public URL for a raster (PNG) source image from the exam's image
 * base and the file name stored in `questions.json`.
 */
export function sourceImageUrl(
  imageBase: string,
  name: string | null | undefined,
): string | undefined {
  if (!name) return undefined;
  return `${imageBase.replace(/\/+$/, "")}/${name}`;
}

/**
 * Builds the public URL for a vector (SVG) source image. The SVG uses the same
 * base name as the raster file but with a `.svg` extension.
 */
export function sourceSvgUrl(
  svgBase: string,
  name: string | null | undefined,
): string | undefined {
  if (!name) return undefined;
  const svgName = name.replace(/\.png$/i, ".svg");
  return `${svgBase.replace(/\/+$/, "")}/${svgName}`;
}
