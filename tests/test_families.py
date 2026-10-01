"""Rack/ring analytic geometry, independent polygon checks and real browser exports."""
import os,sys,math,io,tempfile,json,re
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
if os.environ.get('GEAR_TEST_DEPS'):sys.path.insert(0,os.environ['GEAR_TEST_DEPS'])
import ezdxf
from shapely.geometry import Polygon,LineString,Point
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(tempfile.gettempdir())/'gear-test-output';OUT.mkdir(exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
D=dict(family='rack',rack='A',type='spur',hand='R',module=2,teeth=12,width=10,bore=0,beta=20,tolerance=.001,baseHeight=4,wall=6,rootFillet=.6)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True);page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('GearApp.getState()')
  def profile(**kw):return page.evaluate('p=>GearGeometry.profile(p)',dict(D,**kw))
  def error(**kw):return page.evaluate('p=>{try{GearGeometry.profile(p);return null}catch(e){return e.code}}',dict(D,**kw))
  count=0
  for family in ['rack','internal']:
   for ref in 'ABCD':
    for beta in [0,20,45]:
     for teeth in ([1,12,400]if family=='rack'else[60,120,400]):
      g=profile(family=family,rack=ref,type='helical'if beta else'spur',beta=beta,teeth=teeth)
      poly=Polygon(g['points']);assert poly.is_valid and poly.exterior.is_ccw==(family=='rack'),(family,ref,beta,teeth)
      pitch=math.pi*2/math.cos(math.radians(beta))
      if family=='rack':
       assert abs(g['length']-pitch*teeth)<1e-9
       assert abs(poly.bounds[0]+g['length']/2)<1e-9 and abs(poly.bounds[2]-g['length']/2)<1e-9
       assert abs(poly.bounds[1]-(g['rf']-4))<1e-9 and abs(poly.bounds[3]-2)<1e-9
       cut=poly.intersection(LineString([(-g['length'],0),(g['length'],0)]))
       segments=list(cut.geoms)if hasattr(cut,'geoms')else[cut]
       assert len(segments)==teeth
       assert all(abs(seg.length-pitch/2)<1e-8 for seg in segments)
       assert abs(g['shift']-10*math.tan(math.radians(beta)))<1e-10 and g['twist']==0
      else:
       rp=teeth/math.cos(math.radians(beta));assert abs(g['rp']-rp)<1e-9
       assert abs(g['ra']-(rp-2))<1e-9 and abs(g['outerRadius']-(g['rf']+6))<1e-9
       assert abs(min(math.hypot(*q)for q in g['points'])-g['ra'])<1e-8
       assert abs(max(math.hypot(*q)for q in g['points'])-g['rf'])<1e-8
       assert max(math.hypot(*q)for q in g['points'])<g['outerRadius']
       assert abs(math.hypot(*g['center'])-(g['rf']-g['rho']))<1e-8
      count+=1
  # Independent sampling of internal involute and tangency to the design root fillet.
  for beta in [0,20,45]:
   g=profile(family='internal',teeth=60,type='helical'if beta else'spur',beta=beta)
   boundary=Polygon(g['points']).exterior;alpha=math.atan(math.tan(math.radians(20))/math.cos(math.radians(beta)))
   for i in range(301):
    r=g['ra']+(g['rj']-g['ra'])*i/300;a=math.acos(g['rb']/r)
    theta=math.pi/120-(math.tan(alpha)-alpha)+(math.tan(a)-a)
    q=(r*math.cos(theta),r*math.sin(theta));assert boundary.distance(Point(q))<=.001001
   r=g['rj'];a=math.acos(g['rb']/r);theta=math.pi/120-(math.tan(alpha)-alpha)+(math.tan(a)-a)
   q=(r*math.cos(theta),r*math.sin(theta));normal=(g['center'][0]-q[0],g['center'][1]-q[1]);tangent=(math.cos(theta+a),math.sin(theta+a))
   assert abs(normal[0]*tangent[0]+normal[1]*tangent[1])<1e-9
   assert abs(math.hypot(*normal)-g['rho'])<1e-9
  # Minimum internal involute range is not a pinion-pair interference certification.
  assert error(family='internal',teeth=33)=='internalMinimum'
  assert profile(family='internal',teeth=34)['ra']>profile(family='internal',teeth=34)['rb']
  assert Polygon(profile(family='internal',teeth=60,rootFillet=0)['points']).is_valid
  for kw,code in [({'baseHeight':0},'baseError'),({'baseHeight':1e-15},'baseError'),({'family':'internal','teeth':60,'wall':1e-15},'wallError'),({'family':'internal','teeth':60,'rootFillet':1e-15},'filletError'),({'family':'internal','teeth':60,'wall':0},'wallError'),({'family':'internal','teeth':60,'rootFillet':20},'filletError'),({'teeth':0},'range'),({'teeth':2.5},'range')]:assert error(**kw)==code
  for family in ['rack','internal']:
   for module in [.1,50]:
    assert Polygon(profile(family=family,module=module,teeth=60,baseHeight=module*2,wall=module*3,rootFillet=module*.3)['points']).is_valid
   right=profile(family=family,teeth=60,type='helical');left=profile(family=family,teeth=60,type='helical',hand='L')
   assert right['points']==left['points']
   key='shift'if family=='rack'else'twist';assert right[key]==-left[key]
  # Real downloads in both tooth types: exact geometry, expected material contours and unit metadata.
  for family in ['rack','internal']:
   page.select_option('#family',family)
   for kind in ['spur','helical']:
    page.select_option('#type',kind);page.click('#example');g=page.evaluate('GearApp.getState()')
    assert g['family']==family and page.locator('#error').is_hidden()
    assert page.locator('#boreField').is_hidden()
    assert page.locator('#toothDrawing [data-family]').get_attribute('data-family')==family
    for button,reference in [('download',False),('technical',True)]:
     with page.expect_download()as info:page.click('#'+button)
     path=OUT/info.value.suggested_filename;info.value.save_as(path);doc=ezdxf.readfile(path);audit=doc.audit();assert not audit.errors and not audit.fixes
     assert doc.header['$INSUNITS']==4
     space=doc.modelspace();profile_entity=list(space.query('LWPOLYLINE'))[0];assert profile_entity.closed
     assert len(profile_entity)==len(g['points']) and all(math.dist(a,b)<1e-8 for a,b in zip(profile_entity.get_points('xy'),g['points']))
     assert len(list(space.query('CIRCLE[layer=="BORE"]')))==0
     outer=list(space.query('CIRCLE[layer=="OUTER"]'));assert len(outer)==(1 if family=='internal'else 0)
     if outer:assert abs(outer[0].dxf.radius-g['outerRadius'])<1e-8
     assert len(space)==((10 if reference else 2)if family=='internal'else(9 if reference else 1))
    with page.expect_download()as info:page.click('#svg')
    path=OUT/info.value.suggested_filename;info.value.save_as(path);svg=path.read_text(encoding='utf-8');assert f'data-family="{family}"'in svg and 'NaN'not in svg and 'Infinity'not in svg
    with page.expect_download()as info:page.click('#instructionsDownload')
    path=OUT/info.value.suggested_filename;info.value.save_as(path);instructions=path.read_text(encoding='utf-8');assert '{width}'not in instructions
    if family=='rack':assert 'sem rotação' in instructions
    else:assert 'OUTER e PROFILE'in instructions
   page.screenshot(path=str(OUT/f'gear-{family}.png'),full_page=True)
  # Language, responsive layout and persistence for every family, not only the legacy external gear.
  translations=page.evaluate('GearTranslations')
  for code,values in translations.items():
   assert values.keys()==translations['pt-BR'].keys()
   for key,value in values.items():assert set(re.findall(r'\{(\w+)\}',value))==set(re.findall(r'\{(\w+)\}',translations['pt-BR'][key])),(code,key)
   page.click('#languageButton');page.locator(f'[data-language="{code}"]').click()
   for family in ['rack','internal']:
    page.select_option('#family',family);assert page.locator('#error').is_hidden()
    for width in [1440,768,390,320]:
     page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(code,family,width)
  page.select_option('#family','rack');page.fill('#baseHeight','7');page.locator('#baseHeight').blur();page.reload();page.wait_for_function('GearApp.getState()');assert page.locator('#family').input_value()=='rack' and page.locator('#baseHeight').input_value()=='7'
  page.select_option('#family','internal');page.fill('#teeth','20');page.locator('#teeth').blur();assert page.locator('#download').is_disabled() and page.locator('#drawing svg').count()==0
  page.click('#example');assert page.locator('#download').is_enabled();page.click('#themeToggle');page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'gear-internal-mobile.png'),full_page=True)
  assert not errors,errors
  print(f'PASS: {count} rack/ring profiles; independent pitch intersections, internal involute and fillet tangency; boundary cases; audited actual DXF/SVG/TXT downloads; 12 languages x 2 families x 4 widths; persistence.')
  browser.close()
finally:server.shutdown()
