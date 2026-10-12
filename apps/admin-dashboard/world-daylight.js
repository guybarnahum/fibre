import { WORLD_MAP_BOUNDS } from "./world-map-data.js";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 86_400_000;

export function solarPositionAt(at) {
  const ms = new Date(at).getTime();
  if (!Number.isFinite(ms)) throw new TypeError("Daylight requires a valid instant");
  const days = ms / DAY_MS + 2440587.5 - 2451545;
  const anomaly = (357.528 + 0.9856003 * days) * RAD;
  const ecliptic = (280.46 + 0.9856474 * days
    + 1.915 * Math.sin(anomaly) + 0.020 * Math.sin(2 * anomaly)) * RAD;
  const tilt = (23.439 - 0.0000004 * days) * RAD;
  const declination = Math.asin(Math.sin(tilt) * Math.sin(ecliptic));
  const rightAscension = Math.atan2(Math.cos(tilt) * Math.sin(ecliptic), Math.cos(ecliptic)) * DEG;
  const sidereal = 280.46061837 + 360.98564736629 * days;
  const longitude = ((rightAscension - sidereal + 180) % 360 + 360) % 360 - 180;
  return { declination, longitude };
}

export function sunIsUpAt(latitude, longitude, at) {
  const sun = solarPositionAt(at);
  const latitudeRad = latitude * RAD;
  const hourAngle = (longitude - sun.longitude) * RAD;
  return Math.sin(latitudeRad) * Math.sin(sun.declination)
    + Math.cos(latitudeRad) * Math.cos(sun.declination) * Math.cos(hourAngle) >= 0;
}

// Solar longitude is periodic; keep 15-minute movement continuous across ±180°.
export function solarDriftPixels(at, minutes = 15) {
  const start = solarPositionAt(at).longitude;
  const end = solarPositionAt(new Date(new Date(at).getTime() + minutes * 60_000)).longitude;
  const delta = ((end - start + 540) % 360) - 180;
  return (delta / 360) * WORLD_MAP_BOUNDS.width;
}

// One fill path made from latitude scanlines, including the polar day/night
// bands and antimeridian wrap. This is a visual solar estimate, never Thread state.
export function worldNightPath(at) {
  const sun = solarPositionAt(at);
  const { width, height, minLat, maxLat } = WORLD_MAP_BOUNDS;
  const rowDegrees = 0.5; // Smaller latitude steps keep the curved terminator smooth.
  const rows = Math.ceil((maxLat - minLat) / rowDegrees);
  const middleX = ((sun.longitude + 180) / 360) * width;
  const path = [];
  const rectangle = (x0, x1, y0, y1) => {
    if (x1 - x0 > 0.001) path.push(
      `M${x0.toFixed(2)} ${y0.toFixed(2)}H${x1.toFixed(2)}V${y1.toFixed(2)}H${x0.toFixed(2)}Z`,
    );
  };
  for (let row = 0; row < rows; row++) {
    const upper = maxLat - row * rowDegrees;
    const lower = Math.max(minLat, upper - rowDegrees);
    const latitude = ((upper + lower) / 2) * RAD;
    const y0 = ((maxLat - upper) / (maxLat - minLat)) * height;
    const y1 = ((maxLat - lower) / (maxLat - minLat)) * height;
    const horizonCos = -Math.tan(latitude) * Math.tan(sun.declination);
    if (horizonCos <= -1) continue; // Polar daylight.
    if (horizonCos >= 1) {
      rectangle(0, width, y0, y1); // Polar darkness.
      continue;
    }
    const halfDayWidth = (Math.acos(horizonCos) / (2 * Math.PI)) * width;
    const daylight = [-1, 0, 1].map((wrap) => ([
      Math.max(0, middleX - halfDayWidth + wrap * width),
      Math.min(width, middleX + halfDayWidth + wrap * width),
    ])).filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
    let edge = 0;
    for (const [start, end] of daylight) {
      rectangle(edge, start, y0, y1);
      edge = Math.max(edge, end);
    }
    rectangle(edge, width, y0, y1);
  }
  return path.join("");
}
