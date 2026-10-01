(() => {
'use strict';
const $=id=>document.getElementById(id),storage='geargenerator-',numeric=['module','teeth','width','bore','beta','tolerance'],ids=['rack','type','hand',...numeric];
const defaults={rack:'A',type:'spur',hand:'R',module:2,teeth:24,width:10,bore:8,beta:20,tolerance:.01};
const languages={'pt-BR':'Português','en-US':'English','es-ES':'Español','zh-CN':'中文','hi-IN':'हिन्दी','ar-SA':'العربية','fr-FR':'Français','bn-BD':'বাংলা','ru-RU':'Русский','de-DE':'Deutsch','it-IT':'Italiano','ja-JP':'日本語'};
let language='pt-BR',current=null,timer;
try{language=localStorage.getItem(storage+'language')||localStorage.getItem('factorytoolbox-language')||language;}catch{}
if(!languages[language])language='pt-BR';
const t=(key,values={})=>{let s=(GearTranslations[language]||GearTranslations['pt-BR'])[key]||GearTranslations['pt-BR'][key]||key;for(const [k,v]of Object.entries(values))s=s.replaceAll('{'+k+'}',v);return s;};
const f=(n,digits=3)=>new Intl.NumberFormat(language,{maximumFractionDigits:digits}).format(n);
const flags={'pt-BR':'br','en-US':'us','es-ES':'es','zh-CN':'cn','hi-IN':'in','ar-SA':'sa','fr-FR':'fr','bn-BD':'bd','ru-RU':'ru','de-DE':'de','it-IT':'it','ja-JP':'jp'};
const languageButton=$('languageButton'),languageMenu=$('languageMenu');
function setLanguageMenu(open){languageMenu.hidden=!open;languageButton.setAttribute('aria-expanded',String(open));if(open)languageMenu.querySelector(`[data-language="${language}"]`).focus();}
for(const [code,label]of Object.entries(languages)){
 const option=document.createElement('button');option.type='button';option.setAttribute('role','option');option.dataset.language=code;
 const flag=document.createElement('img');flag.src=`flags/${flags[code]}.svg`;flag.alt='';option.append(flag,document.createTextNode(label));languageMenu.append(option);
 option.addEventListener('click',()=>{language=code;try{localStorage.setItem(storage+'language',language);}catch{}languageChange();setLanguageMenu(false);languageButton.focus();});
}
languageButton.addEventListener('click',()=>setLanguageMenu(languageMenu.hidden));
document.addEventListener('click',e=>{if(!e.target.closest('#languagePicker'))setLanguageMenu(false);});
$('languagePicker').addEventListener('keydown',e=>{
 if(e.key==='Escape'){setLanguageMenu(false);languageButton.focus();e.stopPropagation();}
 if(e.key==='Tab')setLanguageMenu(false);
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(languageMenu.hidden){setLanguageMenu(true);return;}const options=[...languageMenu.children],i=options.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();}
});
function read(){const p={};for(const id of ids)p[id]=numeric.includes(id)?($(id).value.trim()===''?NaN:Number($(id).value)):$(id).value;return p;}
function set(p){for(const id of ids)$(id).value=p[id];}
try{const saved=JSON.parse(localStorage.getItem(storage+'selection'));if(saved){GearGeometry.dimensions(saved);set(saved);}}catch{}
function steps(g){
 const data={width:f(g.width),twist:f(g.twist,6),lead:g.lead?f(g.lead,6):'—',da:f(2*g.ra,6),d:f(2*g.rp,6),bore:f(g.bore,6)};
 return[t('step1'),t(g.type==='spur'?'stepSpur':'stepHelix',data),...(g.type==='helical'?[t('stepHand',data)]:[]),t('stepCheck',data)];
}
function drawing(){if(!current)return;$('drawing').innerHTML=GearDrawing.svg(current,t,$('guides').checked);$('toothDrawing').innerHTML=GearDrawing.detail(current,t);}
function render(){
 clearTimeout(timer);$('helixFields').hidden=$('type').value!=='helical';
 const rack=GearGeometry.racks[$('rack').value];$('rackInfo').textContent=rack?`ha* = ${rack.ha} · hf* = ${rack.hf} · ρ* = ${rack.rho}`:'';
 try{
  current=GearGeometry.profile(read());$('error').hidden=true;
  try{localStorage.setItem(storage+'selection',JSON.stringify(read()));}catch{}
 }catch(e){
  current=null;$('error').textContent=t(e.code||'invalid',{min:e.detail});$('error').hidden=false;
 }
 for(const id of ['download','technical','svg','instructionsDownload'])$(id).disabled=!current;
 $('metrics').replaceChildren();$('dimensions').replaceChildren();$('cadSteps').replaceChildren();
 if(!current){$('designation').textContent='—';$('drawing').textContent=t('empty');$('toothDrawing').textContent=t('empty');$('profileInfo').textContent='';return;}
 const g=current;
 $('designation').textContent=`${t(g.type)} · z ${g.teeth} · mₙ ${f(g.module)}`;
 for(const [key,val,unit]of [['pitchDiameter',g.rp*2,'mm'],['tipDiameter',g.ra*2,'mm'],['rootDiameter',g.rf*2,'mm'],['twist',g.twist,'°']]){
  const card=document.createElement('div');card.className='metric';const label=document.createElement('span'),value=document.createElement('strong'),u=document.createElement('small');label.textContent=t(key);value.textContent=f(val)+' ';u.textContent=unit;value.append(u);card.append(label,value);$('metrics').append(card);
 }
 drawing();$('profileInfo').textContent=`${g.points.length.toLocaleString(language)} ${t('points')} · ε = ${f(g.tolerance)} mm`;
 for(const [key,value,unit]of [['pitchDiameter',g.rp*2,'mm'],['tipDiameter',g.ra*2,'mm'],['rootDiameter',g.rf*2,'mm'],['baseDiameter',g.rb*2,'mm'],['transverseModule',g.mt,'mm'],['transversePressure',g.at*180/Math.PI,'°'],['lead',g.lead,'mm']]){
  const tr=document.createElement('tr'),name=document.createElement('td'),v=document.createElement('td');name.textContent=t(key);v.textContent=value===null?'—':f(value,6)+' '+unit;tr.append(name,v);$('dimensions').append(tr);
 }
 for(const step of steps(g)){const li=document.createElement('li');li.textContent=step;$('cadSteps').append(li);}
}
function languageChange(){
 $('currentFlag').src=`flags/${flags[language]}.svg`;$('currentLanguage').textContent=languages[language];languageButton.setAttribute('aria-label',languages[language]);languageMenu.querySelectorAll('button').forEach(o=>o.setAttribute('aria-selected',String(o.dataset.language===language))); document.documentElement.lang=language;document.documentElement.dir=language==='ar-SA'?'rtl':'ltr';
 document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
 document.querySelector('meta[name=description]').content=t('subtitle');
 render();
}
$('parameters').addEventListener('submit',e=>e.preventDefault());
$('parameters').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,100);});
$('parameters').addEventListener('change',render);
$('example').addEventListener('click',()=>{const helical=$('type').value==='helical';set({...defaults,type:helical?'helical':'spur',teeth:helical?30:24,width:helical?15:10,bore:helical?10:8});render();});
$('guides').addEventListener('change',drawing);
$('zoom').addEventListener('change',()=>{const zoom=Number($('zoom').value);$('drawing').style.width=`${zoom*100}%`;$('drawing').style.height=`${zoom*100}%`;});
function save(content,mime,ext,suffix=''){
 const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
 const g=current;a.href=url;a.download=`gear_ISO53${g.rack}_z${g.teeth}_mn${g.module}_${g.type}${g.type==='helical'?'_'+g.beta+'deg_'+g.hand:''}${suffix}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('download').addEventListener('click',()=>{render();if(current)save(GearGeometry.dxf(current),'application/dxf','dxf');});
$('technical').addEventListener('click',()=>{render();if(current)save(GearGeometry.dxf(current,true),'application/dxf','dxf','_reference');});
$('svg').addEventListener('click',()=>{render();if(current)save(GearDrawing.sheet(current,t),'image/svg+xml','svg','_dimensions');});
$('instructionsDownload').addEventListener('click',()=>{render();if(current)save(`Gear Generator | ISO 53:1998 ${current.rack}\n${$('designation').textContent}\n\n${steps(current).map((s,i)=>`${i+1}. ${s}`).join('\n\n')}\n\n${t('scopeNote')}\n${t('helicalNote')}\n\nhttps://www.iso.org/standard/22643.html\nhttps://www.drivetrainhub.com/notebooks/gears/tooling/Chapter%201%20-%20Basic%20Rack.html\n`,'text/plain;charset=utf-8','txt','_CAD');});
window.GearApp={getState:()=>current,getLanguage:()=>language,render};languageChange();
})();
