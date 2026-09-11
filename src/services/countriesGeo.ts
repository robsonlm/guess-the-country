import { Country } from '../types/game';

export interface GeoFeature {
  type: string;
  properties: {
    NAME?: string;
    NAME_LONG?: string;
    ADMIN?: string;
    ISO_A2?: string;
    ISO_A3?: string;
    WB_A2?: string;
    POSTAL?: string;
    ADM0_A3?: string;
    CONTINENT?: string;
    SUBREGION?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | string;
    coordinates: any[];
  };
  alpha2?: string;
  centroid?: { lat: number; lng: number };
}

let cachedFeatures: GeoFeature[] | null = null;
const alpha2ToFeatureMap = new Map<string, GeoFeature>();

// Special case mappings for Natural Earth 110m codes
const SPECIAL_CODE_MAP: Record<string, string> = {
  France: 'FR',
  Norway: 'NO',
  'N. Cyprus': 'CY',
  Somaliland: 'SO',
  Kosovo: 'XK',
  Taiwan: 'TW',
};

// Known ISO-3 to ISO-2 mapping fallback
const ISO3_TO_ISO2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', AND: 'AD', AGO: 'AO', ARG: 'AR', ARM: 'AM', AUS: 'AU',
  AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE',
  BLZ: 'BZ', BEN: 'BJ', BTN: 'BT', BOL: 'BO', BIH: 'BA', BWA: 'BW', BRA: 'BR', BRN: 'BN',
  BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH', CMR: 'CM', CAN: 'CA', CPV: 'CV', CAF: 'CF',
  TCD: 'TD', CHL: 'CL', CHN: 'CN', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', CRI: 'CR',
  CIV: 'CI', HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM',
  DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', SZ: 'SZ',
  ETH: 'ET', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE',
  GHA: 'GH', GRC: 'GR', GRD: 'GD', GTM: 'GT', GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT',
  HND: 'HN', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE',
  ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', PRK: 'KP',
  KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR',
  LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MKD: 'MK', MDG: 'MG', MWI: 'MW', MYS: 'MY',
  MDV: 'MV', MLI: 'ML', MLT: 'MT', MRT: 'MR', MUS: 'MU', MEX: 'MX', MDA: 'MD', MCO: 'MC',
  MNG: 'MN', MNE: 'ME', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NPL: 'NP', NLD: 'NL',
  NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', NOR: 'NO', OMN: 'OM', PAK: 'PK', PAN: 'PA',
  PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', POL: 'PL', PRT: 'PT', QAT: 'QA', ROU: 'RO',
  RUS: 'RU', RWA: 'RW', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL', SGP: 'SG',
  SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', SSD: 'SS', ESP: 'ES', LKA: 'LK',
  SDN: 'SD', SUR: 'SR', SWZ: 'SZ', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW', TJK: 'TJ',
  TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM',
  UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', URY: 'UY', UZB: 'UZ', VUT: 'VU',
  VEN: 'VE', VNM: 'VN', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW', KOS: 'XK',
};

