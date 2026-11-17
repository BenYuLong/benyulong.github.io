import { validateConfig } from './can-config.mjs';
import { resolveTimingSelection } from './can-selection.mjs';
import { loadReverseTiming } from './can-reverse.mjs';
import { PRESETS } from './can-presets.mjs';
import { validateTimings } from './can-timing.mjs';
import { renderResult, renderPair, copyText } from './can-results.mjs';
const form=document.querySelector('#timing-form');
const mode=document.querySelector('#mode'),status=document.querySelector('#status'),results=document.querySelector('#results');
const storageKey='CanBitTimingTool:v1';
const fieldKeys=['bitrateKbps','samplePoint','sjw','sampleMin','sampleMax','prescalerMin','prescalerMax','prescalerStep','seg1Min','seg1Max','seg2Min','seg2Max'];
let worker,previousMode=mode.value,modeValues={},selectedTimings={};
const fields=phase=>document.querySelector(`#${phase}-fields`);
const active=()=>mode.value==='fd'?['nominal','data']:['nominal'];
const title=phase=>phase==='data'?'数据段':mode.value==='classic'?'经典 CAN':'仲裁段';
const inputs=phase=>[...fields(phase).querySelectorAll('[data-key]')];
const preset=phase=>fields(phase).querySelector('[data-preset]');
function phaseValues(phase){return Object.fromEntries(inputs(phase).map(input=>[input.dataset.key,input.value]));}
function restorePhase(phase,values){for(const input of inputs(phase)){const value=values?.[input.dataset.key];if(typeof value==='string'&&value.length<=40)input.value=value;}}
function clearErrors(){for(const input of form.querySelectorAll('[aria-invalid]')){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}}
function showError(error,phase){
 const id={clockMHz:'clock',maxError:'error',limit:'limit',sortBy:'sort'}[error.field];
 const input=id?document.getElementById(id):fields(phase).querySelector(`[data-key="${fieldKeys.includes(error.field)?error.field:''}"]`);
 status.textContent=`${title(phase)}：${error.message}`;
 if(input){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','status');input.focus();}
}
function snapshot(){return {version:1,settings:Object.fromEntries(['mode','clock','error','sort','limit'].map(id=>[id,document.getElementById(id).value])),phases:{nominal:phaseValues('nominal'),data:phaseValues('data')},presets:{nominal:preset('nominal').value,data:preset('data').value},modes:modeValues};}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(snapshot()));return true;}catch{return false;}}
function restore(raw){
 const saved=validateConfig(raw);
 for(const [id,value] of Object.entries(saved.settings))document.getElementById(id).value=value;
 for(const phase of ['nominal','data']){restorePhase(phase,saved.phases[phase]);preset(phase).value=saved.presets[phase];}
 modeValues=saved.modes;previousMode=mode.value;applyMode();
}
function invalidate(clearSelection=true){if(clearSelection)selectedTimings={};worker?.terminate();worker=null;results.replaceChildren();clearErrors();status.textContent='参数已更新，请重新计算。';}
function applyMode(){for(const phase of ['nominal','data']){const enabled=active().includes(phase);fields(phase).hidden=!enabled;fields(phase).disabled=!enabled;}for(const el of fields('nominal').querySelectorAll('[data-phase-title]'))el.textContent=mode.value==='classic'?'经典 CAN':'仲裁段';}
function applyPreset(phase,name){if(!Object.hasOwn(PRESETS,name))return;for(const [key,value] of Object.entries(PRESETS[name]))fields(phase).querySelector(`[data-key="${key}"]`).value=value;}
mode.addEventListener('change',()=>{
 modeValues[previousMode]={values:phaseValues('nominal'),preset:preset('nominal').value};
 const saved=modeValues[mode.value];
 if(saved){restorePhase('nominal',saved.values);preset('nominal').value=saved.preset;}
 else{preset('nominal').value=mode.value==='classic'?'classic':'nominal';applyPreset('nominal',preset('nominal').value);}
 previousMode=mode.value;applyMode();invalidate();save();
});
form.addEventListener('input',event=>{invalidate(!['sort','limit'].includes(event.target.id));const key=event.target.dataset.key;if(key&&['prescalerMin','prescalerMax','prescalerStep','seg1Min','seg1Max','seg2Min','seg2Max','sjw','sampleMin','sampleMax'].includes(key))preset(event.target.closest('fieldset').id.split('-')[0]).value='custom';save();});
form.addEventListener('change',event=>{if(['sort','limit'].includes(event.target.id)){save();form.requestSubmit();return;}if(event.target.dataset.preset){applyPreset(event.target.dataset.preset,event.target.value);invalidate();status.textContent='已应用范围预设（含 SJW 与采样点筛选）；保留时钟、目标波特率和目标采样点。';save();}});
form.addEventListener('reset',()=>{invalidate();setTimeout(()=>{modeValues={};previousMode=mode.value;applyMode();try{localStorage.removeItem(storageKey);}catch{}const url=new URL(location.href);url.searchParams.delete('config');history.replaceState(null,'',url);document.querySelector('#share-output').replaceChildren();status.textContent='已重置正向计算参数，并清除其保存配置；反算参数保持不变。';},0);});
form.addEventListener('invalid',event=>{event.target.setAttribute('aria-invalid','true');event.target.setAttribute('aria-describedby','status');status.textContent='请检查标记的输入项：必填数值需在允许范围内。';},true);
document.querySelector('#share').addEventListener('click',async event=>{const url=new URL(location.href);url.searchParams.set('config',JSON.stringify(snapshot()));await copyText(url.href,event.currentTarget,document.querySelector('#share-output'));status.textContent='分享链接包含当前参数，打开后可直接恢复配置。';});
form.addEventListener('submit',event=>{
 event.preventDefault();invalidate(false);if(!form.reportValidity())return;
 const requests=active().map(phase=>({phase,options:{clockMHz:Number(document.querySelector('#clock').value),maxError:Number(document.querySelector('#error').value),limit:Number(document.querySelector('#limit').value),sortBy:document.querySelector('#sort').value,...Object.fromEntries(inputs(phase).map(input=>[input.dataset.key,Number(input.value)]))}}));
 for(const request of requests){try{validateTimings(request.options);}catch(error){showError(error,request.phase);return;}}
 if(mode.value==='fd'&&requests[1].options.bitrateKbps<requests[0].options.bitrateKbps){showError({message:'数据段目标波特率不能低于仲裁段。',field:'bitrateKbps'},'data');return;}
 save();status.textContent='正在计算…';
 try{const currentWorker=new Worker(new URL('./can-worker.mjs',import.meta.url),{type:'module'});worker=currentWorker;
 currentWorker.onmessage=({data})=>{if(worker!==currentWorker)return;currentWorker.terminate();worker=null;if(data.error){showError({message:data.error,field:data.field},data.phase);return;}const previousSelections=selectedTimings,selected={},notices=[],options=Object.fromEntries(requests.map(r=>[r.phase,r.options]));
 selectedTimings=selected;
 const pair=document.createElement('div');
 const updatePair=()=>{if(mode.value==='fd')pair.replaceChildren(renderPair(selected,options));};
 for(const {phase,rows,suggestion} of data.results){
  if(resolveTimingSelection(rows,previousSelections[phase]).missing)notices.push(`${title(phase)}原选方案未出现在当前展示范围内，${rows.length?'已改选当前第一项':'当前无候选方案'}。`);
  results.append(renderResult(title(phase),rows,suggestion,options[phase],row=>{selected[phase]=row;updatePair();},(row,index)=>loadReverseTiming(row,options[phase],`${title(phase)} · 方案 ${index}`),previousSelections[phase]));
 }
 if(mode.value==='fd'){updatePair();results.prepend(pair);} status.textContent='计算完成。'+notices.join('')+'修改参数后请重新计算。';};
 currentWorker.onerror=()=>{if(worker!==currentWorker)return;currentWorker.terminate();worker=null;status.textContent='计算模块加载失败，请刷新页面重试。';};currentWorker.postMessage(requests);
 }catch{status.textContent='浏览器无法启动计算模块，请使用支持 Web Worker 的现代浏览器。';}
});
applyMode();
try{const shared=new URL(location.href).searchParams.get('config'),stored=shared??localStorage.getItem(storageKey);if(stored){if(stored.length>20000)throw new Error('配置过长');restore(JSON.parse(stored));
 if(shared!==null){
  if(save()){const url=new URL(location.href);url.searchParams.delete('config');history.replaceState(null,'',url);status.textContent='已从分享链接恢复并保存参数，请点击计算。后续刷新将恢复最新修改。';}
  else status.textContent='已从分享链接恢复参数，请点击计算。浏览器存储不可用，刷新将重新载入分享参数。';
 }else status.textContent='已恢复上次参数，请点击计算。';}}catch{status.textContent='保存或分享的参数无法恢复，已使用默认设置。';}
