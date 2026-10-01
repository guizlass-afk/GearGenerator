(() => {
'use strict';
const oldMain=GearDrawing.svg,oldDetail=GearDrawing.detail;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const f=x=>Number(x.toFixed(3)).toString(),pt=p=>p.map(f).join(' ');
function kit(height,id,title){
 const text=(x,y,s,size=13,anchor='start',color='#294655')=>`<text x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${esc(s)}</text>`;
 const line=(a,b,extra='')=>`<path d="M${pt(a)}L${pt(b)}" fill="none" stroke="#67818b" stroke-width="1" ${extra}/>`;
 const arrows=`marker-start="url(#${id}Arrow)" marker-end="url(#${id}Arrow)"`;
 const dim=(x1,x2,y,label,from)=>line([x1,from],[x1,y-7])+line([x2,from],[x2,y-7])+line([x1,y],[x2,y],arrows)+text((x1+x2)/2,y-10,label,14,'middle');
 const open=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" role="img" aria-label="${esc(title)}" style="font-family:Segoe UI,Arial,sans-serif;direction:ltr"><title>${esc(title)}</title><defs><marker id="${id}Arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M10 0L0 5L10 10" fill="none" stroke="#67818b" stroke-width="1.5"/></marker></defs><rect width="1000" height="${height}" fill="white"/><rect x="22" y="22" width="956" height="${height-44}" rx="4" fill="none" stroke="#e1eaec"/>`;
 return{text,line,arrows,dim,open};
}
GearDrawing.svg=function(g,t,guides=true){
 if(!['rack','internal'].includes(g.family))return oldMain(g,t,guides);
 const rack=g.family==='rack',key=rack?'linearRack':'internal',k=kit(650,'familyMain',t(key)),{text,line,dim}=k;
 let out=k.open+text(45,49,t(key)+' · XY',14)+text(952,49,'mm',12,'end');
 if(rack){
  const scale=Math.min(480/g.length,255/g.totalHeight),mid=(g.ra+g.rf-g.baseHeight)/2;
  const map=([x,y])=>[330+x*scale,315-(y-mid)*scale];
  const path='M'+g.points.map(p=>pt(map(p))).join('L')+'Z';
  out+=`<path d="${path}" fill="#e6f2ef" stroke="#147c76" stroke-width="1.5"/>`;
  const x1=map([-g.length/2,0])[0],x2=map([g.length/2,0])[0],top=map([0,g.ra])[1],bottom=map([0,g.rf-g.baseHeight])[1];
  if(guides)for(const y of [0,g.ra,g.rf])out+=line(map([-g.length/2,y]),map([g.length/2,y]),'stroke-dasharray="7 4"');
  out+=dim(x1,x2,top-32,`L = ${f(g.length)}`,top);
  out+=line([x1-28,top],[x1-28,bottom],k.arrows)+text(x1-35,(top+bottom)/2,'H',14,'end');
  out+=text(330,bottom+32,`H = ${f(g.totalHeight)} · pt = ${f(g.transversePitch)}`,14,'middle');
  out+=text(330,545,`L = z × pt · z = ${g.teeth}`,13,'middle');
 }else{
  const scale=210/g.outerRadius,cx=330,cy=322;
  const map=([x,y])=>[cx+x*scale,cy-y*scale];
  const hole='M'+g.points.map(p=>pt(map(p))).join('L')+'Z';
  const outer=`M${cx-210} ${cy}A210 210 0 1 0 ${cx+210} ${cy}A210 210 0 1 0 ${cx-210} ${cy}Z`;
  out+=`<path d="${outer}${hole}" fill="#e6f2ef" fill-rule="evenodd" stroke="#147c76" stroke-width="1.5"/>`;
  if(guides)for(const r of [g.rp,g.rb,g.rf])out+=`<circle cx="${cx}" cy="${cy}" r="${f(r*scale)}" fill="none" stroke="#829aa4" stroke-width="1" stroke-dasharray="6 5"/>`;
  out+=dim(cx-210,cx+210,88,`dout = Ø ${f(2*g.outerRadius)}`,cy);
  out+=dim(cx-g.ra*scale,cx+g.ra*scale,565,`da = Ø ${f(2*g.ra)}`,cy);
  out+=text(cx,cy-12,`d = Ø ${f(2*g.rp)}`,15,'middle')+text(cx,cy+14,`df = Ø ${f(2*g.rf)}`,15,'middle');
 }
 out+=line([615,90],[615,568])+text(790,112,t('side'),14,'middle')+text(790,137,t('schematic'),11,'middle','#6d8991');
 const sideLeft=746,sideRight=834,sideTop=212,sideBottom=425;
 out+=`<rect x="${sideLeft}" y="${sideTop}" width="88" height="213" fill="#edf5f3" stroke="#147c76"/>`;
 for(let i=1;i<6;i++){const y=sideTop+i*(sideBottom-sideTop)/6;out+=line([sideLeft,y],[sideRight,y+(g.type==='helical'?(g.hand==='R'?-15:15):0)]);}
 out+=dim(sideLeft,sideRight,183,`b = ${f(g.width)}`,sideTop);
 out+=text(790,470,`β = ${f(g.betaRad*180/Math.PI)}°`,14,'middle');
 out+=text(790,498,rack?`ΔX = ${f(g.shift)} mm`:`${t('twist')} = ${f(g.twist)}°`,14,'middle');
 out+=text(790,528,rack?`base = ${f(g.baseHeight)} mm`:`R = ${f(g.rootFillet)} mm`,14,'middle');
 out+=line([42,589],[958,589])+text(45,613,`ISO 53:1998 ${g.rack} · z ${g.teeth} · mn ${g.module} · αn 20° · x 0`,13)+text(953,613,'GEAR GENERATOR',11,'end');
 return out+'</svg>';
};
GearDrawing.detail=function(g,t){
 if(!['rack','internal'].includes(g.family))return oldDetail(g,t);
 const rack=g.family==='rack',k=kit(500,'familyDetail',t('toothDetail')),{text,line,arrows,dim}=k;
 const scale=rack?Math.min(145/(g.ra-g.rf),430/(3*g.transversePitch)):Math.min(145/(g.rf-g.ra),215/(g.rf*Math.sin(3*Math.PI/g.teeth)));
 const cx=324,cy=245,step=2*Math.PI/g.teeth,half=Math.PI/(2*g.teeth);
 const map=([x,y])=>rack?[cx+x*scale,cy-y*scale]:[cx-y*scale,cy+(g.rp-x)*scale];
 const polar=(r,a)=>[r*Math.cos(a),r*Math.sin(a)],xy=(r,a)=>map(polar(r,a));
 const offsets=rack?(g.teeth===1?[0]:g.teeth===2?[0,1]:[-1,0,1]):[-1,0,1];
 const vertices=[];
 for(const offset of offsets)for(const [x,y]of g.toothPoints){
  const a=offset*step;
  vertices.push(map(rack?[x+offset*g.transversePitch,y]:[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]));
 }
 const path='M'+vertices.map(pt).join('L'),fillY=rack?470:60;
 let out=k.open+text(45,49,t('toothDetail')+' · '+t(rack?'linearRack':'internal'),15)+text(952,49,'XY · mm',12,'end');
 out+='<defs><clipPath id="familyDetailClip"><rect x="80" y="66" width="492" height="372"/></clipPath></defs><g clip-path="url(#familyDetailClip)">';
 out+=`<path data-tooth-outline="true" data-family="${g.family}" d="${path}L${f(vertices.at(-1)[0])} ${fillY}L${f(vertices[0][0])} ${fillY}Z" fill="#e6f2ef"/><path d="${path}" fill="none" stroke="#147c76" stroke-width="2"/>`;
 const arc=(r,a,b,extra='')=>`<path d="M${pt(xy(r,a))}A${f(r*scale)} ${f(r*scale)} 0 ${Math.abs(b-a)>Math.PI?1:0} 0 ${pt(xy(r,b))}" fill="none" stroke="#67818b" stroke-width="1" ${extra}/>`;
 for(const r of [g.ra,g.rp,g.rf])out+=rack?line([80,cy-r*scale],[572,cy-r*scale],'stroke-dasharray="7 4"'):arc(r,-2*step,2*step,'stroke-dasharray="7 4"');
 out+='</g>';
 const ya=rack?cy-g.ra*scale:xy(g.ra,0)[1],yf=rack?cy-g.rf*scale:xy(g.rf,0)[1];
 if(rack){
  const x1=cx-g.transversePitch/4*scale,x2=cx+g.transversePitch/4*scale;
  out+=dim(x1,x2,ya-22,`st = ${f(g.transversePitch/2)}`,cy);
  if(g.teeth>1)out+=dim(cx,cx+g.transversePitch*scale,ya-66,`pt = ${f(g.transversePitch)}`,ya);
 }else{
  const tr=g.ra-.4*g.module,pr=g.ra-1.25*g.module;
  for(const a of [-half,half])out+=line(xy(g.rp,a),xy(tr-.15*g.module,a));
  out+=arc(tr,-half,half,arrows)+text(cx,xy(tr,0)[1]+18,`st = ${f(g.transversePitch/2)}`,14,'middle');
  for(const a of [0,step])out+=line(xy(g.ra,a),xy(pr-.15*g.module,a));
  const pp=xy(pr,step/2);out+=arc(pr,0,step,arrows)+text(pp[0],pp[1]+20,`pt = ${f(g.transversePitch)}`,14,'middle');
 }
 for(const y of [ya,cy,yf])out+=line([cx,y],[604,y],'stroke-dasharray="3 4"');
 for(const [a,b,name]of [[ya,cy,'ha'],[cy,yf,'hf']])out+=line([591,a],[591,b],arrows)+text(601,(a+b)/2+4,name,13);
 out+=line([65,Math.min(ya,yf)],[65,Math.max(ya,yf)],arrows)+text(53,(ya+yf)/2+4,'h',14,'middle');
 const contact=rack?map([-g.transversePitch/4,0]):xy(g.rp,half),angle=rack?0:half;
 const ray=a=>[contact[0]-84*Math.cos(a),contact[1]+84*Math.sin(a)],angular=a=>[contact[0]-43*Math.cos(a),contact[1]+43*Math.sin(a)];
 const end=angle+(rack?-g.at:g.at);
 out+=line(contact,ray(angle),'stroke-dasharray="4 3"')+line(contact,ray(end));
 out+=`<path d="M${pt(angular(angle))}A43 43 0 0 ${rack?1:0} ${pt(angular(end))}" fill="none" stroke="#d48039" stroke-width="1.5"/><circle cx="${f(contact[0])}" cy="${f(contact[1])}" r="3" fill="#d48039"/>`;
 out+=text(contact[0]-95,contact[1]-8,'αt',14,'middle','#a15a26')+line([639,74],[639,438]);
 const rows=[['toothPitch',`pt = ${f(g.transversePitch)} · pn = ${f(g.normalPitch)} mm`],['toothThickness',`st = ${f(g.transversePitch/2)} · sn = ${f(g.normalThickness)} mm`],['toothAddendum',`ha = ${f(g.ha*g.module)} mm`],['toothDedendum',`hf = ${f(g.hf*g.module)} mm`],['toothHeight',`h = ${f((g.ha+g.hf)*g.module)} mm`],['toothPressure',`αt = ${f(g.at*180/Math.PI)}° · αn = 20°`],[rack?'rackRootRadius':'rootFillet',`${rack?'ρn':'R'} = ${f(g.rho)} mm`]];
 rows.forEach(([key,value],i)=>{const y=88+i*49;out+=text(660,y,t(key),11,'start','#6d8991')+text(660,y+21,value,14);});
 out+=text(45,462,t(rack?'rackToothNote':'internalToothNote'),11);
 return out+'</svg>';
};
})();
