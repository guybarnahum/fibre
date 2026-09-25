import { sha256 } from "./genesis-development-contracts.mjs";

const LONG_TAIL_SHARE = 0.34;
const LOCALITY_POPULATION_EXPONENT = 0.6;

const BIRTHPLACE_COORDINATES = Object.freeze({
  "India/Mumbai":Object.freeze({ lat:19.07283, long:72.88261 }),
  "Pakistan/Lahore":Object.freeze({ lat:31.558, long:74.35071 }),
  "Bangladesh/Dhaka":Object.freeze({ lat:23.7104, long:90.40744 }),
  "Nepal/Kathmandu":Object.freeze({ lat:27.70169, long:85.3206 }),
  "Sri Lanka/Colombo":Object.freeze({ lat:6.93548, long:79.84868 }),
  "India/Udaipur":Object.freeze({ lat:24.58584, long:73.71346 }),
  "India/Aizawl":Object.freeze({ lat:23.72894, long:92.71791 }),
  "Pakistan/Abbottabad":Object.freeze({ lat:34.1463, long:73.21168 }),
  "Bangladesh/Rangpur":Object.freeze({ lat:25.74664, long:89.25166 }),
  "Nepal/Tansen":Object.freeze({ lat:27.86655, long:83.54587 }),
  "Sri Lanka/Matara":Object.freeze({ lat:5.94851, long:80.53528 }),
  "China/Chengdu":Object.freeze({ lat:30.66667, long:104.06667 }),
  "Japan/Osaka":Object.freeze({ lat:34.69379, long:135.50107 }),
  "South Korea/Busan":Object.freeze({ lat:35.10168, long:129.03004 }),
  "Taiwan/Kaohsiung":Object.freeze({ lat:22.61626, long:120.31333 }),
  "Japan/Takayama":Object.freeze({ lat:36.13333, long:137.25 }),
  "Japan/Matsue":Object.freeze({ lat:35.48333, long:133.05 }),
  "South Korea/Gangneung":Object.freeze({ lat:37.75266, long:128.87239 }),
  "Taiwan/Taitung":Object.freeze({ lat:22.75991, long:121.14457 }),
  "Taiwan/Hualien":Object.freeze({ lat:23.97694, long:121.60444 }),
  "Mongolia/Erdenet":Object.freeze({ lat:49.03333, long:104.08333 }),
  "Indonesia/Makassar":Object.freeze({ lat:-5.14861, long:119.43194 }),
  "Philippines/Cebu":Object.freeze({ lat:10.31672, long:123.89071 }),
  "Vietnam/Da Nang":Object.freeze({ lat:16.06778, long:108.22083 }),
  "Thailand/Chiang Mai":Object.freeze({ lat:18.79038, long:98.98468 }),
  "Indonesia/Bukittinggi":Object.freeze({ lat:-0.30907, long:100.37055 }),
  "Indonesia/Salatiga":Object.freeze({ lat:-7.33194, long:110.49278 }),
  "Philippines/Dumaguete":Object.freeze({ lat:9.30646, long:123.30769 }),
  "Philippines/Vigan":Object.freeze({ lat:17.57472, long:120.38694 }),
  "Vietnam/Da Lat":Object.freeze({ lat:11.94646, long:108.44193 }),
  "Thailand/Chiang Rai":Object.freeze({ lat:19.90858, long:99.8325 }),
  "Nigeria/Lagos":Object.freeze({ lat:6.45407, long:3.39467 }),
  "Ethiopia/Addis Ababa":Object.freeze({ lat:9.02497, long:38.74689 }),
  "Kenya/Nairobi":Object.freeze({ lat:-1.28333, long:36.81667 }),
  "Tanzania/Dar Es Salaam":Object.freeze({ lat:-6.82349, long:39.26951 }),
  "South Africa/Cape Town":Object.freeze({ lat:-33.92584, long:18.42322 }),
  "Nigeria/Ilorin":Object.freeze({ lat:8.49664, long:4.54214 }),
  "Kenya/Kisumu":Object.freeze({ lat:-0.10221, long:34.76171 }),
  "Ghana/Tamale":Object.freeze({ lat:9.40079, long:-0.8393 }),
  "Ghana/Cape Coast":Object.freeze({ lat:5.10535, long:-1.2466 }),
  "Tanzania/Arusha":Object.freeze({ lat:-3.36667, long:36.68333 }),
  "South Africa/Makhanda":Object.freeze({ lat:-33.30422, long:26.53276 }),
  "Egypt/Alexandria":Object.freeze({ lat:31.20176, long:29.91582 }),
  "Turkey/Istanbul":Object.freeze({ lat:41.01384, long:28.94966 }),
  "Morocco/Fes":Object.freeze({ lat:34.03313, long:-5.00028 }),
  "Israel/Jerusalem":Object.freeze({ lat:31.76904, long:35.21633 }),
  "Morocco/Chefchaouen":Object.freeze({ lat:35.16878, long:-5.2636 }),
  "Turkey/Mardin":Object.freeze({ lat:37.31309, long:40.74357 }),
  "Jordan/Madaba":Object.freeze({ lat:31.71599, long:35.79392 }),
  "Egypt/Aswan":Object.freeze({ lat:24.09082, long:32.89942 }),
  "Oman/Nizwa":Object.freeze({ lat:22.93333, long:57.53333 }),
  "Lebanon/Zahle":Object.freeze({ lat:33.84675, long:35.90203 }),
  "United Kingdom/Manchester":Object.freeze({ lat:53.48095, long:-2.23743 }),
  "Portugal/Lisbon":Object.freeze({ lat:38.72509, long:-9.1498 }),
  "Germany/Berlin":Object.freeze({ lat:52.52437, long:13.41053 }),
  "Poland/Warsaw":Object.freeze({ lat:52.22977, long:21.01178 }),
  "Romania/Cluj Napoca":Object.freeze({ lat:46.76667, long:23.6 }),
  "Romania/Sibiu":Object.freeze({ lat:45.8, long:24.15 }),
  "Estonia/Tartu":Object.freeze({ lat:58.38062, long:26.72509 }),
  "Ireland/Galway":Object.freeze({ lat:53.27245, long:-9.05095 }),
  "Portugal/Braga":Object.freeze({ lat:41.5514, long:-8.42311 }),
  "Spain/Girona":Object.freeze({ lat:41.98311, long:2.82493 }),
  "Bosnia and Herzegovina/Mostar":Object.freeze({ lat:43.34333, long:17.80806 }),
  "Mexico/Mexico City":Object.freeze({ lat:19.42847, long:-99.12766 }),
  "Colombia/Bogota":Object.freeze({ lat:4.60971, long:-74.08175 }),
  "Peru/Lima":Object.freeze({ lat:-12.04318, long:-77.02824 }),
  "Brazil/Recife":Object.freeze({ lat:-8.05389, long:-34.88111 }),
  "Argentina/Buenos Aires":Object.freeze({ lat:-34.61315, long:-58.37723 }),
  "Colombia/Pereira":Object.freeze({ lat:4.81428, long:-75.69488 }),
  "Ecuador/Loja":Object.freeze({ lat:-3.99313, long:-79.20422 }),
  "Argentina/Salta":Object.freeze({ lat:-24.80645, long:-65.41999 }),
  "Chile/Valdivia":Object.freeze({ lat:-39.81422, long:-73.24589 }),
  "Mexico/Oaxaca":Object.freeze({ lat:17.06025, long:-96.72544 }),
  "Brazil/Paraty":Object.freeze({ lat:-23.21778, long:-44.71306 }),
  "United States/Chicago":Object.freeze({ lat:41.85003, long:-87.65005 }),
  "Canada/Vancouver":Object.freeze({ lat:49.24966, long:-123.11934 }),
  "United States/Honolulu":Object.freeze({ lat:21.30694, long:-157.85833 }),
  "United States/Santa Fe, New Mexico":Object.freeze({ lat:35.68698, long:-105.9378 }),
  "United States/Flagstaff, Arizona":Object.freeze({ lat:35.19807, long:-111.65127 }),
  "United States/Burlington, Vermont":Object.freeze({ lat:44.47588, long:-73.21207 }),
  "United States/Duluth, Minnesota":Object.freeze({ lat:46.78327, long:-92.10658 }),
  "Canada/Kelowna, British Columbia":Object.freeze({ lat:49.88307, long:-119.48568 }),
  "Canada/Whitehorse, Yukon":Object.freeze({ lat:60.71611, long:-135.05375 }),
  "Georgia/Tbilisi":Object.freeze({ lat:41.69143, long:44.83412 }),
  "Kazakhstan/Almaty":Object.freeze({ lat:43.25249, long:76.9115 }),
  "Georgia/Kutaisi":Object.freeze({ lat:42.26791, long:42.69459 }),
  "Armenia/Gyumri":Object.freeze({ lat:40.79305, long:43.84635 }),
  "Kyrgyzstan/Karakol":Object.freeze({ lat:42.49047, long:78.39197 }),
  "Tajikistan/Khujand":Object.freeze({ lat:40.28256, long:69.62216 }),
  "Kyrgyzstan/Osh":Object.freeze({ lat:40.52828, long:72.7985 }),
  "Kazakhstan/Turkistan":Object.freeze({ lat:43.29458, long:68.25685 }),
  "Australia/Hobart":Object.freeze({ lat:-42.87936, long:147.32941 }),
  "New Zealand/Auckland":Object.freeze({ lat:-36.84853, long:174.76349 }),
  "Papua New Guinea/Port Moresby":Object.freeze({ lat:-9.47723, long:147.15089 }),
  "New Zealand/Dunedin":Object.freeze({ lat:-45.87416, long:170.50361 }),
  "New Zealand/Nelson":Object.freeze({ lat:-41.27078, long:173.28404 }),
  "Australia/Alice Springs":Object.freeze({ lat:-23.69748, long:133.88362 }),
  "Australia/Launceston":Object.freeze({ lat:-41.43876, long:147.13467 }),
  "Fiji/Suva":Object.freeze({ lat:-18.13683, long:178.42531 }),
  "Samoa/Apia":Object.freeze({ lat:-13.83333, long:-171.76666 }),
});

