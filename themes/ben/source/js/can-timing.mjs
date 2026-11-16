/** Functional timing counts, not register encodings. No controller-specific assumptions. */
export function compareTimings(a, b) {
 return a.bitrateError-b.bitrateError || a.sampleError-b.sampleError || b.totalTq-a.totalTq || a.prescaler-b.prescaler || a.seg1-b.seg1;
}
export function findTimings(o) {
 const positive=(key,max)=>{if(!Number.isFinite(o[key]) || o[key]<=0 || o[key]>max)throw new RangeError(`${key} 必须大于 0 且不超过 ${max}`);};
 positive('clockMHz',10000);positive('bitrateKbps',1000000);positive('samplePoint',100);
 if(o.samplePoint>=100)throw new RangeError('采样点必须小于 100%');
 if(!Number.isFinite(o.maxError)||o.maxError<0||o.maxError>50)throw new RangeError('允许误差必须在 0–50% 之间');
 for(const k of ['prescalerMin','prescalerMax','prescalerStep','seg1Min','seg1Max','seg2Min','seg2Max','sjw']){
  positive(k,k.startsWith('prescaler')?4096:1024);
  if(!Number.isInteger(o[k]))throw new RangeError(`${k} 必须是整数`);
 }
 if(o.prescalerMin>o.prescalerMax||o.seg1Min>o.seg1Max||o.seg2Min>o.seg2Max)throw new RangeError('最小值不能大于最大值');
 const sampleMin=o.sampleMin ?? 0,sampleMax=o.sampleMax ?? 100;
 if(!Number.isFinite(sampleMin)||!Number.isFinite(sampleMax)||sampleMin<0||sampleMax>100||sampleMin>sampleMax)throw new RangeError('采样点范围必须在 0–100% 之间，且最小值不大于最大值');
 const min2=Math.max(o.seg2Min,o.sjw);
 if(min2>o.seg2Max)return [];
 const clock=o.clockMHz*1e6,target=o.bitrateKbps*1000,rows=[];
 for(let p=o.prescalerMin;p<=o.prescalerMax;p+=o.prescalerStep){
  const minTotal=Math.max(1+o.seg1Min+min2,Math.ceil(clock/p/target/(1+o.maxError/100)-1e-9));
  const maxTotal=Math.min(1+o.seg1Max+o.seg2Max,Math.floor(clock/p/target/(1-o.maxError/100)+1e-9));
  for(let total=minTotal;total<=maxTotal;total++){
   const bitrate=clock/p/total,bitrateError=Math.abs(bitrate/target-1)*100;
   if(bitrateError>o.maxError+1e-9)continue;
   const low=Math.max(min2,total-1-o.seg1Max,Math.ceil(total*(1-sampleMax/100)-1e-9)),high=Math.min(o.seg2Max,total-1-o.seg1Min,Math.floor(total*(1-sampleMin/100)+1e-9));
   if(low>high)continue;
   const ideal=total*(1-o.samplePoint/100);
   const choices=[...new Set([Math.max(low,Math.min(high,Math.floor(ideal))),Math.max(low,Math.min(high,Math.ceil(ideal)))])];
   const best=Math.min(...choices.map(b=>Math.abs((total-b)/total*100-o.samplePoint)));
   for(const b of choices){
    const samplePoint=(total-b)/total*100,sampleError=Math.abs(samplePoint-o.samplePoint);
    if(sampleError>best+1e-9)continue;
    rows.push({prescaler:p,seg1:total-1-b,seg2:b,sjw:o.sjw,totalTq:total,bitrate,bitrateError,samplePoint,sampleError,tqNs:p/clock*1e9,bitTimeNs:1/bitrate*1e9});
   }
  }
 }
 return rows.sort(compareTimings).slice(0,20);
}
