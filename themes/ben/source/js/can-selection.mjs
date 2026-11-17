/** Match physical timing counts; a displayed row number is not a stable identity. */
export function resolveTimingSelection(rows,previous){
 const match=previous?rows.findIndex(row=>['prescaler','seg1','seg2','sjw'].every(key=>row[key]===previous[key])):-1;
 return {index:match>=0?match:rows.length?0:-1,missing:!!previous&&match<0};
}
