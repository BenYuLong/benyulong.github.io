import test from 'node:test';
import assert from 'node:assert/strict';
import { findTimings, compareTimings, timingComparator, diagnoseTimings } from '../themes/ben/source/js/can-timing.mjs';
const base = { clockMHz: 80, bitrateKbps: 500, samplePoint: 87.5, maxError: 0, sjw: 1, prescalerMin: 1, prescalerMax: 512, prescalerStep: 1, seg1Min: 1, seg1Max: 256, seg2Min: 1, seg2Max: 128 };
test('80 MHz / 500 kbps has exact 87.5% solutions', () => {
 const rows = findTimings(base);
 assert.ok(rows.length); const r = rows[0];
 assert.equal(r.bitrate, 500000); assert.equal(r.samplePoint, 87.5);
 assert.equal(r.totalTq * r.prescaler, 160);
 assert.equal(r.bitTimeNs, 2000);
 assert.equal(r.tqNs, r.prescaler / 80 * 1000);
});
test('CAN FD data phase reaches 2 Mbps with 80% sampling', () => {
 const r=findTimings({...base,bitrateKbps:2000,samplePoint:80,prescalerMax:32,seg1Max:32,seg2Max:16})[0];
 assert.equal(r.bitrate,2000000);assert.equal(r.samplePoint,80);
});
test('zero tolerance excludes approximate rates and impossible results are empty', () => {
 assert.deepEqual(findTimings({...base,clockMHz:1,bitrateKbps:777}),[]);
 const rows=findTimings({...base,clockMHz:1,bitrateKbps:333,maxError:1});
 assert.ok(rows.length);assert.ok(rows.every(r=>r.bitrateError<=1));
});
test('reject invalid, infinite, fractional ranges, and inconsistent limits', () => {
 for (const override of [{clockMHz:0},{clockMHz:Infinity},{samplePoint:100},{samplePoint:0},{maxError:-1},{maxError:51},{sjw:0},{prescalerMax:1.5},{seg1Min:10,seg1Max:2},{prescalerStep:0}]) {
  assert.throws(()=>findTimings({...base,...override}),RangeError);
 }
});
test('respects requested SJW, min/max and prescaler step', () => {
 const rows=findTimings({...base,prescalerMin:2,prescalerMax:20,prescalerStep:2,seg1Min:3,seg1Max:16,seg2Min:2,seg2Max:8,sjw:4});
 assert.ok(rows.length);assert.ok(rows.every(r=>r.prescaler%2===0 && r.seg1>=3 && r.seg1<=16 && r.seg2>=4 && r.seg2<=8 && r.sjw===4));
 assert.deepEqual(findTimings({...base,sjw:8,seg2Max:4}),[]);
});
test('optimized best candidate agrees with independent brute force', () => {
 const options={...base,clockMHz:8,bitrateKbps:333,maxError:10,samplePoint:72,prescalerMax:12,seg1Max:12,seg2Max:8,sjw:2};
 const all=[];
 for(let p=1;p<=12;p++)for(let a=1;a<=12;a++)for(let b=2;b<=8;b++){
  const total=1+a+b,rate=8000000/p/total,error=Math.abs(rate/333000-1)*100,sample=(1+a)/total*100;
  if(error<=10)all.push({prescaler:p,seg1:a,seg2:b,totalTq:total,bitrateError:error,sampleError:Math.abs(sample-72)});
 }
 all.sort(compareTimings);
 const actual=findTimings(options);
 assert.deepEqual(actual.slice(0,1).map(r=>[r.prescaler,r.seg1,r.seg2]),all.slice(0,1).map(r=>[r.prescaler,r.seg1,r.seg2]));
});
test('repeat calculations are deterministic and do not mutate input', () => {
 const input=Object.freeze({...base});assert.deepEqual(findTimings(input),findTimings(input));
});

test('sample range is inclusive, independently filters and can yield no results', () => {
 const rows=findTimings({...base,sampleMin:75,sampleMax:80});assert.ok(rows.length);
 assert.ok(rows.every(r=>r.samplePoint>=75 && r.samplePoint<=80));
 const exact=findTimings({...base,sampleMin:87.5,sampleMax:87.5});assert.ok(exact.length);assert.ok(exact.every(r=>r.samplePoint===87.5));
 assert.deepEqual(findTimings({...base,sampleMin:99.99,sampleMax:100}),[]);
 for(const range of [{sampleMin:80,sampleMax:75},{sampleMin:-1},{sampleMax:101},{sampleMin:NaN}])assert.throws(()=>findTimings({...base,...range}),RangeError);
});

