function point(name,value){
  if(!value||typeof value!=="object"||!Number.isFinite(value.x)||!Number.isFinite(value.y)){
    throw new TypeError(name+" point is required");
  }
  return Object.freeze({x:Number(value.x),y:Number(value.y)});
}

function pair(name,left,right){
  const a=point(name+" left",left);
  const b=point(name+" right",right);
  const dx=b.x-a.x;
  const dy=b.y-a.y;
  const distance=Math.hypot(dx,dy);
  if(distance<1e-6)throw new TypeError(name+" eye points must be distinct");
  return Object.freeze({
    left:a,
    right:b,
    midpoint:Object.freeze({x:(a.x+b.x)/2,y:(a.y+b.y)/2}),
    angle:Math.atan2(dy,dx),
    distance,
  });
}

export function imageContainRect({width,height,naturalWidth,naturalHeight}={}){
  if(
    !Number.isFinite(width)||width<=0
    ||!Number.isFinite(height)||height<=0
    ||!Number.isFinite(naturalWidth)||naturalWidth<=0
    ||!Number.isFinite(naturalHeight)||naturalHeight<=0
  )throw new TypeError("image dimensions must be positive");
  const scale=Math.min(width/naturalWidth,height/naturalHeight);
  const renderedWidth=naturalWidth*scale;
  const renderedHeight=naturalHeight*scale;
  return Object.freeze({
    x:(width-renderedWidth)/2,
    y:(height-renderedHeight)/2,
    width:renderedWidth,
    height:renderedHeight,
  });
}

export function normalizedImagePoint({x,y,width,height,naturalWidth,naturalHeight}={}){
  const rect=imageContainRect({width,height,naturalWidth,naturalHeight});
  const localX=x-rect.x;
  const localY=y-rect.y;
  if(localX<0||localY<0||localX>rect.width||localY>rect.height)return null;
  return Object.freeze({
    x:localX/rect.width,
    y:localY/rect.height,
  });
}

export function displayedImagePoint(normalized,{width,height,naturalWidth,naturalHeight}={}){
  const p=point("normalized image",normalized);
  const rect=imageContainRect({width,height,naturalWidth,naturalHeight});
  return Object.freeze({
    x:rect.x+p.x*rect.width,
    y:rect.y+p.y*rect.height,
  });
}

export function eyeSimilarityTransform({
  beforeLeft,
  beforeRight,
  afterLeft,
  afterRight,
}={}){
  const before=pair("before",beforeLeft,beforeRight);
  const after=pair("after",afterLeft,afterRight);
  const scale=before.distance/after.distance;
  const rotation=before.angle-after.angle;
  const cos=Math.cos(rotation);
  const sin=Math.sin(rotation);
  const a=scale*cos;
  const b=scale*sin;
  const c=-scale*sin;
  const d=scale*cos;
  const e=before.midpoint.x-(a*after.midpoint.x+c*after.midpoint.y);
  const f=before.midpoint.y-(b*after.midpoint.x+d*after.midpoint.y);
  return Object.freeze({a,b,c,d,e,f,scale,rotation});
}

export function cssSimilarityMatrix(transform){
  if(!transform||typeof transform!=="object")throw new TypeError("similarity transform is required");
  const values=["a","b","c","d","e","f"].map(key=>Number(transform[key]));
  if(values.some(value=>!Number.isFinite(value)))throw new TypeError("similarity transform must be finite");
  return "matrix("+values.join(",")+")";
}
