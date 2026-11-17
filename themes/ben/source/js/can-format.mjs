export function formatError(value){
 return value>0&&value<0.000001?'< 0.000001':Number(value.toFixed(6)).toLocaleString('zh-CN',{maximumFractionDigits:6});
}
