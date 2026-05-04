import { useState } from 'react'

function useSorted(items, defaultKey, defaultDir='asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)
  function toggleSort(key) {
    if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sorted = [...(items||[])].sort((a,b)=>{
    const av=a[sortKey]??'', bv=b[sortKey]??''
    const cmp = typeof av==='number'&&typeof bv==='number' ? av-bv : String(av).localeCompare(String(bv),undefined,{numeric:true})
    return sortDir==='asc'?cmp:-cmp
  })
  function thProps(key, label, noSort=false) {
    if(noSort) return {className:'no-sort',children:label}
    return {onClick:()=>toggleSort(key),className:sortKey===key?('sort-'+sortDir):'',children:label,style:{cursor:'pointer'}}
  }
  return {sorted,sortKey,sortDir,toggleSort,thProps}
}

export { useSorted }