function place(name, populationK) {
  return Object.freeze({ place:name, populationK });
}

// Forty large-city anchors distributed across the world, plus a smaller-place long tail.
const REGIONS = Object.freeze([
  Object.freeze({ id:"south_asia", weight:25, anchors:Object.freeze([
    place("India/Mumbai",21000), place("Pakistan/Lahore",13000), place("Bangladesh/Dhaka",23000),
    place("Nepal/Kathmandu",1500), place("Sri Lanka/Colombo",750),
  ]), longTail:Object.freeze([
    place("India/Udaipur",450), place("India/Aizawl",300), place("Pakistan/Abbottabad",250),
    place("Bangladesh/Rangpur",300), place("Nepal/Tansen",30), place("Sri Lanka/Matara",75),
  ]) }),
  Object.freeze({ id:"east_asia", weight:20, anchors:Object.freeze([
    place("China/Chengdu",16000), place("Japan/Osaka",19000), place("South Korea/Busan",3300), place("Taiwan/Kaohsiung",2700),
  ]), longTail:Object.freeze([
    place("Japan/Takayama",85), place("Japan/Matsue",200), place("South Korea/Gangneung",215),
    place("Taiwan/Taitung",105), place("Taiwan/Hualien",100), place("Mongolia/Erdenet",100),
  ]) }),
  Object.freeze({ id:"southeast_asia", weight:9, anchors:Object.freeze([
    place("Indonesia/Makassar",1500), place("Philippines/Cebu",1000), place("Vietnam/Da Nang",1200), place("Thailand/Chiang Mai",1300),
  ]), longTail:Object.freeze([
    place("Indonesia/Bukittinggi",125), place("Indonesia/Salatiga",200), place("Philippines/Dumaguete",135),
    place("Philippines/Vigan",55), place("Vietnam/Da Lat",260), place("Thailand/Chiang Rai",80),
  ]) }),
  Object.freeze({ id:"sub_saharan_africa", weight:15, anchors:Object.freeze([
    place("Nigeria/Lagos",16000), place("Ethiopia/Addis Ababa",5500), place("Kenya/Nairobi",5000),
    place("Tanzania/Dar Es Salaam",7500), place("South Africa/Cape Town",4800),
  ]), longTail:Object.freeze([
    place("Nigeria/Ilorin",800), place("Kenya/Kisumu",610), place("Ghana/Tamale",375),
    place("Ghana/Cape Coast",190), place("Tanzania/Arusha",620), place("South Africa/Makhanda",85),
  ]) }),
  Object.freeze({ id:"west_asia_north_africa", weight:7, anchors:Object.freeze([
    place("Egypt/Alexandria",5500), place("Turkey/Istanbul",16000), place("Morocco/Fes",1200), place("Israel/Jerusalem",1000),
  ]), longTail:Object.freeze([
    place("Morocco/Chefchaouen",45), place("Turkey/Mardin",130), place("Jordan/Madaba",85),
    place("Egypt/Aswan",290), place("Oman/Nizwa",75), place("Lebanon/Zahle",100),
  ]) }),
  Object.freeze({ id:"europe", weight:9, anchors:Object.freeze([
    place("United Kingdom/Manchester",2800), place("Portugal/Lisbon",3000), place("Germany/Berlin",3800),
    place("Poland/Warsaw",1900), place("Romania/Cluj Napoca",300),
  ]), longTail:Object.freeze([
    place("Romania/Sibiu",135), place("Estonia/Tartu",100), place("Ireland/Galway",85),
    place("Portugal/Braga",200), place("Spain/Girona",105), place("Bosnia and Herzegovina/Mostar",105),
  ]) }),
  Object.freeze({ id:"latin_america_caribbean", weight:8, anchors:Object.freeze([
    place("Mexico/Mexico City",22000), place("Colombia/Bogota",11000), place("Peru/Lima",11000),
    place("Brazil/Recife",4000), place("Argentina/Buenos Aires",15000),
  ]), longTail:Object.freeze([
    place("Colombia/Pereira",480), place("Ecuador/Loja",215), place("Argentina/Salta",620),
    place("Chile/Valdivia",165), place("Mexico/Oaxaca",300), place("Brazil/Paraty",45),
  ]) }),
  Object.freeze({ id:"north_america", weight:5, anchors:Object.freeze([
    place("United States/Chicago",9000), place("Canada/Vancouver",2700), place("United States/Honolulu",350),
  ]), longTail:Object.freeze([
    place("United States/Santa Fe, New Mexico",90), place("United States/Flagstaff, Arizona",80),
    place("United States/Burlington, Vermont",45), place("United States/Duluth, Minnesota",85),
    place("Canada/Kelowna, British Columbia",145), place("Canada/Whitehorse, Yukon",30),
  ]) }),
  Object.freeze({ id:"central_asia_caucasus", weight:1, anchors:Object.freeze([
    place("Georgia/Tbilisi",1200), place("Kazakhstan/Almaty",2200),
  ]), longTail:Object.freeze([
    place("Georgia/Kutaisi",135), place("Armenia/Gyumri",110), place("Kyrgyzstan/Karakol",85),
    place("Tajikistan/Khujand",200), place("Kyrgyzstan/Osh",320), place("Kazakhstan/Turkistan",220),
  ]) }),
  Object.freeze({ id:"oceania", weight:1, anchors:Object.freeze([
    place("Australia/Hobart",250), place("New Zealand/Auckland",1700), place("Papua New Guinea/Port Moresby",400),
  ]), longTail:Object.freeze([
    place("New Zealand/Dunedin",130), place("New Zealand/Nelson",55), place("Australia/Alice Springs",25),
    place("Australia/Launceston",90), place("Fiji/Suva",95), place("Samoa/Apia",40),
  ]) }),
]);

