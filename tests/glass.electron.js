const {app,BrowserWindow}=require('electron');
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert').strict;
const output=path.resolve(__dirname,'../.test-output/glass');
fs.mkdirSync(output,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'pofi-glass-check-')));
const entry=path.resolve(__dirname,'../elect.js'),Module=require('module'),original=Module._load,electron=require('electron');
Module._load=function(request,parent,...args){
 if(request==='electron'&&parent.filename===entry)return {...electron,BrowserWindow:class extends BrowserWindow{
  constructor(options){super({...options,show:false,webPreferences:{...options.webPreferences,offscreen:true,backgroundThrottling:false}});this.webContents.setAudioMuted(true);}
  show(){}focus(){}
 }};return original.call(this,request,parent,...args);
};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=setTimeout(()=>{console.error('Glass check timed out');app.exit(1);},60000);
app.on('web-contents-created',(_event,contents)=>contents.once('did-finish-load',async()=>{
 try{
  const evaluate=code=>contents.executeJavaScript(`(async()=>(${code}))()`);
  for(let i=0;i<100;i++){if(await evaluate(`Boolean(document.querySelector('.timer-digits'))`))break;await delay(50);}
  const commit=(key,value)=>evaluate(`document.querySelector('#app').__vue_app__.config.globalProperties.$store.commit('${key}',${JSON.stringify(value)})`);
  const owner=BrowserWindow.fromWebContents(contents);
  for(const theme of ['warm','night','garden']){
   await commit('setTheme',theme);await commit('setLiquidGlass',true);await delay(450);
   for(const mode of ['scene','youtube','video']){
    await commit('setBackgroundMode',mode);await delay(200);
    const optics=await evaluate(`(()=>{const card=document.querySelector('.focus-space'),warp=card.querySelector('.pofi-glass-warp');return {mode:document.documentElement.dataset.glassOptics,warp:!!warp,filter:warp&&getComputedStyle(warp).filter,textFilter:getComputedStyle(document.querySelector('.timer-digits')).filter,scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,filters:document.querySelectorAll('[data-pofi-glass-filters] filter').length};})()`);
    assert.equal(optics.mode,'refractive');assert.equal(optics.warp,true);assert.match(optics.filter,/url/);assert.equal(optics.textFilter,'none');assert.equal(optics.scroll,false);assert.ok(optics.filters>0);
   }
   await commit('setBackgroundMode','scene');await delay(300);
   const point=await evaluate(`(()=>{const r=document.querySelector('[data-testid="timer-start"]').getBoundingClientRect();return {x:Math.round(r.left+r.width*.8),y:Math.round(r.top+r.height*.3)};})()`);
   const appearance=()=>evaluate(`[...document.querySelectorAll('.pofi-glass-surface')].map(el=>{const c=getComputedStyle(el);return [c.transform,c.filter,c.backgroundColor,c.color,c.boxShadow,getComputedStyle(el,'::before').backgroundImage,el.getAttribute('style')];})`);
   const before=await appearance();
   contents.sendInputEvent({type:'mouseMove',...point});await delay(200);
   assert.deepEqual(await appearance(),before,'Glass must stay static on hover');
   contents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});await delay(100);
   assert.deepEqual(await appearance(),before,'Glass must stay static while pressed');
   contents.sendInputEvent({type:'mouseMove',x:1,y:1});
   contents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:1,y:1});
   fs.writeFileSync(path.join(output,`glass-refractive-${theme}.png`),(await contents.capturePage()).toPNG());
   assert.equal(await evaluate(`document.querySelector('[data-testid="timer-start"]').style.getPropertyValue('--glass-x')`),'');
   await commit('setLiquidGlass',false);await delay(100);
   assert.equal(await evaluate(`document.querySelectorAll('.pofi-glass-warp,[data-pofi-glass-filters]').length`),0,JSON.stringify(await evaluate(`[...document.querySelectorAll('.pofi-glass-warp,[data-pofi-glass-filters]')].map(el=>({tag:el.tagName,classes:el.getAttribute('class'),parent:el.parentElement?.getAttribute('class')}))`)));
  }
  await commit('setLiquidGlass',true);await delay(250);
  await commit('setGlassDark',true);await delay(250);
  assert.equal(await evaluate(`document.documentElement.dataset.glassDark`),'true');
  assert.equal(await evaluate(`(await window.electronAPI.initializeStorage({})).liquid_glass_dark`),'true');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.focus-space')).color`),'rgb(246, 246, 247)');
  fs.writeFileSync(path.join(output,'glass-dark-garden.png'),(await contents.capturePage()).toPNG());
  await commit('setGlassDark',false);await delay(150);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.focus-space')).color`),'rgb(51, 67, 46)');
  owner.setSize(320,340);await delay(250);
  fs.writeFileSync(path.join(output,'glass-refractive-compact.png'),(await contents.capturePage()).toPNG());
  await evaluate(`window.electronAPI.setDockMode(true)`);await delay(250);
  assert.equal(await evaluate(`document.querySelectorAll('.focus-space>.pofi-glass-warp').length`),0);
  assert.equal(await evaluate(`!!document.querySelector('.dock-mode .app-layout>.pofi-glass-warp')`),true);
  fs.writeFileSync(path.join(output,'glass-refractive-dock.png'),(await contents.capturePage()).toPNG());
  await evaluate(`window.electronAPI.setDockMode(false)`);await delay(200);
  assert.equal(await evaluate(`!!document.querySelector('.focus-space>.pofi-glass-warp')`),true);
  owner.setSize(960,640);await delay(250);
  await evaluate(`(()=>{document.querySelector('.lofi-shell').__vueParentComponent.proxy.controller.player.pauseVideo();return true;})()`);await delay(300);
  await evaluate(`(()=>{document.querySelector('.scene-art').style.backgroundImage='repeating-linear-gradient(90deg,transparent 0 22px,#055 22px 25px),repeating-linear-gradient(0deg,#f6e7be 0 22px,#055 22px 25px)';})()`);
  await delay(400);
  const rect=await evaluate(`(()=>{const r=document.querySelector('.focus-space').getBoundingClientRect();return{x:Math.floor(r.x),y:Math.floor(r.y),width:Math.floor(r.width),height:Math.floor(r.height)};})()`);
  const refracted=await contents.capturePage(rect);
  const filter=await evaluate(`document.querySelector('.focus-space>.pofi-glass-warp').style.filter`);
  await evaluate(`document.querySelector('.focus-space>.pofi-glass-warp').style.filter='none'`);await delay(150);
  const flat=await contents.capturePage(rect),a=refracted.toBitmap(),b=flat.toBitmap(),size=refracted.getSize();
  let edgeChanges=0,centerChanges=0;
  for(let y=3;y<size.height-3;y++)for(let x=3;x<size.width-3;x++){
   const i=(y*size.width+x)*4,diff=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
   if(diff<18)continue;
   if(Math.min(x,y,size.width-x,size.height-y)<24)edgeChanges++;else centerChanges++;
  }
  fs.writeFileSync(path.join(output,'glass-optical-flat.png'),flat.toPNG());
  console.log('Optical pixel comparison:',{edgeChanges,centerChanges});
  fs.writeFileSync(path.join(output,'glass-optical-grid.png'),refracted.toPNG());
  assert.ok(edgeChanges>40,'The actual background must bend, not only tint or blur');
  assert.equal(centerChanges,0,'The optical layer must leave its center and text unchanged');
  await evaluate(`document.querySelector('.focus-space>.pofi-glass-warp').style.filter=${JSON.stringify(filter)}`);
  console.log('PASS: real edge refraction, sharp center/text, no hover/press/pointer effects, cleanup, 3 themes/3 backgrounds, compact/dock');
  clearTimeout(timeout);app.exit(0);
 }catch(error){console.error(error);clearTimeout(timeout);app.exit(1);}
}));
require(entry);
