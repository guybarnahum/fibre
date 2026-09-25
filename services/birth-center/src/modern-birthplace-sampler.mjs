import { sha256 } from "./genesis-development-contracts.mjs";

const LONG_TAIL_SHARE = 0.34;
const LOCALITY_POPULATION_EXPONENT = 0.6;

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
