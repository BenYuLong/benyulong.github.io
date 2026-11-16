import { findTimings } from './can-timing.mjs';
self.onmessage = ({data}) => {
 try { self.postMessage({results:data.map(({phase,options})=>({phase,rows:findTimings(options)}))}); }
 catch(error){self.postMessage({error:error.message});}
};
