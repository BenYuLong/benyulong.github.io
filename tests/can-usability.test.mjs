import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTiming, timingSuggestions, findTimings } from '../themes/ben/source/js/can-timing.mjs';
const timing={clockMHz:80,prescaler:10,seg1:13,seg2:2,sjw:1};
const search={clockMHz:80,bitrateKbps:500,samplePoint:87.5,maxError:0,sjw:1,prescalerMin:1,prescalerMax:64,prescalerStep:1,seg1Min:1,seg1Max:16,seg2Min:1,seg2Max:8,limit:20};
test('reverse calculation reports actual timing and rejects invalid counts',()=>{
 const r=calculateTiming(timing);
 assert.equal(r.bitrate,500000);assert.equal(r.samplePoint,87.5);assert.equal(r.tqNs,125);assert.equal(r.bitTimeNs,2000);
 for(const change of [{clockMHz:0},{clockMHz:Infinity},{prescaler:1.5},{seg1:0},{seg2:1025},{sjw:3}])assert.throws(()=>calculateTiming({...timing,...change}),RangeError);
});
test('reverse calculation agrees with forward search',()=>{
 for(const row of findTimings(search)){const actual=calculateTiming({...row,clockMHz:80});for(const key of ['bitrate','samplePoint','totalTq','tqNs','bitTimeNs'])assert.equal(actual[key],row[key]);}
});
test('diagnostic examples preserve input and respect unchanged timing bounds',()=>{
 const input=Object.freeze({...search,sampleMin:99.9,sampleMax:100});const result=timingSuggestions(input);
 assert.equal(result.kind,'sample');assert.equal(result.example.bitrate,500000);assert.ok(result.example.samplePoint<99.9);
 const rate=timingSuggestions({...search,clockMHz:1,bitrateKbps:333});assert.equal(rate.kind,'bitrate');assert.ok(rate.example.bitrateError>0);
 assert.equal(timingSuggestions({...search,sjw:9}).kind,'sjw');
});

test('paired export uses each selected timing with its phase and target',async()=>{
 const {timingsTsv}=await import('../themes/ben/source/js/can-results.mjs');
 const nominal=findTimings(search)[1],data=findTimings({...search,bitrateKbps:2000,samplePoint:80})[2];
 const lines=timingsTsv([{phase:'nominal',options:search,row:nominal},{phase:'data',options:{...search,bitrateKbps:2000},row:data}]).split('\n').map(line=>line.split('\t'));
 assert.equal(lines.length,3);assert.ok(lines.every(line=>line.length===14));
 assert.deepEqual(lines[1].slice(0,7),['nominal','80','500',...['prescaler','seg1','seg2','sjw'].map(key=>String(nominal[key]))]);
 assert.deepEqual(lines[2].slice(0,7),['data','80','2000',...['prescaler','seg1','seg2','sjw'].map(key=>String(data[key]))]);
});

test('reverse targets compare independently and reject invalid optional targets',()=>{
 const exact=calculateTiming({...timing,targetBitrateKbps:500,targetSamplePoint:87.5});
 assert.equal(exact.bitrateError,0);assert.equal(exact.sampleError,0);
 const offset=calculateTiming({...timing,targetBitrateKbps:400,targetSamplePoint:80});
 assert.equal(offset.bitrateError,25);assert.equal(offset.sampleError,7.5);
 assert.equal(calculateTiming({...timing,targetSamplePoint:80}).bitrateError,undefined);
 assert.equal(calculateTiming({...timing,targetBitrateKbps:500}).sampleError,undefined);
 for(const change of [{targetBitrateKbps:0},{targetBitrateKbps:Infinity},{targetSamplePoint:0},{targetSamplePoint:100},{targetSamplePoint:NaN}])assert.throws(()=>calculateTiming({...timing,...change}),RangeError);
});
