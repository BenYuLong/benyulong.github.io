import { validateTimings } from './can-timing.mjs';
const keys=['bitrateKbps','samplePoint','sjw','sampleMin','sampleMax','prescalerMin','prescalerMax','prescalerStep','seg1Min','seg1Max','seg2Min','seg2Max'];
function invalid(){throw new Error('配置不完整或含无效参数');}
function numeric(value){if(typeof value!=='string'||value.length>40||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(value)||!Number.isFinite(Number(value)))invalid();return String(Number(value));}
function choice(value,choices){if(!choices.includes(value))invalid();return value;}
/** Validate and whitelist everything before the caller applies any DOM changes. */
export function validateConfig(saved){
 if(!saved||saved.version!==1||!saved.settings||!saved.phases)invalid();
 const s=saved.settings,settings={mode:choice(s.mode,['classic','fd']),clock:numeric(s.clock),error:numeric(s.error),sort:choice(s.sort,['bitrate','sample','tq','prescaler']),limit:choice(s.limit,['20','50','100','200'])};
 if(Number(settings.clock)<0.000001)invalid();
 const shared={clockMHz:Number(settings.clock),maxError:Number(settings.error),sortBy:settings.sort,limit:Number(settings.limit)};
 function phase(values){
  if(!values||typeof values!=='object')invalid();
  const result=Object.fromEntries(keys.map(key=>[key,numeric(values[key])]));
  if(Number(result.bitrateKbps)<0.000001||Number(result.samplePoint)<0.000001||Number(result.samplePoint)>99.999999)invalid();
  validateTimings({...shared,...Object.fromEntries(Object.entries(result).map(([k,v])=>[k,Number(v)]))});return result;
 }
 const phases={nominal:phase(saved.phases.nominal),data:phase(saved.phases.data)};
 const presets={nominal:choice(saved.presets?.nominal??'custom',['classic','nominal','extended','custom']),data:choice(saved.presets?.data??'custom',['data','extended','custom'])};
 const modes={};
 for(const mode of ['classic','fd'])if(saved.modes?.[mode]!==undefined){const entry=saved.modes[mode];if(!entry)invalid();modes[mode]={values:phase(entry.values),preset:choice(entry.preset,['classic','nominal','extended','custom'])};}
 if(settings.mode==='fd'&&Number(phases.data.bitrateKbps)<Number(phases.nominal.bitrateKbps))invalid();
 return {version:1,settings,phases,presets,modes};
}
