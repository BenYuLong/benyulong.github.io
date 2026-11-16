const form=document.querySelector('#timing-form');
const mode=document.querySelector('#mode'),status=document.querySelector('#status'),results=document.querySelector('#results');
const presets={classic:{prescalerMax:1024,seg1Max:16,seg2Max:8},nominal:{prescalerMax:512,seg1Max:256,seg2Max:128},data:{prescalerMax:32,seg1Max:32,seg2Max:16}};
let worker;
const fields=phase=>document.querySelector(`#${phase}-fields`);
const active=()=>mode.value==='brs'?['nominal','data']:[mode.value==='data'?'data':'nominal'];
function invalidate(){worker?.terminate();worker=null;results.replaceChildren();status.textContent='参数已更新，请重新计算。';}
function applyMode(){for(const phase of ['nominal','data']){const enabled=active().includes(phase);fields(phase).hidden=!enabled;fields(phase).disabled=!enabled;}}
function applyPreset(phase,name){if(!presets[name])return;const values={...presets[name],prescalerMin:1,prescalerStep:1,seg1Min:1,seg2Min:1};for(const [key,value] of Object.entries(values))fields(phase).querySelector(`[data-key="${key}"]`).value=value;}
mode.addEventListener('change',()=>{applyMode();if(mode.value!=='data'){const preset=fields('nominal').querySelector('[data-preset]');preset.value=mode.value==='classic'?'classic':'nominal';applyPreset('nominal',preset.value);}});
form.addEventListener('input',event=>{invalidate();const key=event.target.dataset.key;if(key && /^(prescaler|seg[12])/.test(key)){event.target.closest('fieldset').querySelector('[data-preset]').value='custom';}});
form.addEventListener('change',event=>{if(event.target.dataset.preset){applyPreset(event.target.dataset.preset,event.target.value);invalidate();}});
form.addEventListener('reset',()=>{invalidate();setTimeout(()=>{applyMode();status.textContent='已恢复默认参数。';},0);});
const number=(n,digits=3)=>Number(n.toFixed(digits)).toLocaleString('zh-CN',{maximumFractionDigits:digits});
function render(phase,rows){
 const section=document.createElement('section');section.className='result-section';
 const title=phase==='data'?'数据段':mode.value==='classic'?'经典 CAN':'仲裁段';
 const heading=document.createElement('h2');heading.textContent=`${title} · ${rows.length} 个候选方案`;section.append(heading);
 if(!rows.length){const p=document.createElement('p');p.className='tool-message';p.textContent='当前范围内没有满足条件的方案。可检查时钟、放宽波特率误差或采样点范围，或调整 TSEG / Prescaler 范围。';section.append(p);results.append(section);return;}
 const r=rows[0];
 const summary=document.createElement('div');summary.className='best-result';
 summary.innerHTML=`<span class="eyebrow">排序首选 · ${title}</span><div class="best-metrics"><div><strong>${number(r.bitrate/1000,6)}</strong><span>实际波特率 kbit/s</span></div><div><strong>${number(r.samplePoint,6)}%</strong><span>实际采样点</span></div><div><strong>${number(r.bitrateError,6)}%</strong><span>波特率误差</span></div></div><div class="bit-diagram" aria-label="位时序示意图"><span style="flex:${1}">Sync</span><span style="flex:${r.seg1}">TSEG1 · ${r.seg1}</span><span style="flex:${r.seg2}">TSEG2 · ${r.seg2}</span></div><p class="field-help">Sync 1 TQ → TSEG1 ${r.seg1} TQ → 采样点 → TSEG2 ${r.seg2} TQ · 总计 ${r.totalTq} TQ</p>`;
 section.append(summary);
 const wrap=document.createElement('div');wrap.className='results-table';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',`${title}候选参数，可横向滚动`);
 wrap.innerHTML=`<table><caption>满足范围的候选方案，最多显示 20 项</caption><thead><tr>${['#','Prescaler','TSEG1','TSEG2','SJW','总 TQ','实际 kbit/s','波特率误差 %','采样点 %','采样点偏差 pp','TQ ns','位时间 ns'].map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.map((v,i)=>`<tr>${[i+1,v.prescaler,v.seg1,v.seg2,v.sjw,v.totalTq,number(v.bitrate/1000,6),number(v.bitrateError,6),number(v.samplePoint,6),number(v.sampleError,6),number(v.tqNs),number(v.bitTimeNs)].map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 section.append(wrap);
 const button=document.createElement('button');button.type='button';button.className='copy-button';button.textContent='复制候选方案（TSV）';
 const output=document.createElement('textarea');output.readOnly=true;output.className='copy-output';output.hidden=true;output.setAttribute('aria-label',`${title}导出参数`);
 const text=['Prescaler\tTSEG1\tTSEG2\tSJW\tBitrate_bps\tSamplePoint_percent\tTQ_ns',...rows.map(v=>[v.prescaler,v.seg1,v.seg2,v.sjw,v.bitrate,v.samplePoint,v.tqNs].join('\t'))].join('\n');
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text);button.textContent='已复制';}catch{output.value=text;output.hidden=false;output.focus();output.select();button.textContent='请手动复制下方参数';}});
 section.append(button,output);results.append(section);
}
form.addEventListener('submit',event=>{
 event.preventDefault();invalidate();if(!form.reportValidity())return;
 const requests=active().map(phase=>({phase,options:{clockMHz:Number(document.querySelector('#clock').value),maxError:Number(document.querySelector('#error').value),...Object.fromEntries([...fields(phase).querySelectorAll('[data-key]')].map(input=>[input.dataset.key,Number(input.value)]))}}));
 if(mode.value==='brs'&&requests[1].options.bitrateKbps<requests[0].options.bitrateKbps){status.textContent='BRS 数据段目标波特率不能低于仲裁段。';return;}
 status.textContent='正在计算…';
 try{worker=new Worker(new URL('./can-worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{worker.terminate();worker=null;if(data.error){status.textContent=data.error;return;}for(const {phase,rows} of data.results)render(phase,rows);status.textContent='计算完成。修改参数后请重新计算。';};
 worker.onerror=()=>{worker?.terminate();worker=null;status.textContent='计算模块加载失败，请刷新页面重试。';};
 worker.postMessage(requests);
 }catch{status.textContent='浏览器无法启动计算模块，请使用支持 Web Worker 的现代浏览器。';}
});
applyMode();