test('best result matches brute force over varied custom bounds and sample filters', () => {
 for(const sample of [55,75,87.5])for(const maxError of [0,10])for(const sjw of [1,3]){
  const o={...base,clockMHz:8,bitrateKbps:500,samplePoint:sample,maxError,sjw,prescalerMin:2,prescalerMax:12,prescalerStep:2,seg1Min:3,seg1Max:14,seg2Min:2,seg2Max:8,sampleMin:60,sampleMax:85};
  const all=[];
  for(let p=2;p<=12;p+=2)for(let a=3;a<=14;a++)for(let b=Math.max(2,sjw);b<=8;b++){
   const total=1+a+b,rate=8000000/p/total,error=Math.abs(rate/500000-1)*100,sp=(1+a)/total*100;
   if(error<=maxError+1e-9 && sp>=60 && sp<=85)all.push({prescaler:p,seg1:a,seg2:b,totalTq:total,bitrateError:error,sampleError:Math.abs(sp-sample)});
  }
  all.sort(compareTimings);const actual=findTimings(o);
  assert.deepEqual(actual.slice(0,1).map(r=>[r.prescaler,r.seg1,r.seg2]),all.slice(0,1).map(r=>[r.prescaler,r.seg1,r.seg2]));
 }
});

test('equivalent bitrate products must rank by sample error rather than floating-point noise', () => {
 const rows=findTimings({...base,clockMHz:77.3,bitrateKbps:260,samplePoint:87.2,maxError:3,prescalerMin:3,prescalerMax:20,prescalerStep:3,seg1Max:16,seg2Min:2,seg2Max:8,sampleMin:55,sampleMax:87});
 assert.deepEqual([rows[0].prescaler,rows[0].seg1,rows[0].seg2],[15,16,3]);
});

test('bounded search agrees with a larger result set under every ranking',()=>{
 for(const sortBy of ['bitrate','sample','tq','prescaler']){
  const o={...base,maxError:5,sortBy};
  const all=findTimings({...o,limit:200});
  assert.deepEqual(findTimings({...o,limit:3}),all.slice(0,3));
  for(let i=1;i<all.length;i++)assert.ok(timingComparator(sortBy)(all[i-1],all[i])<=0);
 }
 assert.throws(()=>findTimings({...base,limit:201}),RangeError);
});
test('diagnostics distinguish restrictive sample filters from bitrate limits',()=>{
 assert.match(diagnoseTimings({...base,sampleMin:99.99,sampleMax:100}),/采样点/);
 assert.match(diagnoseTimings({...base,clockMHz:1,bitrateKbps:333}),/误差/);
});

test('heap matches independently enumerated optimal splits for every sort order',()=>{
 const o={...base,clockMHz:8,bitrateKbps:333,maxError:30,prescalerMin:1,prescalerMax:20,prescalerStep:1,seg1Min:1,seg1Max:16,seg2Min:1,seg2Max:8,samplePoint:81,sampleMin:55,sampleMax:95,limit:7};
 const groups=new Map();
 for(let p=1;p<=20;p++)for(let a=1;a<=16;a++)for(let b=1;b<=8;b++){
  const totalTq=1+a+b,bitrate=8e6/(p*totalTq),bitrateError=Math.abs(bitrate/333000-1)*100,samplePoint=(1+a)/totalTq*100;
  if(bitrateError>30||samplePoint<55||samplePoint>95)continue;
  const row={prescaler:p,seg1:a,seg2:b,totalTq,bitrateError,sampleError:Math.abs(samplePoint-81)};
  const key=`${p}:${totalTq}`,existing=groups.get(key)||[];
  if(!existing.length||row.sampleError<existing[0].sampleError-1e-9)groups.set(key,[row]);
  else if(Math.abs(row.sampleError-existing[0].sampleError)<1e-9)existing.push(row);
 }
 const baseRank=(a,b)=>a.bitrateError-b.bitrateError||a.sampleError-b.sampleError||b.totalTq-a.totalTq||a.prescaler-b.prescaler||a.seg1-b.seg1;
 for(const sortBy of ['bitrate','sample','tq','prescaler']){
  const rank=(a,b)=>(sortBy==='sample'?a.sampleError-b.sampleError:sortBy==='tq'?b.totalTq-a.totalTq:sortBy==='prescaler'?a.prescaler-b.prescaler:0)||baseRank(a,b);
  const expected=[...groups.values()].flat().sort(rank).slice(0,7);
  const actual=findTimings({...o,sortBy});
  const keys=rows=>rows.map(r=>[r.prescaler,r.seg1,r.seg2]);assert.deepEqual(keys(actual),keys(expected),sortBy);
 }
});
