// Browser-only, bounded slippy-map projection. World alone owns venue coordinates.
const TILE=256;
function locationPixels(lat,long,zoom){
  const boundedLat=Math.max(-85,Math.min(85,lat));
  const rad=boundedLat*Math.PI/180;
  const size=TILE*2**zoom;
  return {x:(long+180)/360*size,
    y:(1-Math.log(Math.tan(Math.PI/4+rad/2))/Math.PI)/2*size};
}

export function worldVenueTileScene(sites,width,height){
  const located=sites.filter(site=>Number.isFinite(site.lat)&&Number.isFinite(site.long)
    &&Math.abs(site.lat)<=85&&Math.abs(site.long)<=180);
  if(!located.length||width<=0||height<=0)return {tiles:[],markers:[]};
  let zoom=15,projected,bounds;
  for(let level=15;level>=2;level--){
    zoom=level;
    projected=located.map(site=>({...locationPixels(site.lat,site.long,zoom),site}));
    const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
    bounds={left:Math.min(...xs),right:Math.max(...xs),
      top:Math.min(...ys),bottom:Math.max(...ys)};
    if(level===2||(bounds.right-bounds.left<width-70&&bounds.bottom-bounds.top<height-70))break;
  }
  const xCenter=(bounds.left+bounds.right)/2;
  const yCenter=(bounds.top+bounds.bottom)/2;
  const left=xCenter-width/2,top=yCenter-height/2;
  const n=2**zoom;
  const tiles=[];
  const startX=Math.floor(left/TILE),endX=Math.floor((left+width)/TILE);
  const startY=Math.max(0,Math.floor(top/TILE));
  const endY=Math.min(n-1,Math.floor((top+height)/TILE));
  for(let y=startY;y<=endY;y++)for(let x=startX;x<=endX;x++){
    tiles.push({url:`https://tile.openstreetmap.org/${zoom}/${((x%n)+n)%n}/${y}.png`,
      left:x*TILE-left,top:y*TILE-top});
  }
  return {tiles,markers:projected.map(({site,x,y})=>({
    site,left:x-left,top:y-top,
  }))};
}
