// Resolves the source graph images extracted from the 02-2026 exam PDF to
// their bundled URLs so the question bank can render the original figures
// instead of the hand-drawn SVG approximations.

import p03 from "@/data/2026_2/images/02-2026-p_03.png";
import p05 from "@/data/2026_2/images/02-2026-p_05.png";
import p09 from "@/data/2026_2/images/02-2026-p_09.png";
import p12 from "@/data/2026_2/images/02-2026-p_12.png";
import p13 from "@/data/2026_2/images/02-2026-p_13.png";
import p19 from "@/data/2026_2/images/02-2026-p_19.png";
import p20 from "@/data/2026_2/images/02-2026-p_20.png";
import p2627 from "@/data/2026_2/images/02-2026-p_26-27.png";
import p29 from "@/data/2026_2/images/02-2026-p_29.png";
import p36 from "@/data/2026_2/images/02-2026-p_36.png";
import p39 from "@/data/2026_2/images/02-2026-p_39.png";
import p51 from "@/data/2026_2/images/02-2026-p_51.png";
import p5556 from "@/data/2026_2/images/02-2026-p_55-56.png";
import p5758 from "@/data/2026_2/images/02-2026-p_57-58.png";
import p212223 from "@/data/2026_2/images/02-2026_p-21-22-23.png";

import r06a from "@/data/2026_2/images/02-2026-r_06-a.png";
import r06b from "@/data/2026_2/images/02-2026-r_06-b.png";
import r06c from "@/data/2026_2/images/02-2026-r_06-c.png";
import r06d from "@/data/2026_2/images/02-2026-r_06-d.png";
import r24a from "@/data/2026_2/images/02-2026-r_24-a.png";
import r24b from "@/data/2026_2/images/02-2026-r_24-b.png";
import r24c from "@/data/2026_2/images/02-2026-r_24-c.png";
import r24d from "@/data/2026_2/images/02-2026-r_24-d.png";
import ra from "@/data/2026_2/images/02-2026-r_a.png";
import rb from "@/data/2026_2/images/02-2026-r_b.png";
import rc from "@/data/2026_2/images/02-2026-r_c.png";
import rd from "@/data/2026_2/images/02-2026-r_d.png";

/** Maps a source-image file name (as stored in `questions.json`) to its URL. */
export const SOURCE_IMAGES: Record<string, string> = {
  "02-2026-p_03.png": p03.src,
  "02-2026-p_05.png": p05.src,
  "02-2026-p_09.png": p09.src,
  "02-2026-p_12.png": p12.src,
  "02-2026-p_13.png": p13.src,
  "02-2026-p_19.png": p19.src,
  "02-2026-p_20.png": p20.src,
  "02-2026-p_26-27.png": p2627.src,
  "02-2026-p_29.png": p29.src,
  "02-2026-p_36.png": p36.src,
  "02-2026-p_39.png": p39.src,
  "02-2026-p_51.png": p51.src,
  "02-2026-p_55-56.png": p5556.src,
  "02-2026-p_57-58.png": p5758.src,
  "02-2026_p-21-22-23.png": p212223.src,

  "02-2026-r_06-a.png": r06a.src,
  "02-2026-r_06-b.png": r06b.src,
  "02-2026-r_06-c.png": r06c.src,
  "02-2026-r_06-d.png": r06d.src,
  "02-2026-r_24-a.png": r24a.src,
  "02-2026-r_24-b.png": r24b.src,
  "02-2026-r_24-c.png": r24c.src,
  "02-2026-r_24-d.png": r24d.src,
  "02-2026-r_a.png": ra.src,
  "02-2026-r_b.png": rb.src,
  "02-2026-r_c.png": rc.src,
  "02-2026-r_d.png": rd.src,
};

/** Resolves a source-image file name to its URL, or undefined when unknown. */
export function resolveSourceImage(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return SOURCE_IMAGES[name];
}
