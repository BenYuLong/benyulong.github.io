import { formatError } from './can-format.mjs';
import { resolveTimingSelection } from './can-selection.mjs';
const number=(n,digits=3)=>Number(n.toFixed(digits)).toLocaleString('zh-CN',{maximumFractionDigits:digits});
const copyStates=new WeakMap();
export async function copyText(text,button,container){
 let state=copyStates.get(button);
 if(!state){state={label:button.textContent,aria:button.getAttribute('aria-label'),request:0};copyStates.set(button,state);}
 clearTimeout(state.timer);const request=++state.request;
 const feedback=label=>{button.textContent=label;if(state.aria!==null)button.setAttribute('aria-label',label);};
 try{await navigator.clipboard.writeText(text);if(request!==state.request)return;const output=container.querySelector('.copy-output');if(output){output.hidden=true;output.value='';}feedback('已复制');}
 catch{if(request!==state.request)return;let output=container.querySelector('.copy-output');if(!output){output=document.createElement('textarea');output.readOnly=true;output.className='copy-output';output.setAttribute('aria-label','复制内容');container.append(output);}output.value=text;output.hidden=false;output.focus();output.select();feedback('请手动复制下方内容');}
 state.timer=setTimeout(()=>{button.textContent=state.label;if(state.aria!==null)button.setAttribute('aria-label',state.aria);},2000);
}
export function renderResult(title,rows,suggestion,options,onSelect=()=>{},onReverse=()=>{},previous=null){
 const section=document.createElement('section');section.className='result-section';
 const heading=document.createElement('h2');heading.textContent=`${title} · 展示 ${rows.length} 个候选方案`;section.append(heading);
 if(!rows.length){const p=document.createElement('p');p.className='tool-message';p.textContent=suggestion?.message||'当前范围内没有满足条件的方案。';section.append(p);if(suggestion?.example){section.append(renderTimingSummary('放宽限制后的示例（未应用）',suggestion.example));const note=document.createElement('p');note.className='field-help';note.textContent='以上仅供调整参数参考，不属于当前筛选条件下的候选；输入限制未改变。';section.append(note);}return section;}
 const summary=document.createElement('div');section.append(summary);
 const wrap=document.createElement('div');wrap.className='results-table';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',`${title}候选参数，可横向滚动`);
 const columns=['#','Prescaler','TSEG1','TSEG2','SJW','总 TQ','实际 kbit/s','波特率误差 %','采样点 %','采样点偏差 pp','TQ ns','位时间 ns','操作'];
 wrap.innerHTML=`<table><caption>按当前排序展示最多 ${options.limit} 项；保留每个 Prescaler / 总 TQ 组合的最优采样点分割。</caption><thead><tr>${columns.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.map((v,i)=>`<tr>${[i+1,v.prescaler,v.seg1,v.seg2,v.sjw,v.totalTq,number(v.bitrate/1000,6),formatError(v.bitrateError),number(v.samplePoint,6),formatError(v.sampleError),number(v.tqNs),number(v.bitTimeNs)].map(x=>`<td>${x}</td>`).join('')}<td><label class="candidate-choice"><input type="radio" name="candidate-${title}" value="${i}" aria-label="选择${title}方案 ${i+1}">选择</label><button type="button" class="row-copy" aria-label="复制${title}方案 ${i+1}">复制</button><button type="button" class="row-reverse" aria-label="反算${title}方案 ${i+1}">反算</button></td></tr>`).join('')}</tbody></table>`;
 const exportRows=values=>timingsTsv(values.map(row=>({phase:title,options,row})));
 [...wrap.querySelectorAll('.row-copy')].forEach((button,i)=>button.addEventListener('click',()=>copyText(exportRows([rows[i]]),button,section)));
 [...wrap.querySelectorAll('.row-reverse')].forEach((button,i)=>button.addEventListener('click',()=>{select(i);onReverse(rows[i],i+1);}));
 const radios=[...wrap.querySelectorAll('input[type="radio"]')];
 function select(index){
  radios[index].checked=true;
  [...wrap.querySelectorAll('tbody tr')].forEach((tr,i)=>tr.classList.toggle('selected-candidate',i===index));
  summary.replaceChildren(renderTimingSummary(`${title} · 已选方案 ${index+1}`,rows[index]));onSelect(rows[index]);
 }
 radios.forEach((radio,i)=>radio.addEventListener('change',()=>select(i)));
 [...wrap.querySelectorAll('tbody tr')].forEach((tr,i)=>tr.addEventListener('click',event=>{if(!event.target.closest('button,input,label'))select(i);}));
 select(resolveTimingSelection(rows,previous).index);
 section.append(wrap);
 const button=document.createElement('button');button.type='button';button.className='copy-button';button.textContent='复制全部展示方案（TSV）';button.addEventListener('click',()=>copyText(exportRows(rows),button,section));section.append(button);
 return section;
}

