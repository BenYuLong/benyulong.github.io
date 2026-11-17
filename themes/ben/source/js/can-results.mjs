const number=(n,digits=3)=>Number(n.toFixed(digits)).toLocaleString('zh-CN',{maximumFractionDigits:digits});
export async function copyText(text,button,container){
 try{await navigator.clipboard.writeText(text);button.textContent='已复制';}
 catch{let output=container.querySelector('.copy-output');if(!output){output=document.createElement('textarea');output.readOnly=true;output.className='copy-output';output.setAttribute('aria-label','复制内容');container.append(output);}output.value=text;output.hidden=false;output.focus();output.select();button.textContent='请手动复制下方内容';}
}
export function renderResult(title,rows,diagnosis,options){
 const section=document.createElement('section');section.className='result-section';
 const heading=document.createElement('h2');heading.textContent=`${title} · 展示 ${rows.length} 个候选方案`;section.append(heading);
 if(!rows.length){const p=document.createElement('p');p.className='tool-message';p.textContent=diagnosis||'当前范围内没有满足条件的方案。';section.append(p);return section;}
 const r=rows[0],summary=document.createElement('div');summary.className='best-result';
 summary.innerHTML=`<span class="eyebrow">当前排序首选 · ${title}</span><div class="best-metrics"><div><strong>${number(r.bitrate/1000,6)}</strong><span>实际波特率 kbit/s</span></div><div><strong>${number(r.samplePoint,6)}%</strong><span>实际采样点</span></div><div><strong>${number(r.bitrateError,6)}%</strong><span>波特率误差</span></div></div><div class="bit-diagram" aria-label="位时序示意图，长度仅供示意"><span style="flex:1">Sync</span><span style="flex:${r.seg1}">TSEG1 · ${r.seg1}</span><span style="flex:${r.seg2}">TSEG2 · ${r.seg2}</span></div><p class="field-help">Sync 1 TQ → TSEG1 ${r.seg1} TQ → 采样点 → TSEG2 ${r.seg2} TQ · 总计 ${r.totalTq} TQ</p>`;
 section.append(summary);
 const wrap=document.createElement('div');wrap.className='results-table';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',`${title}候选参数，可横向滚动`);
 const columns=['#','Prescaler','TSEG1','TSEG2','SJW','总 TQ','实际 kbit/s','波特率误差 %','采样点 %','采样点偏差 pp','TQ ns','位时间 ns','操作'];
 wrap.innerHTML=`<table><caption>按当前排序展示最多 ${options.limit} 项；保留每个 Prescaler / 总 TQ 组合的最优采样点分割。</caption><thead><tr>${columns.map(s=>`<th scope="col">${s}</th>`).join('')}</tr></thead><tbody>${rows.map((v,i)=>`<tr>${[i+1,v.prescaler,v.seg1,v.seg2,v.sjw,v.totalTq,number(v.bitrate/1000,6),number(v.bitrateError,6),number(v.samplePoint,6),number(v.sampleError,6),number(v.tqNs),number(v.bitTimeNs)].map(x=>`<td>${x}</td>`).join('')}<td><button type="button" class="row-copy" aria-label="复制${title}方案 ${i+1}">复制</button></td></tr>`).join('')}</tbody></table>`;
 const header='Phase\tClock_MHz\tTarget_kbit_s\tPrescaler\tTSEG1\tTSEG2\tSJW\tTotal_TQ\tBitrate_bps\tBitrate_error_percent\tSamplePoint_percent\tSample_error_pp\tTQ_ns\tBit_ns';
 const rowText=v=>[title,options.clockMHz,options.bitrateKbps,v.prescaler,v.seg1,v.seg2,v.sjw,v.totalTq,v.bitrate,v.bitrateError,v.samplePoint,v.sampleError,v.tqNs,v.bitTimeNs].join('\t');
 [...wrap.querySelectorAll('.row-copy')].forEach((button,i)=>button.addEventListener('click',()=>copyText(header+'\n'+rowText(rows[i]),button,section)));
 section.append(wrap);
 const button=document.createElement('button');button.type='button';button.className='copy-button';button.textContent='复制全部展示方案（TSV）';button.addEventListener('click',()=>copyText([header,...rows.map(rowText)].join('\n'),button,section));section.append(button);
 return section;
}
