"""Independent geometry/DXF verification plus browser workflows.
Run with Python, Playwright Chrome, ezdxf and shapely installed.
GEAR_TEST_DEPS may point to an isolated directory installed with pip --target.
"""
import io,json,math,os,sys,tempfile,re
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
if os.environ.get('GEAR_TEST_DEPS'):sys.path.insert(0,os.environ['GEAR_TEST_DEPS'])
import ezdxf
from shapely.geometry import Polygon,LineString,Point
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(tempfile.gettempdir())/'gear-test-output';OUT.mkdir(exist_ok=True)
DEFAULT=dict(rack='A',type='spur',hand='R',module=2,teeth=24,width=10,bore=8,beta=20,tolerance=.01)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.GearApp && GearApp.getState()')
  def select_language(code):
   page.locator('#languageButton').click();page.locator(f'[data-language="{code}"]').click();return True
  def profile(**kwargs):return page.evaluate('p=>GearGeometry.profile(p)',dict(DEFAULT,**kwargs))
  g=profile()
  assert g['rp']*2==48 and g['ra']*2==52 and g['rf']*2==43
  assert abs(g['rb']*2-48*math.cos(math.radians(20)))<1e-10
  assert g['twist']==0 and g['lead'] is None
  # Independent normal-to-transverse and lead equations.
  g=profile(type='helical',teeth=30,width=15)
  beta=math.radians(20);d=60/math.cos(beta)
  assert abs(2*g['rp']-d)<1e-10
  assert abs(g['at']-math.atan(math.tan(beta)/math.cos(beta)))<1e-10
  assert abs(g['twist']-math.degrees(30*math.tan(beta)/d))<1e-10
  assert abs(g['lead']-math.pi*d/math.tan(beta))<1e-9
  left=profile(type='helical',teeth=30,width=15,hand='L')
  assert left['points']==g['points'] and left['twist']==-g['twist']
  changed=profile(type='helical',teeth=30,width=30)
  assert changed['points']==g['points'] and changed['twist']==2*g['twist']
  # Polygon validity, radial bounds, rotational periodicity and minimum tooth boundary.
  checked=0
  for rack in 'ABCD':
   for beta in [0,10,20,35,45]:
    kind='helical' if beta else 'spur'
    zmin=profile(rack=rack,type=kind,beta=beta,teeth=24)['zmin']
    for z in [zmin,24,101]:
     g=profile(rack=rack,type=kind,beta=beta,teeth=z,bore=0)
     polygon=Polygon(g['points']);assert polygon.is_valid and polygon.exterior.is_ccw,(rack,beta,z)
     assert abs(min(math.hypot(*v) for v in g['points'])-g['rf'])<1e-8
     assert abs(max(math.hypot(*v) for v in g['points'])-g['ra'])<1e-8
     n=g['pointsPerTooth'];a=2*math.pi/z
     for j in [0,n//2,n-1]:
      x,y=g['points'][j];xx,yy=g['points'][j+n]
      assert math.hypot(xx-(x*math.cos(a)-y*math.sin(a)),yy-(x*math.sin(a)+y*math.cos(a)))<1e-8
     checked+=1
    bad=page.evaluate('p=>{try{GearGeometry.profile(p);return null}catch(e){return e.code}}',dict(DEFAULT,rack=rack,type=kind,beta=beta,teeth=zmin-1,bore=0))
    assert bad=='undercut',(rack,beta,zmin,bad)
  for module,teeth,tolerance in [(.1,18,.1),(.1,400,.001),(50,400,.001),(50,24,.1)]:
   g=profile(module=module,teeth=teeth,tolerance=tolerance,bore=0)
   assert Polygon(g['points']).is_valid
  # Check chord error against independently sampled analytic involute and rack envelope.
  for beta in [0,20,45]:
   g=profile(type='helical' if beta else 'spur',beta=beta)
   ring=Polygon(g['points']).exterior;mn=2;z=24;an=math.radians(20);cb=math.cos(math.radians(beta));rp=mn*z/(2*cb)
   at=math.atan(math.tan(an)/cb);rb=rp*math.cos(at);ra=rp+mn;rho=.38*mn;vc=-1.25*mn+rho;uc=math.pi*mn/4+vc*math.tan(an)-rho/math.cos(an)
   for i in range(1001):
    theta=-math.pi/2+i/1000*(math.pi/2-an);v=vc+rho*math.sin(theta);u=(uc+rho*math.cos(theta))/cb
    x=v*cb*math.cos(theta)/math.sin(theta);phi=(x-u)/rp-(math.pi/2-math.pi/z)
    xy=(x*math.cos(phi)-(rp+v)*math.sin(phi),x*math.sin(phi)+(rp+v)*math.cos(phi))
    assert ring.distance(Point(xy))<=.010001
    r=g['rj']+(ra-g['rj'])*i/1000;alpha=math.acos(rb/r);angle=math.pi/(2*z)+math.tan(at)-at-(math.tan(alpha)-alpha)
    assert ring.distance(Point(r*math.cos(angle),r*math.sin(angle)))<=.010001
  # Read actual downloads, not just the serializer; verify entities, units and every coordinate.
  for button,reference in [('download',False),('technical',True)]:
   with page.expect_download() as info:page.click('#'+button)
   path=OUT/info.value.suggested_filename;info.value.save_as(path)
   doc=ezdxf.readfile(path);audit=doc.audit()
   assert not audit.errors and not audit.fixes,[(e.code,e.message)for e in audit.errors+audit.fixes]
   assert doc.header['$INSUNITS']==4 and doc.dxfversion=='AC1015'
   space=doc.modelspace();polylines=list(space.query('LWPOLYLINE'));assert len(polylines)==1 and polylines[0].closed
   points=list(polylines[0].get_points('xy'));g=page.evaluate('GearApp.getState()')
   assert len(points)==len(g['points'])
   assert all(math.dist(a,b)<1e-8 for a,b in zip(points,g['points']))
   bores=list(space.query('CIRCLE[layer=="BORE"]'));assert len(bores)==1 and bores[0].dxf.radius==4
   assert len(list(space.query('TEXT')))==(5 if reference else 0)
   assert len(list(space.query('CIRCLE')))==(4 if reference else 1)
   assert len(space)==(10 if reference else 2)
  page.fill('#teeth','10');page.locator('#teeth').blur();assert page.locator('#error').is_visible() and page.locator('#download').is_disabled();assert page.locator('#drawing svg').count()==0
  for field,value in [('teeth','24.5'),('teeth',''),('module','0'),('width','0'),('bore','43')]:
   page.click('#example');page.fill('#'+field,value);page.locator('#'+field).blur();assert page.locator('#download').is_disabled(),(field,value)
  page.click('#example');page.fill('#bore','0');page.locator('#bore').blur()
  doc=ezdxf.read(io.StringIO(page.evaluate('GearGeometry.dxf(GearApp.getState())').replace('\r\n','\n')))
  assert len(list(doc.modelspace().query('CIRCLE')))==0
  page.select_option('#type','helical');page.click('#example');assert page.locator('#helixFields').is_visible()
  page.select_option('#hand','L');assert page.evaluate('GearApp.getState().twist')<0
  with page.expect_download() as info:page.click('#instructionsDownload')
  path=OUT/info.value.suggested_filename;info.value.save_as(path);text=path.read_text(encoding='utf-8');assert 'PROFILE' in text and '+Z' in text and '{twist}' not in text
  with page.expect_download() as info:page.click('#svg')
  path=OUT/info.value.suggested_filename;info.value.save_as(path);svg=path.read_text(encoding='utf-8');assert 'data-tooth-outline' in svg and 'viewBox="0 0 1000 1150"' in svg
  assert 'pt = 6.686' in svg and 'pn = 6.283' in svg and 'ha = 2 mm' in svg and 'hf = 2.5 mm' in svg
  translations=page.evaluate('GearTranslations');assert len(translations)==12
  for code,values in translations.items():
   assert values.keys()==translations['pt-BR'].keys() and all(values.values())
   for key,value in values.items():assert set(re.findall(r'\{(\w+)\}',value))==set(re.findall(r'\{(\w+)\}',translations['pt-BR'][key])),(code,key)
   select_language(code);assert page.locator('#currentFlag').evaluate('e=>e.complete && e.naturalWidth>0');assert page.locator('html').get_attribute('dir')==('rtl'if code=='ar-SA'else'ltr')
   assert page.locator('#toothDrawing svg').count()==1
   assert page.locator('#error').is_hidden() and len(page.locator('#cadSteps li').all())==4
   for width in [1440,768,390,320]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(code,width)
  select_language('pt-BR');page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(OUT/'gear-light.png'),full_page=True)
  page.click('#themeToggle');assert page.locator('html').get_attribute('data-theme')=='dark';page.reload();page.wait_for_function('GearApp.getState()')
  assert page.locator('html').get_attribute('data-theme')=='dark' and select_language('pt-BR')
  assert page.locator('#hand').input_value()=='L' and page.locator('#type').input_value()=='helical'
  page.screenshot(path=str(OUT/'gear-dark.png'),full_page=True)
  page.select_option('#zoom','2');assert page.evaluate('document.querySelector("#viewport").scrollWidth>document.querySelector("#viewport").clientWidth')
  page.select_option('#zoom','1');assert page.evaluate('document.querySelector("#viewport").scrollWidth<=document.querySelector("#viewport").clientWidth+1')
  page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'gear-mobile.png'),full_page=True)
  page.locator('#languageButton').click()
  assert page.locator('#languageMenu img').evaluate_all('imgs=>imgs.length===12 && imgs.every(e=>e.complete && e.naturalWidth>0)')
  page.keyboard.press('End');assert page.locator('[data-language="ja-JP"]').evaluate('e=>e===document.activeElement')
  page.keyboard.press('Escape');assert page.locator('#languageMenu').is_hidden()
  assert not errors,errors
  print(f'PASS: {checked} gear profiles + range extremes; analytic chord error; real DXF audit, units and coordinates; downloads; invalid input; 12 languages x 4 widths; RTL; themes and persistence.')
  browser.close()
finally:server.shutdown()
