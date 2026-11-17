import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applyTimingPreset } from '../themes/ben/source/js/can-presets.mjs';
import { findTimings } from '../themes/ben/source/js/can-timing.mjs';
const stale={clockMHz:80,bitrateKbps:500,samplePoint:87.5,maxError:0.5,sjw:100,seg1Min:100,seg2Min:50,sampleMin:99.99,sampleMax:100};
test('presets replace stale search constraints while preserving user targets',()=>{
 for(const name of Object.keys(PRESETS)){
  const o=applyTimingPreset(stale,name);
  assert.equal(o.clockMHz,80);assert.equal(o.bitrateKbps,500);assert.equal(o.samplePoint,87.5);
  assert.equal(o.sjw,1);assert.equal(o.sampleMin,0);assert.equal(o.sampleMax,100);
  assert.ok(findTimings(o).length, name);
 }
 assert.equal(stale.sjw,100);
});
test('classic preset has solutions for standard example clocks and bitrates',()=>{
 for(const clockMHz of [8,16,36,42,48,72,80])for(const bitrateKbps of [125,250,500,1000]){
  assert.ok(findTimings(applyTimingPreset({...stale,clockMHz,bitrateKbps},'classic')).length,`${clockMHz} MHz / ${bitrateKbps} kbps`);
 }
});
