import { calculateTiming } from './can-timing.mjs';
import { renderTimingSummary } from './can-results.mjs';
const form=document.querySelector('#reverse-form'),status=document.querySelector('#reverse-status'),results=document.querySelector('#reverse-results');
let sourceLabel='';
function clear(){for(const input of form.querySelectorAll('[aria-invalid]')){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}results.replaceChildren();}
form.addEventListener('input',()=>{sourceLabel='';clear();status.textContent='参数已修改，请重新反算。';});
form.addEventListener('reset',()=>{sourceLabel='';clear();status.textContent='已重置反算参数；正向计算与已选方案保持不变。';});
form.addEventListener('invalid',event=>{results.replaceChildren();event.target.setAttribute('aria-invalid','true');event.target.setAttribute('aria-describedby','reverse-status');status.textContent='请检查标记的必填数值及取值范围。';},true);
form.addEventListener('submit',event=>{
 event.preventDefault();clear();
 try{const options=Object.fromEntries([...new FormData(form)].filter(([,value])=>value!=='').map(([key,value])=>[key,Number(value)]));const row=calculateTiming(options);results.append(renderTimingSummary(sourceLabel?`来源：${sourceLabel} · 反算结果`:'已有配置 · 反算结果',row));status.textContent='反算完成。仅校验通用计数范围与 SJW ≤ TSEG2，具体控制器及总线约束请另行核对。';}
 catch(error){status.textContent=error.message;const input=form.elements.namedItem(error.field);if(input){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','reverse-status');input.focus();}}
});

export function loadReverseTiming(row,options,source){
 sourceLabel=source;
 const values={clockMHz:options.clockMHz,prescaler:row.prescaler,seg1:row.seg1,seg2:row.seg2,sjw:row.sjw,targetBitrateKbps:options.bitrateKbps,targetSamplePoint:options.samplePoint};
 for(const [key,value] of Object.entries(values))form.elements.namedItem(key).value=String(value);
 form.closest('details').open=true;
 form.requestSubmit();
 form.querySelector('button[type="submit"]').focus();
 results.scrollIntoView({block:'nearest'});
}
