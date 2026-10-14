import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {listSocialCityGuide} from "../../services/world-kernel/src/social-city-guide.mjs";

function main(argv){
  let city=null,countryCode=null;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--city")city=argv[++i];
    else if(argv[i]==="--country")countryCode=argv[++i];
    else throw new TypeError("Usage: city-guide:list --city Tbilisi --country GE");
  }
  const manifest=JSON.parse(readFileSync(
    new URL("../../data/social-city-guide.json",import.meta.url),"utf8",
  ));
  const guide=listSocialCityGuide(manifest,{city,countryCode});
  process.stdout.write(JSON.stringify(guide,null,2)+"\n");
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
  try{main(process.argv.slice(2));}
  catch(error){
    process.stderr.write(`City Guide: ${String(error.message??error)}\n`);
    process.exitCode=1;
  }
}
