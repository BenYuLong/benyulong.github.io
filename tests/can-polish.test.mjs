import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../themes/ben/source/js/can-config.mjs';
import { formatError } from '../themes/ben/source/js/can-format.mjs';
const phase={bitrateKbps:'500',samplePoint:'87.5',sjw:'1',sampleMin:'0',sampleMax:'100',prescalerMin:'1',prescalerMax:'1024',prescalerStep:'1',seg1Min:'1',seg1Max:'16',seg2Min:'1',seg2Max:'8'};
const config=()=>({version:1,settings:{mode:'classic',clock:'80',error:'0.5',sort:'bitrate',limit:'20'},phases:{nominal:{...phase},data:{...phase,bitrateKbps:'2000'}},presets:{nominal:'classic',data:'data'},modes:{}});
test('configuration validation is complete and never mutates input',()=>{
 const valid=config(),before=JSON.stringify(valid);assert.deepEqual(validateConfig(valid),valid);assert.equal(JSON.stringify(valid),before);
 for(const change of [s=>s.phases.data.seg1Max='oops',s=>s.phases.nominal.seg1Min='20',s=>s.settings.limit='21',s=>s.settings.clock='',s=>s.settings.clock='0x50',s=>s.modes.fd={values:{...phase,sjw:'1.5'},preset:'nominal'},s=>s.presets.data='classic',s=>delete s.phases.data]){
  const invalid=config();change(invalid);const saved=JSON.stringify(invalid);assert.throws(()=>validateConfig(invalid));assert.equal(JSON.stringify(invalid),saved);
 }
});
test('configuration validates FD rate relationship and ignores unrecognized properties',()=>{
 const fd=config();fd.settings.mode='fd';fd.phases.data.bitrateKbps='250';assert.throws(()=>validateConfig(fd));
 const c=config();c.unrecognized=1;assert.equal(validateConfig(c).unrecognized,undefined);
 delete c.presets;delete c.modes;assert.equal(validateConfig(c).presets.nominal,'custom');
});
test('tiny nonzero errors remain distinct from exact zero',()=>{
 assert.equal(formatError(0),'0');assert.equal(formatError(1e-12),'< 0.000001');assert.equal(formatError(0.0000009),'< 0.000001');assert.equal(formatError(0.000001),'0.000001');assert.equal(formatError(0.5),'0.5');
});

test('copy feedback restores the button and hides stale fallback on later success',async t=>{
 const {copyText}=await import('../themes/ben/source/js/can-results.mjs');
 t.mock.timers.enable({apis:['setTimeout']});
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 let reject=true;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async()=>{if(reject)throw new Error('denied');}}}});
 t.after(()=>{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;});
 const attrs=new Map([['aria-label','复制方案 2']]);const button={textContent:'复制',getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v)};
 const output={value:'',hidden:true,focus(){},select(){}};const container={querySelector:()=>output};
 await copyText('first',button,container);assert.equal(output.value,'first');assert.equal(output.hidden,false);assert.equal(button.textContent,'请手动复制下方内容');
 t.mock.timers.tick(2000);assert.equal(button.textContent,'复制');assert.equal(attrs.get('aria-label'),'复制方案 2');
 reject=false;await copyText('second',button,container);assert.equal(button.textContent,'已复制');assert.equal(output.hidden,true);assert.equal(output.value,'');
 t.mock.timers.tick(2000);assert.equal(button.textContent,'复制');assert.equal(attrs.get('aria-label'),'复制方案 2');
});

test('restored numeric strings normalize to browser-safe input values',()=>{
 const c=config();c.settings.clock='+80';c.phases.nominal.bitrateKbps='500.';c.phases.data.samplePoint='8e1';
 const restored=validateConfig(c);assert.equal(restored.settings.clock,'80');assert.equal(restored.phases.nominal.bitrateKbps,'500');assert.equal(restored.phases.data.samplePoint,'80');
});
