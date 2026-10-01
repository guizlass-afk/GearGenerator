(() => {
'use strict';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
window.GearDrawing={svg(g,t,guides=true){
 const f=x=>Number(x.toFixed(3)).toString(),cx=330,cy=322,s=210/g.ra;
 const path=g.points.map(([x,y],i)=>`${i?'L':'M'}${f(cx+x*s)},${f(cy-y*s)}`).join(' ')+' Z';
 const tx=(x,y,text,size=14,anchor='middle',fill='#294655')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${escape(text)}</text>`;
 const line=(x1,y1,x2,y2,extra='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#67818b" stroke-width="1" ${extra}/>`;
 const dim=(x1,x2,y,text,fromY)=>line(x1,fromY,x1,y-8)+line(x2,fromY,x2,y-8)+line(x1,y,x2,y,'marker-start="url(#arrow)" marker-end="url(#arrow)"')+tx((x1+x2)/2,y-10,text,15);
 const circle=(r,color,dash='')=>`<circle cx="${cx}" cy="${cy}" r="${f(r*s)}" fill="none" stroke="${color}" stroke-width="1" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" role="img" aria-label="${escape(t('section'))}" style="font-family:Segoe UI,Arial,sans-serif;direction:ltr"><title>Gear Generator · ISO 53:1998 ${g.rack} · z=${g.teeth} · mn=${g.module} mm</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M10 0L0 5L10 10" fill="none" stroke="#67818b" stroke-width="1.5"/></marker><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#dfe8eb"/></pattern></defs><rect width="1000" height="650" fill="white"/><rect x="22" y="22" width="956" height="606" rx="4" fill="url(#grid)" stroke="#e1eaec"/>`;
 out+=tx(45,49,t('section'),12,'start','#6d8991')+tx(953,49,'mm',12,'end','#6d8991');
 out+=`<path d="${path}" fill="#e6f2ef" stroke="#147c76" stroke-width="1.5"/>`;
 if(g.bore>0)out+=`<circle cx="${cx}" cy="${cy}" r="${f(g.bore*s/2)}" fill="white" stroke="#147c76" stroke-width="1.5"/>`;
 if(guides){out+=circle(g.rp,'#7092a0','7 5')+circle(g.rf,'#9eb0b8','3 5')+circle(g.rb,'#baa277','3 5');out+=line(cx-225,cy,cx+225,cy,'stroke-dasharray="12 4 2 4"')+line(cx,cy-225,cx,cy+225,'stroke-dasharray="12 4 2 4"');}
 out+=dim(cx-210,cx+210,90,`da = Ø ${f(2*g.ra)}`,cy);
 out+=dim(cx-g.rf*s,cx+g.rf*s,565,`df = Ø ${f(2*g.rf)}`,cy);
 if(g.bore>0){const bx=cx-g.bore*s/2;out+=line(bx,cy,cx-145,cy+85)+line(cx-145,cy+85,85,cy+85)+tx(85,cy+106,`Ø ${f(g.bore)}`,15,'start');}
 out+=line(615,90,615,568);
 out+=tx(790,112,t('side'),14)+tx(790,135,t('schematic'),11,'middle','#6d8991');
 // Side diagram conveys thickness and helix direction, not a meshed/hidden-line projection.
 const sw=Math.max(22,Math.min(130,g.width*s)),sx=790-sw/2,sy=210,sh=225;
 out+=`<rect x="${f(sx)}" y="${sy}" width="${f(sw)}" height="${sh}" fill="#edf5f3" stroke="#147c76" stroke-width="1.5"/>`;
 for(let i=1;i<6;i++){const y=sy+i*sh/6,delta=g.type==='helical'?(g.hand==='R'?-15:15):0;out+=line(sx,y,sx+sw,y+delta);}
 out+=dim(sx,sx+sw,185,`b = ${f(g.width)}`,sy);
 out+=tx(790,476,`β = ${f(g.betaRad*180/Math.PI)}° · ${g.type==='spur'?t('spur'):t(g.hand==='R'?'right':'left')}`,13);
 out+=tx(790,501,`${t('twist')} = ${f(g.twist)}°`,13)+tx(790,535,`d = Ø ${f(2*g.rp)}`,14)+tx(790,557,`db = Ø ${f(2*g.rb)}`,14);
 out+=line(42,589,958,589)+tx(45,613,`ISO 53:1998 ${g.rack} · z ${g.teeth} · mn ${g.module} · αn 20° · x 0`,13,'start')+tx(953,613,'GEAR GENERATOR',11,'end','#6d8991');
 return out+'</svg>';
}};

// Magnify the very same vertices exported to DXF; no substitute tooth illustration.
window.GearDrawing.detail=function(g,t){
 const f=x=>Number(x.toFixed(3)).toString(),step=2*Math.PI/g.teeth,half=Math.PI/(2*g.teeth);
 const scale=Math.min(145/(g.ra-g.rf),215/(g.ra*Math.sin(1.5*step))),cx=324,cy=245;
 const xy=(r,a)=>[cx-r*Math.sin(a)*scale,cy+(g.rp-r*Math.cos(a))*scale];
 const pt=p=>p.map(f).join(' '),text=(x,y,label,size=13,anchor='start',color='#294655')=>`<text x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="${anchor}" fill="${color}">${escape(label)}</text>`;
 const line=(a,b,extra='')=>`<path d="M${pt(a)}L${pt(b)}" fill="none" stroke="#67818b" stroke-width="1" ${extra}/>`;
 const arrows='marker-start="url(#detailArrow)" marker-end="url(#detailArrow)"';
 const arc=(r,a,b,extra='')=>`<path d="M${pt(xy(r,a))}A${f(r*scale)} ${f(r*scale)} 0 ${Math.abs(b-a)>Math.PI?1:0} 0 ${pt(xy(r,b))}" fill="none" stroke="#67818b" stroke-width="1" ${extra}/>`;
 const vertices=[];
 for(const offset of [-1,0,1])for(const [x,y]of g.points.slice(0,g.pointsPerTooth)){
  const a=offset*step,X=x*Math.cos(a)-y*Math.sin(a),Y=x*Math.sin(a)+y*Math.cos(a);
  vertices.push([cx-Y*scale,cy+(g.rp-X)*scale]);
 }
 const path='M'+vertices.map(pt).join('L');
 let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" role="img" aria-label="${escape(t('toothDetail'))}" style="font-family:Segoe UI,Arial,sans-serif;direction:ltr"><title>${escape(t('toothDetail'))} · ISO 53:1998 ${g.rack}</title><defs><marker id="detailArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M10 0L0 5L10 10" fill="none" stroke="#67818b" stroke-width="1.5"/></marker><clipPath id="toothDetailClip"><rect x="80" y="66" width="492" height="372"/></clipPath></defs><rect width="1000" height="500" fill="white"/><rect x="22" y="22" width="956" height="456" rx="4" fill="none" stroke="#e1eaec"/>`;
 out+=text(45,49,t('toothDetail'),15)+text(952,49,'XY · mm',12,'end');
 out+='<g clip-path="url(#toothDetailClip)">';
 out+=`<path data-tooth-outline="true" data-source-vertices="${vertices.length}" d="${path}L${f(vertices.at(-1)[0])} 470L${f(vertices[0][0])} 470Z" fill="#e6f2ef"/><path d="${path}" fill="none" stroke="#147c76" stroke-width="2"/>`;
 for(const [r,dash]of [[g.ra,'3 5'],[g.rp,'9 4'],[g.rf,'3 5']])out+=arc(r,-2*step,2*step,`stroke-dasharray="${dash}"`);
 out+='</g>';
 // Tooth thickness and pitch are ARC dimensions, never straight chord lengths.
 const thickRadius=g.ra+.4*g.module,pitchRadius=g.ra+1.25*g.module;
 for(const a of [-half,half])out+=line(xy(g.rp,a),xy(thickRadius+.18*g.module,a));
 out+=arc(thickRadius,-half,half,arrows)+text(cx,xy(thickRadius,0)[1]-10,`st = ${f(g.transversePitch/2)}`,14,'middle');
 for(const a of [0,step])out+=line(xy(g.ra,a),xy(pitchRadius+.12*g.module,a));
 out+=arc(pitchRadius,0,step,arrows);
 const pitchLabel=xy(pitchRadius,step/2);out+=text(pitchLabel[0],pitchLabel[1]-10,`pt = ${f(g.transversePitch)}`,14,'middle');
 const ya=xy(g.ra,0)[1],yp=cy,yf=xy(g.rf,0)[1];
 for(const [y,r]of [[ya,g.ra],[yp,g.rp],[yf,g.rf]])out+=line([cx,y],[604,y],'stroke-dasharray="3 4"');
 for(const [y1,y2,label]of [[ya,yp,'ha'],[yp,yf,'hf']])out+=line([591,y1],[591,y2],arrows)+text(601,(y1+y2)/2+4,label,13);
 out+=line([65,ya],[65,yf],arrows)+text(53,(ya+yf)/2+4,'h',14,'middle');
 out+=line([65,ya],[92,ya])+line([65,yf],[92,yf]);
 // At the pitch-point, alpha_t is between the local pitch-circle tangent and flank normal.
 const contact=xy(g.rp,half),ray=a=>[contact[0]-84*Math.cos(a),contact[1]+84*Math.sin(a)];
 out+=line(contact,ray(half),'stroke-dasharray="4 3"')+line(contact,ray(half-g.at));
 const angular=a=>[contact[0]-43*Math.cos(a),contact[1]+43*Math.sin(a)];
 out+=`<path d="M${pt(angular(half))}A43 43 0 0 1 ${pt(angular(half-g.at))}" fill="none" stroke="#d48039" stroke-width="1.5"/><circle cx="${f(contact[0])}" cy="${f(contact[1])}" r="3" fill="#d48039"/>`;
 out+=text(contact[0]-99,contact[1]-8,'αt',14,'middle','#a15a26');
 out+=line([639,74],[639,438]);
 const rows=[
  ['toothPitch',`pt = ${f(g.transversePitch)} · pn = ${f(g.normalPitch)} mm`],
  ['toothThickness',`st = ${f(g.transversePitch/2)} · sn = ${f(g.normalThickness)} mm`],
  ['toothAddendum',`ha = ${f(g.ra-g.rp)} mm`],
  ['toothDedendum',`hf = ${f(g.rp-g.rf)} mm`],
  ['toothHeight',`h = ${f(g.ra-g.rf)} mm`],
  ['toothPressure',`αt = ${f(g.at*180/Math.PI)}° · αn = 20°`],
  ['toolRadius',`ρn = ${f(g.rho)} mm`]
 ];
 rows.forEach(([key,value],i)=>{const y=88+i*49;out+=text(660,y,t(key),11,'start','#6d8991')+text(660,y+21,value,14);});
 out+=text(45,462,t('toothNote'),11);
 return out+'</svg>';
};
window.GearDrawing.sheet=function(g,t){
 const main=window.GearDrawing.svg(g,t,true).replace('<svg ','<svg x="0" y="0" width="1000" height="650" ');
 const detail=window.GearDrawing.detail(g,t).replace('<svg ','<svg x="0" y="650" width="1000" height="500" ');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1150"><title>Gear Generator · ISO 53:1998 ${g.rack}</title>${main}${detail}</svg>`;
};
})();