// Comprehensive accurate centroid coordinates for all 197 official sovereign / UN countries
export const KNOWN_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AF: { lat: 33.9391, lng: 67.71 },
  AL: { lat: 41.1533, lng: 20.1683 },
  DZ: { lat: 28.0339, lng: 1.6596 },
  AD: { lat: 42.5063, lng: 1.5218 },
  AO: { lat: -11.2027, lng: 17.8739 },
  AG: { lat: 17.0608, lng: -61.7964 },
  AR: { lat: -38.4161, lng: -63.6167 },
  AM: { lat: 40.0691, lng: 45.0382 },
  AU: { lat: -25.2744, lng: 133.7751 },
  AT: { lat: 47.5162, lng: 14.5501 },
  AZ: { lat: 40.1431, lng: 47.5769 },
  BS: { lat: 25.0343, lng: -77.3963 },
  BH: { lat: 26.0667, lng: 50.5577 },
  BD: { lat: 23.685, lng: 90.3563 },
  BB: { lat: 13.1939, lng: -59.5432 },
  BY: { lat: 53.7098, lng: 27.9534 },
  BE: { lat: 50.5039, lng: 4.4699 },
  BZ: { lat: 17.1899, lng: -88.4976 },
  BJ: { lat: 9.3077, lng: 2.3158 },
  BT: { lat: 27.5142, lng: 90.4336 },
  BO: { lat: -16.2902, lng: -63.5887 },
  BA: { lat: 43.9159, lng: 17.6791 },
  BW: { lat: -22.3285, lng: 24.6849 },
  BR: { lat: -14.235, lng: -51.9253 },
  BN: { lat: 4.5353, lng: 114.7277 },
  BG: { lat: 42.7339, lng: 25.4858 },
  BF: { lat: 12.2383, lng: -1.5616 },
  BI: { lat: -3.3731, lng: 29.9189 },
  CV: { lat: 16.5388, lng: -23.0418 },
  KH: { lat: 12.5657, lng: 104.991 },
  CM: { lat: 7.3697, lng: 12.3547 },
  CA: { lat: 56.1304, lng: -106.3468 },
  CF: { lat: 6.6111, lng: 20.9394 },
  TD: { lat: 15.4542, lng: 18.7322 },
  CL: { lat: -35.6751, lng: -71.543 },
  CN: { lat: 35.8617, lng: 104.1954 },
  CO: { lat: 4.5709, lng: -74.2973 },
  KM: { lat: -11.875, lng: 43.8722 },
  CG: { lat: -0.228, lng: 15.8277 },
  CD: { lat: -4.0383, lng: 21.7587 },
  CR: { lat: 9.7489, lng: -83.7534 },
  CI: { lat: 7.54, lng: -5.5471 },
  HR: { lat: 45.1, lng: 15.2 },
  CU: { lat: 21.5218, lng: -77.7812 },
  CY: { lat: 35.1264, lng: 33.4299 },
  CZ: { lat: 49.8175, lng: 15.473 },
  DK: { lat: 56.2639, lng: 9.5018 },
  DJ: { lat: 11.8251, lng: 42.5903 },
  DM: { lat: 15.415, lng: -61.371 },
  DO: { lat: 18.7357, lng: -70.1627 },
  EC: { lat: -1.8312, lng: -78.1834 },
  EG: { lat: 26.8206, lng: 30.8025 },
  SV: { lat: 13.7942, lng: -88.8965 },
  GQ: { lat: 1.6508, lng: 10.2679 },
  ER: { lat: 15.1794, lng: 39.7823 },
  EE: { lat: 58.5953, lng: 25.0136 },
  SZ: { lat: -26.5225, lng: 31.4659 },
  ET: { lat: 9.145, lng: 40.4897 },
  FJ: { lat: -17.7134, lng: 178.065 },
  FI: { lat: 61.9241, lng: 25.7482 },
  FR: { lat: 46.2276, lng: 2.2137 },
  GA: { lat: -0.8037, lng: 11.6094 },
  GM: { lat: 13.4432, lng: -15.3101 },
  GE: { lat: 42.3154, lng: 43.3569 },
  DE: { lat: 51.1657, lng: 10.4515 },
  GH: { lat: 7.9465, lng: -1.0232 },
  GR: { lat: 39.0742, lng: 21.8243 },
  GD: { lat: 12.1165, lng: -61.679 },
  GT: { lat: 15.7835, lng: -90.2308 },
  GN: { lat: 9.9456, lng: -9.6966 },
  GW: { lat: 11.8037, lng: -15.1804 },
  GY: { lat: 4.8604, lng: -58.9302 },
  HT: { lat: 18.9712, lng: -72.2852 },
  HN: { lat: 15.2, lng: -86.2419 },
  HU: { lat: 47.1625, lng: 19.5033 },
  IS: { lat: 64.9631, lng: -19.0208 },
  IN: { lat: 20.5937, lng: 78.9629 },
  ID: { lat: -0.7893, lng: 113.9213 },
  IR: { lat: 32.4279, lng: 53.688 },
  IQ: { lat: 33.2232, lng: 43.6793 },
  IE: { lat: 53.1424, lng: -7.6921 },
  IL: { lat: 31.0461, lng: 34.8516 },
  IT: { lat: 41.8719, lng: 12.5674 },
  JM: { lat: 18.1096, lng: -77.2975 },
  JP: { lat: 36.2048, lng: 138.2529 },
  JO: { lat: 30.5852, lng: 36.2384 },
  KZ: { lat: 48.0196, lng: 66.9237 },
  KE: { lat: -0.0236, lng: 37.9062 },
  KI: { lat: -3.3704, lng: -168.734 },
  KP: { lat: 40.3399, lng: 127.5101 },
  KR: { lat: 35.9078, lng: 127.7669 },
  KW: { lat: 29.3117, lng: 47.4818 },
  KG: { lat: 41.2044, lng: 74.7661 },
  LA: { lat: 19.8563, lng: 102.4955 },
  LV: { lat: 56.8796, lng: 24.6032 },
  LB: { lat: 33.8547, lng: 35.8623 },
  LS: { lat: -29.6099, lng: 28.2336 },
  LR: { lat: 6.4281, lng: -9.4295 },
  LY: { lat: 26.3351, lng: 17.2283 },
  LI: { lat: 47.166, lng: 9.5554 },
  LT: { lat: 55.1694, lng: 23.8813 },
  LU: { lat: 49.8153, lng: 6.1296 },
  MG: { lat: -18.7669, lng: 46.8691 },
  MW: { lat: -13.2543, lng: 34.3015 },
  MY: { lat: 4.2105, lng: 101.9758 },
  MV: { lat: 3.2028, lng: 73.2207 },
  ML: { lat: 17.5707, lng: -3.9962 },
  MT: { lat: 35.9375, lng: 14.3754 },
  MH: { lat: 7.1315, lng: 171.1845 },
  MR: { lat: 21.0079, lng: -10.9408 },
  MU: { lat: -20.3484, lng: 57.5522 },
  MX: { lat: 23.6345, lng: -102.5528 },
  FM: { lat: 7.4256, lng: 150.5508 },
  MD: { lat: 47.4116, lng: 28.3699 },
  MC: { lat: 43.7384, lng: 7.4246 },
  MN: { lat: 46.8625, lng: 103.8467 },
  ME: { lat: 42.7087, lng: 19.3744 },
  MA: { lat: 31.7917, lng: -7.0926 },
  MZ: { lat: -18.6657, lng: 35.5296 },
  MM: { lat: 21.9162, lng: 95.956 },
  NA: { lat: -22.9576, lng: 18.4904 },
  NR: { lat: -0.5228, lng: 166.9315 },
  NP: { lat: 28.3949, lng: 84.124 },
  NL: { lat: 52.1326, lng: 5.2913 },
  NZ: { lat: -40.9006, lng: 174.886 },
  NI: { lat: 12.8654, lng: -85.2072 },
  NE: { lat: 17.6078, lng: 8.0817 },
  NG: { lat: 9.082, lng: 8.6753 },
  MK: { lat: 41.6086, lng: 21.7453 },
  NO: { lat: 60.472, lng: 8.4689 },
  OM: { lat: 21.5126, lng: 55.9233 },
  PK: { lat: 30.3753, lng: 69.3451 },
  PW: { lat: 7.515, lng: 134.5825 },
  PS: { lat: 31.9522, lng: 35.2332 },
  PA: { lat: 8.5379, lng: -80.7821 },
  PG: { lat: -6.315, lng: 143.9555 },
  PY: { lat: -23.4425, lng: -58.4438 },
  PE: { lat: -9.19, lng: -75.0152 },
  PH: { lat: 12.8797, lng: 121.774 },
  PL: { lat: 51.9194, lng: 19.1451 },
  PT: { lat: 39.3999, lng: -8.2245 },
  QA: { lat: 25.3548, lng: 51.1839 },
  RO: { lat: 45.9432, lng: 24.9668 },
  RU: { lat: 61.524, lng: 105.3188 },
  RW: { lat: -1.9403, lng: 29.8739 },
  KN: { lat: 17.3578, lng: -62.783 },
  LC: { lat: 13.9094, lng: -60.9789 },
  VC: { lat: 13.2528, lng: -61.1971 },
  WS: { lat: -13.759, lng: -172.1047 },
  SM: { lat: 43.9424, lng: 12.4578 },
  ST: { lat: 0.1864, lng: 6.6131 },
  SA: { lat: 23.8859, lng: 45.0792 },
  SN: { lat: 14.4974, lng: -14.4524 },
  RS: { lat: 44.0165, lng: 21.0059 },
  SC: { lat: -4.6796, lng: 55.492 },
  SL: { lat: 8.4606, lng: -11.7799 },
  SG: { lat: 1.3521, lng: 103.8198 },
  SK: { lat: 48.669, lng: 19.699 },
  SI: { lat: 46.1512, lng: 14.9955 },
  SB: { lat: -9.6457, lng: 160.1562 },
  SO: { lat: 5.1521, lng: 46.1996 },
  ZA: { lat: -30.5595, lng: 22.9375 },
  SS: { lat: 6.877, lng: 31.307 },
  ES: { lat: 40.4637, lng: -3.7492 },
  LK: { lat: 7.8731, lng: 80.7718 },
  SD: { lat: 12.8628, lng: 30.2176 },
  SR: { lat: 3.9193, lng: -56.0278 },
  SE: { lat: 60.1282, lng: 18.6435 },
  CH: { lat: 46.8182, lng: 8.2275 },
  SY: { lat: 34.8021, lng: 38.9968 },
  TJ: { lat: 38.861, lng: 71.2761 },
  TZ: { lat: -6.369, lng: 34.8888 },
  TH: { lat: 15.87, lng: 100.9925 },
  TL: { lat: -8.8742, lng: 125.7275 },
  TG: { lat: 8.6195, lng: 0.8248 },
  TO: { lat: -21.179, lng: -175.1982 },
  TT: { lat: 10.6918, lng: -61.2225 },
  TN: { lat: 33.8869, lng: 9.5375 },
  TR: { lat: 38.9637, lng: 35.2433 },
  TM: { lat: 38.9697, lng: 59.5563 },
  TV: { lat: -7.1095, lng: 177.6493 },
  UG: { lat: 1.3733, lng: 32.2903 },
  UA: { lat: 48.3794, lng: 31.1656 },
  AE: { lat: 23.4241, lng: 53.8478 },
  GB: { lat: 55.3781, lng: -3.436 },
  US: { lat: 37.0902, lng: -95.7129 },
  UY: { lat: -32.5228, lng: -55.7658 },
  UZ: { lat: 41.3775, lng: 64.5853 },
  VU: { lat: -15.3767, lng: 166.9592 },
  VA: { lat: 41.9029, lng: 12.4534 },
  VE: { lat: 6.4238, lng: -66.5897 },
  VN: { lat: 14.0583, lng: 108.2772 },
  YE: { lat: 15.5527, lng: 48.5164 },
  ZM: { lat: -13.1339, lng: 27.8493 },
  ZW: { lat: -19.0154, lng: 29.1549 },
  TW: { lat: 23.6978, lng: 120.9605 },
  XK: { lat: 42.6026, lng: 20.903 },
};

