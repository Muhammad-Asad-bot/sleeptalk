/**
 * Garment measurements from SleepTalk_Factory_Size_Chart_6Y_to_5XL.pdf (adult S–XL).
 * Finished garment laid flat; widths marked ½ are half-circumference (double for the full
 * measurement). Each cell is "cm/in" exactly as in the factory chart — inches are not recomputed.
 */

export type Fit = "standard" | "oversized";
export type GarmentId = "hoodie" | "crewneck" | "tshirt" | "trackJacket" | "sweatpants";

export const CHART_SIZES = ["S", "M", "L", "XL"] as const;

export const FITS: { id: Fit; label: string; description: string }[] = [
  { id: "standard", label: "Standard fit", description: "Relaxed everyday fit. Take your usual size." },
  { id: "oversized", label: "Oversized fit", description: "Wider body, dropped shoulder and extra length for a roomier streetwear look." },
];

const TOP_COLUMNS = ["Chest width (½)", "Body length", "Shoulder", "Sleeve length"];

type Garment = {
  label: string;
  columns: string[];
  note?: string;
  /** rows[fit][size] = one "cm/in" cell per column */
  rows: Record<Fit, Record<(typeof CHART_SIZES)[number], string[]>>;
};

export const GARMENTS: Record<GarmentId, Garment> = {
  hoodie: {
    label: "Hoodie",
    columns: TOP_COLUMNS,
    note: "Sleeve length is measured from the shoulder seam to the cuff.",
    rows: {
      standard: {
        S: ["54/21.3", "71/28.0", "47/18.5", "61/24.0"],
        M: ["57/22.4", "74/29.1", "49/19.3", "62/24.4"],
        L: ["60/23.6", "77/30.3", "51/20.1", "63/24.8"],
        XL: ["63/24.8", "80/31.5", "53/20.9", "64/25.2"],
      },
      oversized: {
        S: ["60/23.6", "73/28.7", "53/20.9", "62/24.4"],
        M: ["63/24.8", "76/29.9", "55/21.7", "63/24.8"],
        L: ["66/26.0", "79/31.1", "57/22.4", "64/25.2"],
        XL: ["69/27.2", "82/32.3", "59/23.2", "65/25.6"],
      },
    },
  },
  crewneck: {
    label: "Crewneck",
    columns: TOP_COLUMNS,
    rows: {
      standard: {
        S: ["53/20.9", "70/27.6", "46/18.1", "60/23.6"],
        M: ["56/22.0", "73/28.7", "48/18.9", "61/24.0"],
        L: ["59/23.2", "76/29.9", "50/19.7", "62/24.4"],
        XL: ["62/24.4", "79/31.1", "52/20.5", "63/24.8"],
      },
      oversized: {
        S: ["59/23.2", "72/28.3", "52/20.5", "61/24.0"],
        M: ["62/24.4", "75/29.5", "54/21.3", "62/24.4"],
        L: ["65/25.6", "78/30.7", "56/22.0", "63/24.8"],
        XL: ["68/26.8", "81/31.9", "58/22.8", "64/25.2"],
      },
    },
  },
  tshirt: {
    label: "T-shirt",
    columns: TOP_COLUMNS,
    note: "Sleeve length is measured from the shoulder seam to the sleeve opening.",
    rows: {
      standard: {
        S: ["51/20.1", "69/27.2", "45/17.7", "21/8.3"],
        M: ["54/21.3", "72/28.3", "47/18.5", "22/8.7"],
        L: ["57/22.4", "75/29.5", "49/19.3", "23/9.1"],
        XL: ["60/23.6", "78/30.7", "51/20.1", "24/9.4"],
      },
      oversized: {
        S: ["57/22.4", "71/28.0", "50/19.7", "23/9.1"],
        M: ["60/23.6", "74/29.1", "52/20.5", "24/9.4"],
        L: ["63/24.8", "77/30.3", "54/21.3", "25/9.8"],
        XL: ["66/26.0", "80/31.5", "56/22.0", "26/10.2"],
      },
    },
  },
  trackJacket: {
    label: "Track jacket",
    columns: TOP_COLUMNS,
    note: "Tracksuits: the jacket and pants come in the same size and fit.",
    rows: {
      standard: {
        S: ["53/20.9", "70/27.6", "46/18.1", "61/24.0"],
        M: ["56/22.0", "73/28.7", "48/18.9", "62/24.4"],
        L: ["59/23.2", "76/29.9", "50/19.7", "63/24.8"],
        XL: ["62/24.4", "79/31.1", "52/20.5", "64/25.2"],
      },
      oversized: {
        S: ["58/22.8", "72/28.3", "51/20.1", "62/24.4"],
        M: ["61/24.0", "75/29.5", "53/20.9", "63/24.8"],
        L: ["64/25.2", "78/30.7", "55/21.7", "64/25.2"],
        XL: ["67/26.4", "81/31.9", "57/22.4", "65/25.6"],
      },
    },
  },
  sweatpants: {
    label: "Sweatpants",
    columns: ["Waist (½, relaxed)", "Hip (½)", "Outseam", "Inseam", "Thigh (½)", "Leg opening (½)"],
    note: "Elastic waist with drawcord; waist is measured relaxed, not stretched.",
    rows: {
      standard: {
        S: ["35/13.8", "53/20.9", "102/40.2", "75/29.5", "31/12.2", "14/5.7"],
        M: ["37/14.6", "56/22.0", "104/40.9", "76/29.9", "32/12.6", "15/5.9"],
        L: ["39/15.4", "59/23.2", "106/41.7", "77/30.3", "33/13.0", "16/6.1"],
        XL: ["41/16.1", "62/24.4", "108/42.5", "78/30.7", "34/13.4", "16/6.3"],
      },
      oversized: {
        S: ["35/13.8", "57/22.4", "104/40.9", "76/29.9", "34/13.4", "16/6.5"],
        M: ["37/14.6", "60/23.6", "106/41.7", "77/30.3", "35/13.8", "17/6.7"],
        L: ["39/15.4", "63/24.8", "108/42.5", "78/30.7", "36/14.2", "18/6.9"],
        XL: ["41/16.1", "66/26.0", "110/43.3", "79/31.1", "37/14.6", "18/7.1"],
      },
    },
  },
};

export const GARMENT_ORDER: GarmentId[] = ["hoodie", "crewneck", "tshirt", "trackJacket", "sweatpants"];

/** Which chart a product's size guide opens on, from its category. */
export function garmentForCategory(categorySlug: string | null | undefined): GarmentId {
  switch (categorySlug) {
    case "t-shirts":
      return "tshirt";
    case "jackets":
    case "tracksuits":
      return "trackJacket";
    case "pants":
      return "sweatpants";
    default:
      return "hoodie";
  }
}
