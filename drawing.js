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
})();