export const MODERN_BIRTHPLACE_ANCHOR_COUNT = REGIONS.reduce((sum, region) => sum + region.anchors.length, 0);
export const MODERN_BIRTHPLACE_LONG_TAIL_SHARE = LONG_TAIL_SHARE;
export const MODERN_BIRTHPLACES = Object.freeze(REGIONS.flatMap((region) => (
  [["anchor", region.anchors], ["long_tail", region.longTail]].flatMap(([tier, localities]) =>
    localities.map((locality) => {
      const coordinates = BIRTHPLACE_COORDINATES[locality.place];
      if (!coordinates) throw new Error(`missing coordinates for modern birthplace ${locality.place}`);
      const slash = locality.place.indexOf("/");
      return Object.freeze({
        place:locality.place,
        country:locality.place.slice(0, slash),
        city:locality.place.slice(slash + 1),
        lat:coordinates.lat,
        long:coordinates.long,
        populationK:locality.populationK,
        region:region.id,
        tier,
      });
    })
  )
)));

function unit(requestId, label) {
  const digest = sha256(`fibre-modern-birthplace:${label}:${requestId}`);
  return Number.parseInt(digest.slice(0, 12), 16) / 0xffffffffffff;
}

function weightedChoice(values, weightOf, draw) {
  const weights = values.map(weightOf);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = draw * total;
  for (let index = 0; index < values.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return values[index];
  }
  return values.at(-1);
}

export function sampleModernBirthplace(requestId) {
  if (typeof requestId !== "string" || requestId.trim() === "") throw new TypeError("Genesis requestId is required");
  const region = weightedChoice(REGIONS, (candidate) => candidate.weight, unit(requestId, "region"));
  const kind = unit(requestId, "kind") < LONG_TAIL_SHARE ? "long_tail" : "anchor";
  const localities = kind === "long_tail" ? region.longTail : region.anchors;
  const locality = weightedChoice(
    localities,
    (candidate) => candidate.populationK ** LOCALITY_POPULATION_EXPONENT,
    unit(requestId, "locality"),
  );
  return Object.freeze({ place:locality.place, kind, region:region.id });
}
