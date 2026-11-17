import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTimingSelection } from '../themes/ben/source/js/can-selection.mjs';
const a={prescaler:1,seg1:139,seg2:20,sjw:1},b={prescaler:2,seg1:69,seg2:10,sjw:1};
test('selection follows timing counts after reordering rather than old row number',()=>{
 assert.deepEqual(resolveTimingSelection([b,a],{...a}),{index:1,missing:false});
 assert.deepEqual(resolveTimingSelection([b,a],b),{index:0,missing:false});
 assert.deepEqual(resolveTimingSelection([a,b],null),{index:0,missing:false});
});
test('missing and empty candidate lists report a lost selection',()=>{
 assert.deepEqual(resolveTimingSelection([b],a),{index:0,missing:true});
 assert.deepEqual(resolveTimingSelection([],a),{index:-1,missing:true});
 assert.deepEqual(resolveTimingSelection([],null),{index:-1,missing:false});
 assert.deepEqual(resolveTimingSelection([{...a,sjw:2}],a),{index:0,missing:true});
});
