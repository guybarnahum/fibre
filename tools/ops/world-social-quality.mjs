// Social Life Scorecard: an operator's view of the World's relationship doors,
// relational ledger and the spoken shape of recent conversations. Every
// number here is derived for inspection only; none is shown to a Thread or
// stands in for what a relationship means to the people in it.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { privateGet, topology } from "../validation/encounter-autonomy-probe.mjs";

const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));
const USAGE="usage: world-social:quality -- --env staging [--days N]";
const DAY_MS=86_400_000;
// Recent-weighted social mileage: each spoken turn or Thread-to-Thread
// message counts 0.5^(age in days / 7), so a week-old exchange counts half.
export const MILEAGE_HALF_LIFE_DAYS=7;

// The stage is the furthest door reached without a closed one below it.
const LADDER=[
  ["attention","acknowledged"],["name","acquainted"],
  ["conversation","conversed"],["contact","in touch"],
  ...["time","place","confidence","care","romance","commitment"]
    .map(door=>[door,door+" door open"]),
];
export function relationshipStage(openDoors){
  const open=new Set(openDoors);
  let stage="stranger";
  for(const [door,label] of LADDER){
    if(!open.has(door))break;
    stage=label;
  }
  return stage;
}

const pairKey=ids=>[...ids].sort().join("|");

export function socialScorecard(payload,{at}){
  const now=Date.parse(at);
  const weight=when=>0.5**(Math.max(0,now-Date.parse(when))/DAY_MS/MILEAGE_HALF_LIFE_DAYS);
  const pairs=new Map();
  const pair=ids=>{
    const key=pairKey(ids);
    if(!pairs.has(key))pairs.set(key,{threadIds:key.split("|"),doors:[],
      acts:{offered:0,accepted:0,declined:0,closed:0},offeredBy:{},
      turns:0,messages:0,mileage:0});
    return pairs.get(key);
  };
  for(const door of payload.doors)pair(door.threadIds).doors.push({
    door:door.door,openedAt:door.openedAt,openedBy:door.openedBy,
  });
  for(const act of payload.ledger){
    const entry=pair(act.threadIds);
    if(act.kind in entry.acts)entry.acts[act.kind]+=1;
    if(act.kind==="offered")
      entry.offeredBy[act.actorThreadId]=(entry.offeredBy[act.actorThreadId]??0)+1;
  }
  for(const story of payload.stories){
    const entry=pair(story.threadIds);
    const turns=Object.values(story.turns).reduce((sum,n)=>sum+n,0);
    entry.turns+=turns;
    entry.mileage+=turns*weight(story.occurredAt);
  }
  for(const message of payload.messages){
    const entry=pair([message.senderThreadId,message.recipientThreadId]);
    entry.messages+=1;
    entry.mileage+=weight(message.sentAt);
  }
  const conversations=payload.stories
    .filter(story=>Object.values(story.turns).every(n=>n>0))
    .map(story=>{
      const turns=Object.values(story.turns).reduce((sum,n)=>sum+n,0);
      const questions=Object.values(story.questions).reduce((sum,n)=>sum+n,0);
      return {encounterId:story.encounterId,occurredAt:story.occurredAt,
        threadIds:story.threadIds,turns:story.turns,
        questionShare:turns===0?0:questions/turns,
        interrupted:story.interrupted,lastSpeaker:story.lastSpeaker};
    });
  return {
    at,since:payload.since,mileageHalfLifeDays:MILEAGE_HALF_LIFE_DAYS,
    pairs:[...pairs.values()].map(entry=>({...entry,
      stage:relationshipStage(entry.doors.map(door=>door.door)),
      mileage:Math.round(entry.mileage*10)/10,
    })).sort((a,b)=>b.mileage-a.mileage),
    conversations,
  };
}

const shortId=id=>id.replace(/^(thr_[0-9a-f]{7})[0-9a-f]+$/u,"$1");

export function renderScorecard(card,names,environment){
  const who=id=>`${names[id]??"?"} (${shortId(id)})`;
  const first=id=>names[id]?.split(/\s+/u)[0]??shortId(id);
  const day=iso=>iso.slice(5,10);
  const lines=[`${environment} · since ${card.since.slice(0,10)} · ${card.pairs.length} pairs · ${card.conversations.length} conversations`];
  for(const entry of card.pairs){
    const [a,b]=entry.threadIds;
    lines.push(`${who(a)} ↔ ${who(b)} · ${entry.stage}`);
    if(entry.doors.length>0)
      lines.push("  doors: "+entry.doors.map(door=>`${door.door} ${day(door.openedAt)}`).join(", "));
    const offers=entry.threadIds.map(id=>`${first(id)} ${entry.offeredBy[id]??0}`).join(" · ");
    lines.push(`  acts: offered ${entry.acts.offered} (${offers}) · accepted ${entry.acts.accepted}`
      +` · declined ${entry.acts.declined} · closed ${entry.acts.closed}`);
    lines.push(`  mileage ${entry.mileage} (turns ${entry.turns}, messages ${entry.messages})`);
  }
  if(card.conversations.length>0)lines.push("conversations");
  for(const talk of card.conversations){
    const turns=talk.threadIds.map(id=>`${first(id)} ${talk.turns[id]}`).join(" · ");
    lines.push(`  ${talk.occurredAt.slice(5,16).replace("T"," ")} ${turns} turns`
      +` · questions ${Math.round(talk.questionShare*100)}%`
      +(talk.interrupted>0?` · interrupted ${talk.interrupted}`:""));
  }
  return lines.join("\n");
}

function options(argv){
  const config={env:null,days:7};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")config.env=normalizeCloudflareEnvironment(argv[++i]);
    else if(argv[i]==="--days")config.days=Number(argv[++i]);
    else throw new TypeError(USAGE);
  }
  if(config.env===null||!Number.isFinite(config.days)||config.days<=0||config.days>365)
    throw new TypeError(USAGE);
  return config;
}

async function main(argv){
  const args=options(argv);
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const at=new Date().toISOString();
  const since=new Date(Date.parse(at)-args.days*DAY_MS).toISOString();
  const payload=await privateGet(topology(args.env).worldBaseUrl,
    `/internal/relationships?since=${encodeURIComponent(since)}&limit=2000`,
    token,"relationships");
  const card=socialScorecard(payload,{at});
  const path=resolve(REPO_ROOT,".fibre","world-social",args.env,
    at.replace(/[:.]/gu,"-")+".json");
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify({environment:args.env,scorecard:card,relationships:payload},null,2)+"\n");
  process.stdout.write(renderScorecard(card,payload.names,args.env)+`\nevidence: ${path}\n`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World social quality: ${error.message}\n`);
    process.exitCode=1;
  });
}
