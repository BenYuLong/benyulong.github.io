/** Functional timing counts, not register encodings. No controller-specific assumptions. */
export function compareTimings(a, b) {
 return a.bitrateError-b.bitrateError || a.sampleError-b.sampleError || b.totalTq-a.totalTq || a.prescaler-b.prescaler || a.seg1-b.seg1;
}
export function timingComparator(sortBy='bitrate') {
 if(sortBy==='sample')return (a,b)=>a.sampleError-b.sampleError||compareTimings(a,b);
 if(sortBy==='tq')return (a,b)=>b.totalTq-a.totalTq||compareTimings(a,b);
 if(sortBy==='prescaler')return (a,b)=>a.prescaler-b.prescaler||compareTimings(a,b);
 return compareTimings;
}
function invalid(field,message){const error=new RangeError(message);error.field=field;throw error;}
export function validateTimings(o){
 const labels={clockMHz:'有效时钟频率',bitrateKbps:'目标波特率',samplePoint:'目标采样点',prescalerMin:'Prescaler 最小值',prescalerMax:'Prescaler 最大值',prescalerStep:'Prescaler 步长',seg1Min:'Time Seg1 最小值',seg1Max:'Time Seg1 最大值',seg2Min:'Time Seg2 最小值',seg2Max:'Time Seg2 最大值',sjw:'SJW'};
 const positive=(key,max)=>{if(!Number.isFinite(o[key])||o[key]<=0||o[key]>max)invalid(key,`${labels[key]} 必须大于 0 且不超过 ${max}`);};
 positive('clockMHz',10000);positive('bitrateKbps',1000000);positive('samplePoint',100);
 if(o.samplePoint>=100)invalid('samplePoint','目标采样点必须小于 100%');
 if(!Number.isFinite(o.maxError)||o.maxError<0||o.maxError>50)invalid('maxError','允许波特率误差必须在 0–50% 之间');
 for(const k of ['prescalerMin','prescalerMax','prescalerStep','seg1Min','seg1Max','seg2Min','seg2Max','sjw']){
  positive(k,k.startsWith('prescaler')?4096:1024);
  if(!Number.isInteger(o[k]))invalid(k,`${labels[k]} 必须是整数`);
 }
 for(const key of ['prescaler','seg1','seg2'])if(o[key+'Min']>o[key+'Max'])invalid(key+'Min',`${labels[key+'Min']}不能大于最大值`);
 const sampleMin=o.sampleMin??0,sampleMax=o.sampleMax??100;
 if(!Number.isFinite(sampleMin)||sampleMin<0||sampleMin>100)invalid('sampleMin','采样点最小值必须在 0–100% 之间');
 if(!Number.isFinite(sampleMax)||sampleMax<0||sampleMax>100)invalid('sampleMax','采样点最大值必须在 0–100% 之间');
 if(sampleMin>sampleMax)invalid('sampleMin','采样点最小值不能大于最大值');
 if(!Number.isInteger(o.limit??20)||(o.limit??20)<1||(o.limit??20)>200)invalid('limit','显示数量必须是 1–200 之间的整数');
 if(!['bitrate','sample','tq','prescaler'].includes(o.sortBy??'bitrate'))invalid('sortBy','请选择有效的排序方式');
}
// A max heap keeps only the requested best candidates. Root is the worst retained row.
function retain(heap,row,limit,compare){
 if(heap.length<limit){
  heap.push(row);let i=heap.length-1;
  while(i>0){const parent=(i-1)>>1;if(compare(heap[i],heap[parent])<=0)break;[heap[i],heap[parent]]=[heap[parent],heap[i]];i=parent;}
  return;
 }
 if(compare(row,heap[0])>=0)return;
 heap[0]=row;let i=0;
 while(true){let child=2*i+1;if(child>=heap.length)break;if(child+1<heap.length&&compare(heap[child+1],heap[child])>0)child++;if(compare(heap[child],heap[i])<=0)break;[heap[i],heap[child]]=[heap[child],heap[i]];i=child;}
}
export function findTimings(o) {
 validateTimings(o);
 const sampleMin=o.sampleMin??0,sampleMax=o.sampleMax??100;
 const limit=o.limit??20,compare=timingComparator(o.sortBy);
 const min2=Math.max(o.seg2Min,o.sjw);
 if(min2>o.seg2Max)return [];
 const clock=o.clockMHz*1e6,target=o.bitrateKbps*1000,rows=[];
 for(let p=o.prescalerMin;p<=o.prescalerMax;p+=o.prescalerStep){
  const minTotal=Math.max(1+o.seg1Min+min2,Math.ceil(clock/p/target/(1+o.maxError/100)-1e-9));
  const maxTotal=Math.min(1+o.seg1Max+o.seg2Max,Math.floor(clock/p/target/(1-o.maxError/100)+1e-9));
  for(let total=minTotal;total<=maxTotal;total++){
   const bitrate=clock/(p*total),bitrateError=Math.abs(bitrate/target-1)*100;
   if(bitrateError>o.maxError+1e-9)continue;
   const low=Math.max(min2,total-1-o.seg1Max,Math.ceil(total*(1-sampleMax/100)-1e-9)),high=Math.min(o.seg2Max,total-1-o.seg1Min,Math.floor(total*(1-sampleMin/100)+1e-9));
   if(low>high)continue;
   const ideal=total*(1-o.samplePoint/100);
   const choices=[...new Set([Math.max(low,Math.min(high,Math.floor(ideal))),Math.max(low,Math.min(high,Math.ceil(ideal)))])];
   const best=Math.min(...choices.map(b=>Math.abs((total-b)/total*100-o.samplePoint)));
   for(const b of choices){
    const samplePoint=(total-b)/total*100,sampleError=Math.abs(samplePoint-o.samplePoint);
    if(sampleError>best+1e-9)continue;
    retain(rows,{prescaler:p,seg1:total-1-b,seg2:b,sjw:o.sjw,totalTq:total,bitrate,bitrateError,samplePoint,sampleError,tqNs:p/clock*1e9,bitTimeNs:1/bitrate*1e9},limit,compare);
   }
  }
 }
 return rows.sort(compare);
}

export function diagnoseTimings(o){
 if(o.sjw>o.seg2Max)return `SJW (${o.sjw}) 大于 TSEG2 最大值 (${o.seg2Max})，请调整这两项。`;
 const relaxed=findTimings({...o,sampleMin:0,sampleMax:100,limit:1,sortBy:'bitrate'});
 if(relaxed.length)return `采样点筛选过窄。保留当前波特率误差时，放宽采样点范围可以找到方案，例如采样点 ${relaxed[0].samplePoint.toFixed(3)}%。`;
 const approximate=findTimings({...o,sampleMin:0,sampleMax:100,maxError:50,limit:1,sortBy:'bitrate'});
 if(approximate.length)return `当前波特率误差限制过严。放宽采样点及误差后可找到 ${ (approximate[0].bitrate/1000).toFixed(6) } kbit/s 的方案，误差 ${approximate[0].bitrateError.toFixed(6)}%。请核对目标波特率或时钟。`;
 return '当前时钟、波特率和时序范围无法匹配。请核对有效时钟或目标波特率，或手动选择扩展范围；工具不会自动放宽限制。';
}
