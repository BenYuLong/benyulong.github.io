import test from 'node:test';
import assert from 'node:assert/strict';
import { findTimings, compareTimings } from '../themes/ben/source/js/can-timing.mjs';
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