function computePolygonCentroid(geometry: any): { lat: number; lng: number } {
  let totalLng = 0;
  let totalLat = 0;
  let pointCount = 0;

  const traverse = (coords: any[]) => {
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      totalLng += coords[0];
      totalLat += coords[1];
      pointCount++;
    } else if (Array.isArray(coords)) {
      for (const item of coords) {
        traverse(item);
      }
    }
  };

  traverse(geometry.coordinates);

  if (pointCount > 0) {
    return { lat: totalLat / pointCount, lng: totalLng / pointCount };
  }
  return { lat: 0, lng: 0 };
}

export function resolveFeatureAlpha2(props: GeoFeature['properties']): string {
  const name = props.NAME || props.ADMIN || '';
  if (SPECIAL_CODE_MAP[name]) {
    return SPECIAL_CODE_MAP[name];
  }

  if (props.ISO_A2 && props.ISO_A2 !== '-99' && props.ISO_A2.length === 2) {
    return props.ISO_A2.toUpperCase();
  }

  if (props.ISO_A2_EH && props.ISO_A2_EH !== '-99' && props.ISO_A2_EH.length === 2) {
    return props.ISO_A2_EH.toUpperCase();
  }

  if (props.WB_A2 && props.WB_A2 !== '-99' && props.WB_A2.length === 2) {
    return props.WB_A2.toUpperCase();
  }

  const iso3 = props.ISO_A3 || props.ADM0_A3 || '';
  if (iso3 && ISO3_TO_ISO2[iso3]) {
    return ISO3_TO_ISO2[iso3];
  }

  if (props.POSTAL && props.POSTAL.length === 2 && props.POSTAL !== '-99') {
    return props.POSTAL.toUpperCase();
  }

  return '';
}

