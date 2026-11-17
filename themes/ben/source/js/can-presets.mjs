const common={prescalerMin:1,prescalerStep:1,seg1Min:1,seg2Min:1,sjw:1,sampleMin:0,sampleMax:100};
export const PRESETS=Object.freeze({
 classic:{...common,prescalerMax:1024,seg1Max:16,seg2Max:8},
 nominal:{...common,prescalerMax:512,seg1Max:256,seg2Max:128},
 data:{...common,prescalerMax:32,seg1Max:32,seg2Max:16},
 extended:{...common,prescalerMax:4096,seg1Max:1024,seg2Max:1024}
});
export function applyTimingPreset(options,name){
 if(!Object.hasOwn(PRESETS,name))return {...options};
 return {...options,...PRESETS[name]};
}
