import { findTimings, diagnoseTimings } from './can-timing.mjs';
self.onmessage=({data})=>{
 const results=[];
 for(const {phase,options} of data){
  try{const rows=findTimings(options);results.push({phase,rows,diagnosis:rows.length?'':diagnoseTimings(options)});}
  catch(error){self.postMessage({error:error.message,field:error.field,phase});return;}
 }
 self.postMessage({results});
};
