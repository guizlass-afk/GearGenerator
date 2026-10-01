/* Original implementation. All rights reserved. Distances in mm, angles in radians.
 * Ideal normal rack rolling envelope; see README for derivation and scope. */
(function(root){
'use strict';
const PI=Math.PI, TAU=2*PI, RAD=PI/180;
const racks={A:{ha:1,hf:1.25,rho:.38},B:{ha:1,hf:1.25,rho:.30},C:{ha:1,hf:1.25,rho:.25},D:{ha:1,hf:1.4,rho:.39}};
class GeometryError extends Error{constructor(code,detail=''){super(code);this.code=code;this.detail=detail;}}
const fail=(code,detail)=>{throw new GeometryError(code,detail);};
const polar=(r,a)=>[r*Math.cos(a),r*Math.sin(a)];
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const inv=a=>Math.tan(a)-a;
function dimensions(input){
 const p={...input}, rack=racks[p.rack];
 if(!rack||!['spur','helical'].includes(p.type)||!['R','L'].includes(p.hand))fail('invalid');
 for(const key of ['module','teeth','beta','width','bore','tolerance'])if(typeof p[key]!=='number'||!Number.isFinite(p[key]))fail('invalid');
 if(p.module<.1||p.module>50||!Number.isInteger(p.teeth)||p.teeth<6||p.teeth>400||p.width<=0||p.width>1000||p.bore<0||p.tolerance<.001||p.tolerance>.1)fail('range');
 const beta=(p.type==='spur'?0:p.beta)*RAD;
 if(beta<0||beta>45*RAD||(p.type==='helical'&&beta===0))fail('range');
 const an=20*RAD, cb=Math.cos(beta), at=Math.atan(Math.tan(an)/cb), mt=p.module/cb;
 const rp=mt*p.teeth/2, rb=rp*Math.cos(at), ra=rp+rack.ha*p.module, rf=rp-rack.hf*p.module;
 if(p.bore>=2*rf)fail('boreError');
 const rho=rack.rho*p.module, vc=-rack.hf*p.module+rho;
 const uc=PI*p.module/4+vc*Math.tan(an)-rho/Math.cos(an);
 const vj=vc-rho*Math.sin(an);
 // Restrict this implementation to non-undercut flanks. Exact condition at tool fillet join.
 const zmin=Math.ceil(2*cb*(-vj/p.module)/Math.sin(at)**2-1e-10);
 if(p.teeth<zmin)fail('undercut',zmin);
 const rj=Math.hypot(-vj/Math.tan(at),rp+vj);
 const half=PI/(2*p.teeth), tipAngle=half+inv(at)-inv(Math.acos(rb/ra));
 if(tipAngle<=0||rj>=ra||uc<=0)fail('invalid');
 const lead=beta===0?null:TAU*rp/Math.tan(beta);
 // Positive is counterclockwise viewed from +Z toward XY, advancing from Z=0 to Z=width.
 const twist=beta===0?0:(p.hand==='R'?1:-1)*p.width*Math.tan(beta)/rp/RAD;
 return{...p,...rack,betaRad:beta,an,at,mt,rp,rb,ra,rf,rj,rho,uc,vc,vj,zmin,tipAngle,lead,twist,normalPitch:PI*p.module,transversePitch:PI*mt,normalThickness:PI*p.module/2};
}
function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy;const t=q?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function sample(fn,a,b,tol){
 const out=[fn(a)];
 function split(lo,hi,p,q,depth){
  const m=(lo+hi)/2,mid=fn(m),q1=fn((3*lo+hi)/4),q3=fn((lo+3*hi)/4);
  const err=Math.max(distanceToSegment(mid,p,q),distanceToSegment(q1,p,q),distanceToSegment(q3,p,q));
  if(err>tol*.5){if(depth>=24)fail('resolution');split(lo,m,p,mid,depth+1);split(m,hi,mid,q,depth+1);}else out.push(q);
 }
 split(a,b,out[0],fn(b),0);return out;
}
function profile(input){
 const g=dimensions(input),cb=Math.cos(g.betaRad),angle0=PI/2-PI/g.teeth;
 const fillet=theta=>{
  const u=(g.uc+g.rho*Math.cos(theta))/cb,v=g.vc+g.rho*Math.sin(theta);
  const x=v*cb*Math.cos(theta)/Math.sin(theta),phi=(x-u)/g.rp;
  return rotate([x,g.rp+v],phi-angle0);
 };
 const flank=r=>polar(r,PI/(2*g.teeth)+inv(g.at)-inv(Math.acos(Math.min(1,g.rb/r))));
 const positive=sample(fillet,-PI/2,-g.an,g.tolerance);
 const join=flank(g.rj);
 if(Math.hypot(join[0]-positive.at(-1)[0],join[1]-positive.at(-1)[1])>1e-7*Math.max(1,g.rp))fail('invalid');
 positive.push(...sample(flank,g.rj,g.ra,g.tolerance).slice(1));
 const rootAngle=Math.atan2(positive[0][1],positive[0][0]);
 const tooth=positive.map(p=>[p[0],-p[1]]);
 tooth.push(...sample(a=>polar(g.ra,a),-g.tipAngle,g.tipAngle,g.tolerance).slice(1));
 tooth.push(...positive.slice(0,-1).reverse());
 tooth.push(...sample(a=>polar(g.rf,a),rootAngle,TAU/g.teeth-rootAngle,g.tolerance).slice(1,-1));
 const points=[];
 for(let i=0;i<g.teeth;i++)for(const p of tooth)points.push(rotate(p,i*TAU/g.teeth));
 if(points.length>200000)fail('resolution');
 return{...g,points,pointsPerTooth:tooth.length};
}
function dxf(g,construction=false){
 const lines=[],pair=(code,value)=>lines.push(String(code),String(value)),n=x=>Number(x.toFixed(9)).toString();
 pair(0,'SECTION');pair(2,'HEADER');pair(9,'$ACADVER');pair(1,'AC1015');pair(9,'$INSUNITS');pair(70,4);pair(9,'$MEASUREMENT');pair(70,1);pair(0,'ENDSEC');
 pair(0,'SECTION');pair(2,'TABLES');pair(0,'TABLE');pair(2,'LAYER');pair(5,'1');pair(330,'0');pair(100,'AcDbSymbolTable');pair(70,4);
 for(const [name,color]of [['PROFILE',7],['BORE',7],['REFERENCE',3],['NOTES',8]]){pair(0,'LAYER');pair(100,'AcDbSymbolTableRecord');pair(100,'AcDbLayerTableRecord');pair(2,name);pair(70,0);pair(62,color);pair(6,'CONTINUOUS');}
 pair(0,'ENDTAB');pair(0,'ENDSEC');pair(0,'SECTION');pair(2,'ENTITIES');
 pair(0,'LWPOLYLINE');pair(100,'AcDbEntity');pair(8,'PROFILE');pair(100,'AcDbPolyline');pair(90,g.points.length);pair(70,1);
 for(const [x,y]of g.points){pair(10,n(x));pair(20,n(y));}
 const circle=(r,layer)=>{pair(0,'CIRCLE');pair(100,'AcDbEntity');pair(8,layer);pair(100,'AcDbCircle');pair(10,0);pair(20,0);pair(30,0);pair(40,n(r));};
 if(g.bore>0)circle(g.bore/2,'BORE');
 if(construction){
  circle(g.rp,'REFERENCE');circle(g.rb,'REFERENCE');circle(g.rf,'REFERENCE');
  const notes=[`Gear Generator | ISO 53:1998 ${g.rack} reference rack | mm | XY transverse section`,
   `z=${g.teeth} mn=${g.module} alpha_n=20deg beta=${n(g.betaRad/RAD)}deg ${g.hand} x=0`,
   `d=${n(2*g.rp)} da=${n(2*g.ra)} df=${n(2*g.rf)} db=${n(2*g.rb)} bore=${g.bore}`,
   `Face width=${g.width} twist=${n(g.twist)}deg (+CCW from +Z) chord target=${g.tolerance}mm`,
   'Ideal rack envelope; no backlash, kerf, fit or strength allowance. REFERENCE/NOTES not for cutting.'];
  notes.forEach((s,i)=>{pair(0,'TEXT');pair(100,'AcDbEntity');pair(8,'NOTES');pair(100,'AcDbText');pair(10,-g.ra);pair(20,n(-g.ra-(i+1)*g.module*2));pair(30,0);pair(40,n(g.module));pair(1,s);});
 }
 pair(0,'ENDSEC');pair(0,'EOF');return lines.join('\r\n')+'\r\n';
}
const api={racks,dimensions,profile,dxf,sample,distanceToSegment};root.GearGeometry=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