export async function loadGeoFeatures(): Promise<GeoFeature[]> {
  if (cachedFeatures && cachedFeatures.length > 0) {
    return cachedFeatures;
  }

  let geojson: any = null;

  try {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    // High-definition 50m Natural Earth dataset includes detailed polygons for small island nations and micro-states
    const res = await fetch(`${cleanBase}ne_50m_admin_0_countries.geojson`);
    if (res.ok) {
      geojson = await res.json();
    }
  } catch (err) {
    console.warn('Local 50m geojson fetch failed, trying fallbacks:', err);
  }

  if (!geojson) {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const cleanBase = base.endsWith('/') ? base : `${base}/`;
      const res = await fetch(`${cleanBase}ne_110m_admin_0_countries.geojson`);
      if (res.ok) {
        geojson = await res.json();
      }
    } catch {
      // ignore
    }
  }

  if (!geojson) {
    try {
      const res = await fetch(
        'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
      );
      if (res.ok) {
        geojson = await res.json();
      }
    } catch (err) {
      console.error('Remote 50m geojson fetch also failed:', err);
    }
  }

  if (!geojson || !Array.isArray(geojson.features)) {
    return [];
  }

  alpha2ToFeatureMap.clear();

  const features: GeoFeature[] = geojson.features.map((f: any) => {
    const alpha2 = resolveFeatureAlpha2(f.properties);
    const centroid = KNOWN_CENTROIDS[alpha2] || computePolygonCentroid(f.geometry);
    const feature: GeoFeature = {
      ...f,
      alpha2,
      centroid,
    };
    if (alpha2) {
      const existing = alpha2ToFeatureMap.get(alpha2);
      // Prioritize sovereign / country features over overseas dependency fragments (e.g. Australia over Indian Ocean Ter.)
      if (!existing || f.properties?.TYPE === 'Sovereign country' || f.properties?.TYPE === 'Country') {
        alpha2ToFeatureMap.set(alpha2, feature);
      }
    }
    return feature;
  });

  // Guarantee that every single one of the 197 sovereign / UN countries has a valid polygon
  for (const [alpha2, coords] of Object.entries(KNOWN_CENTROIDS)) {
    if (!alpha2ToFeatureMap.has(alpha2)) {
      const circleCoords: [number, number][] = [];
      const radiusDeg = 0.55;
      const segments = 14;
      for (let i = 0; i <= segments; i++) {
        const angle = (i * 2 * Math.PI) / segments;
        const dLat = radiusDeg * Math.cos(angle);
        const dLng =
          (radiusDeg * Math.sin(angle)) / Math.max(0.2, Math.cos((coords.lat * Math.PI) / 180));
        circleCoords.push([coords.lng + dLng, coords.lat + dLat]);
      }

      const microFeature: GeoFeature = {
        type: 'Feature',
        properties: {
          NAME: alpha2,
          ISO_A2: alpha2,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circleCoords],
        },
        alpha2,
        centroid: coords,
      };

      features.push(microFeature);
      alpha2ToFeatureMap.set(alpha2, microFeature);
    }
  }

  cachedFeatures = features;
  return features;
}