export function renderTimingSummary(title,r){
 const summary=document.createElement('div');summary.className='best-result';
 const heading=document.createElement('span');heading.className='eyebrow';heading.textContent=title;summary.append(heading);
 const body=document.createElement('div');
 body.innerHTML=`<div class="best-metrics"><div><strong>${number(r.bitrate/1000,6)}</strong><span>实际波特率 kbit/s</span></div><div><strong>${number(r.samplePoint,6)}%</strong><span>实际采样点</span></div><div><strong>${number(r.tqNs,6)}</strong><span>TQ ns</span></div></div><div class="timing-visual"><div class="bit-diagram" role="img" aria-label="位时序比例：Sync 1 TQ，TSEG1 ${r.seg1} TQ，TSEG2 ${r.seg2} TQ，采样点 ${number(r.samplePoint,6)}%"><span class="sync-segment" style="width:${100/r.totalTq}%"></span><span class="seg1-segment" style="width:${r.seg1/r.totalTq*100}%"></span><span class="seg2-segment" style="width:${r.seg2/r.totalTq*100}%"></span><i class="sampling-marker" style="left:${r.samplePoint}%" aria-hidden="true"></i></div><div class="timing-legend" aria-hidden="true"><span>Sync · 1 TQ</span><span>TSEG1 · ${r.seg1} TQ</span><span>TSEG2 · ${r.seg2} TQ</span><span>采样点 ${number(r.samplePoint,6)}%</span></div></div><p class="field-help">Prescaler ${r.prescaler} · TSEG1 ${r.seg1} · TSEG2 ${r.seg2} · 总计 ${r.totalTq} TQ<br>SJW ${r.sjw} TQ / ${number(r.sjw*r.tqNs,6)} ns · 位时间 ${number(r.bitTimeNs,6)} ns${r.bitrateError===undefined?'':` · 波特率误差 ${formatError(r.bitrateError)}%`}${r.sampleError===undefined?'':` · 采样点偏差 ${formatError(r.sampleError)} pp`}</p>`;
 summary.append(body);
 if(r.targetBitrateKbps!==undefined||r.targetSamplePoint!==undefined){const targets=document.createElement('p');targets.className='field-help';targets.textContent=[r.targetBitrateKbps===undefined?'':`目标波特率 ${number(r.targetBitrateKbps,6)} kbit/s`,r.targetSamplePoint===undefined?'':`目标采样点 ${number(r.targetSamplePoint,6)}%`].filter(Boolean).join(' · ');summary.append(targets);}
 return summary;
}
export function renderPair(selected,options){
 const section=document.createElement('section');section.className='tool-panel pair-summary';
 const h=document.createElement('h2');h.textContent='CAN FD 已选双段配置';section.append(h);
 const text=document.createElement('p');text.textContent=selected.nominal&&selected.data?'两段均已选择，可一次复制完整参数。仍需核对控制器及物理总线约束。':'两段均需存在候选方案后，才能生成完整配置。';section.append(text);
 if(!selected.nominal||!selected.data)return section;
 for(const phase of ['nominal','data'])section.append(renderTimingSummary(phase==='nominal'?'仲裁段':'数据段',selected[phase]));
 if(selected.data.bitrate<selected.nominal.bitrate){const warning=document.createElement('p');warning.className='tool-message';warning.textContent='注意：已选数据段实际波特率低于仲裁段，请重新选择或调整目标及误差限制。';section.append(warning);}
 const button=document.createElement('button');button.type='button';button.className='copy-button';button.textContent='复制双段配置（TSV）';
 button.addEventListener('click',()=>copyText(timingsTsv(['nominal','data'].map(phase=>({phase,options:options[phase],row:selected[phase]}))),button,section));section.append(button);
 return section;
}

export function timingsTsv(entries){
 const header='Phase\tClock_MHz\tTarget_kbit_s\tPrescaler\tTSEG1\tTSEG2\tSJW\tTotal_TQ\tBitrate_bps\tBitrate_error_percent\tSamplePoint_percent\tSample_error_pp\tTQ_ns\tBit_ns';
 return [header,...entries.map(({phase,options,row:r})=>[phase,options.clockMHz,options.bitrateKbps,r.prescaler,r.seg1,r.seg2,r.sjw,r.totalTq,r.bitrate,r.bitrateError,r.samplePoint,r.sampleError,r.tqNs,r.bitTimeNs].join('\t'))].join('\n');
}
