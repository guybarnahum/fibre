import { resolveLocalityGeographyEvidence } from "#core/src/locality-geography.mjs";

const COUNTRY_DEFAULTS=Object.freeze({
  Morocco:Object.freeze({origin:"Moroccan family",referencePopulation:"afr_north"}),
  Algeria:Object.freeze({origin:"Algerian family",referencePopulation:"afr_north"}),
  Tunisia:Object.freeze({origin:"Tunisian family",referencePopulation:"afr_north"}),
  Libya:Object.freeze({origin:"Libyan family",referencePopulation:"afr_north"}),
  Egypt:Object.freeze({origin:"Egyptian family",referencePopulation:"middle_east.egypt"}),

  Nigeria:Object.freeze({origin:"Nigerian family",referencePopulation:"afr_west"}),
  Ghana:Object.freeze({origin:"Ghanaian family",referencePopulation:"afr_west"}),
  Ethiopia:Object.freeze({origin:"Ethiopian family",referencePopulation:"afr_east"}),
  Kenya:Object.freeze({origin:"Kenyan family",referencePopulation:"afr_east"}),
  Tanzania:Object.freeze({origin:"Tanzanian family",referencePopulation:"afr_east"}),
  "South Africa":Object.freeze({origin:"South African family",referencePopulation:"afr_south"}),

  India:Object.freeze({origin:"Indian family",referencePopulation:"south_asia"}),
  Pakistan:Object.freeze({origin:"Pakistani family",referencePopulation:"south_asia"}),
  Bangladesh:Object.freeze({origin:"Bangladeshi family",referencePopulation:"south_asia"}),
  Nepal:Object.freeze({origin:"Nepali family",referencePopulation:"south_asia"}),
  "Sri Lanka":Object.freeze({origin:"Sri Lankan family",referencePopulation:"south_asia"}),

  China:Object.freeze({origin:"Chinese family",referencePopulation:"east_asia"}),
  Japan:Object.freeze({origin:"Japanese family",referencePopulation:"east_asia.japanese"}),
  "South Korea":Object.freeze({origin:"Korean family",referencePopulation:"east_asia.korean"}),
  Mongolia:Object.freeze({origin:"Mongolian family",referencePopulation:"east_asia.mongolian"}),
  Taiwan:Object.freeze({origin:"Taiwanese family",referencePopulation:"east_asia"}),

  Indonesia:Object.freeze({origin:"Indonesian family",referencePopulation:"southeast_asia"}),
  Philippines:Object.freeze({origin:"Filipino family",referencePopulation:"southeast_asia"}),
  Vietnam:Object.freeze({origin:"Vietnamese family",referencePopulation:"southeast_asia"}),
  Thailand:Object.freeze({origin:"Thai family",referencePopulation:"southeast_asia"}),

  Oman:Object.freeze({origin:"Omani family",referencePopulation:"middle_east.arabia"}),
  Jordan:Object.freeze({origin:"Jordanian family",referencePopulation:"middle_east.levant"}),
  Lebanon:Object.freeze({origin:"Lebanese family",referencePopulation:"middle_east.levant"}),
  Turkey:Object.freeze({origin:"Turkish family",referencePopulation:"middle_east.anatolia"}),
  Georgia:Object.freeze({origin:"Georgian family",referencePopulation:"west_asia"}),
  Armenia:Object.freeze({origin:"Armenian family",referencePopulation:"west_asia"}),

  Portugal:Object.freeze({origin:"Portuguese family",referencePopulation:"eur_south"}),
  Spain:Object.freeze({origin:"Spanish family",referencePopulation:"eur_south"}),
  Romania:Object.freeze({origin:"Romanian family",referencePopulation:"eur_south"}),
  "Bosnia and Herzegovina":Object.freeze({origin:"Bosnian family",referencePopulation:"eur_south"}),
  Germany:Object.freeze({origin:"German family",referencePopulation:"eur_north"}),
  Poland:Object.freeze({origin:"Polish family",referencePopulation:"eur_north"}),
  Estonia:Object.freeze({origin:"Estonian family",referencePopulation:"eur_north"}),
  Ireland:Object.freeze({origin:"Irish family",referencePopulation:"eur_north"}),
  Norway:Object.freeze({origin:"Norwegian family",referencePopulation:"eur_north"}),

  "Papua New Guinea":Object.freeze({origin:"Papua New Guinean family",referencePopulation:"oceania"}),
  Fiji:Object.freeze({origin:"Fijian family",referencePopulation:"oceania"}),
  Samoa:Object.freeze({origin:"Samoan family",referencePopulation:"oceania"}),
});

function birthCountry(identity){
  const structured=identity?.birthPlace;
  if(structured&&typeof structured==="object"&&!Array.isArray(structured)){
    const country=typeof structured.country==="string"?structured.country.trim():"";
    if(country!=="")return country;
  }
  const resolved=resolveLocalityGeographyEvidence([
    identity?.birthCity,
    structured?.displayName,
  ]);
  return resolved?.country??null;
}

export function birthplacePhysicalMigrationSuggestion(identity){
  const country=birthCountry(identity);
  const suggested=country===null?null:COUNTRY_DEFAULTS[country]??null;
  if(suggested===null)return null;
  return Object.freeze({
    source:"birthplace",
    country,
    maternal:Object.freeze({...suggested}),
    paternal:Object.freeze({...suggested}),
  });
}