export function getCountryCoordinates(alpha2: string): { lat: number; lng: number } {
  const upper = alpha2.toUpperCase();
  if (KNOWN_CENTROIDS[upper]) {
    return KNOWN_CENTROIDS[upper];
  }
  const feature = alpha2ToFeatureMap.get(upper);
  if (feature && feature.centroid) {
    return feature.centroid;
  }
  return { lat: 20, lng: 0 };
}

/**
 * Calculates optimal globe camera altitude dynamically so the target country
 * fills at least ~30% - 40% of the viewport, making islands and micro-states
 * comfortably visible without disorienting extreme zooms.
 */
export function getCountryTargetAltitude(alpha2: string): number {
  const upper = alpha2.toUpperCase();
  const feature = alpha2ToFeatureMap.get(upper);

  if (!feature || !feature.geometry) {
    return 0.45;
  }

  const geom = feature.geometry;
  let rings: any[] = [];
  if (geom.type === 'Polygon') {
    rings = [geom.coordinates];
  } else if (geom.type === 'MultiPolygon') {
    rings = geom.coordinates;
  }

  let maxSpan = 0;
  let maxArea = 0;

  for (const poly of rings) {
    const exterior = poly[0];
    if (!exterior || !Array.isArray(exterior)) continue;

    let minLng = 180;
    let maxLng = -180;
    let minLat = 90;
    let maxLat = -90;

    for (const pt of exterior) {
      if (typeof pt[0] === 'number' && typeof pt[1] === 'number') {
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
    }

    const dLat = Math.max(0, maxLat - minLat);
    const dLng = Math.max(0, maxLng - minLng);
    const approxArea = dLat * dLng;

    if (approxArea > maxArea) {
      maxArea = approxArea;
      maxSpan = Math.max(dLat, dLng);
    }
  }

  if (maxSpan <= 0) {
    maxSpan = 0.5;
  }

  // Altitude scaling:
  // Micro / island nations (Vatican, Monaco, Nauru, Tuvalu, Malta, Singapore, etc.):
  // altitude: 0.14 - 0.22 brings the camera in close so islands fill a solid ~30% of screen.
  // Small countries (Mauritius, Jamaica, Lebanon): ~0.35 - 0.55
  // Medium countries (Portugal, UK, Germany, Japan): ~0.75 - 1.10
  // Continental giants (Brazil, USA, Russia, Canada): ~1.50 - 1.85
  if (maxSpan <= 0.12) return 0.14;
  if (maxSpan <= 0.45) return 0.22;
  if (maxSpan <= 1.2) return 0.36;
  if (maxSpan <= 3.5) return 0.55;
  if (maxSpan <= 8.0) return 0.80;
  if (maxSpan <= 16.0) return 1.15;
  if (maxSpan <= 28.0) return 1.45;
  return 1.85;
}

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Returns neighbouring/closest regional countries to targetCountry
 * to generate challenging and geographically authentic distractor options.
 */
export function getNeighboringCountries(
  targetCountry: Country,
  allCountries: Country[],
  count = 2
): Country[] {
  const targetCoords = getCountryCoordinates(targetCountry.alpha2);
  const candidates = allCountries.filter(
    (c) => c.alpha2.toUpperCase() !== targetCountry.alpha2.toUpperCase()
  );

  if (candidates.length <= count) {
    return candidates;
  }

  const scored = candidates.map((c) => {
    const coords = getCountryCoordinates(c.alpha2);
    const dist = calculateDistanceKm(
      targetCoords.lat,
      targetCoords.lng,
      coords.lat,
      coords.lng
    );

    let rankScore = dist;
    if (c.subregion && targetCountry.subregion && c.subregion === targetCountry.subregion) {
      rankScore = dist * 0.65; // Same subregion bonus
    } else if (c.region === targetCountry.region) {
      rankScore = dist * 1.0; // Same continent
    } else {
      rankScore = dist * 2.5; // Other continent penalty
    }

    return { country: c, dist, rankScore };
  });

  // Sort by geographic closeness & subregion priority
  scored.sort((a, b) => a.rankScore - b.rankScore);

  // Take a diverse pool of top closest neighbours (e.g. top 6) and pick 'count' random neighbours
  const topPoolSize = Math.min(scored.length, Math.max(count + 4, 6));
  const topNeighbors = scored.slice(0, topPoolSize).map((s) => s.country);

  const shuffled = [...topNeighbors].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
