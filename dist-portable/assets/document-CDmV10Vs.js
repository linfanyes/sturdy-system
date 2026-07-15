import{l as d}from"./index-CrvhU485.js";const y=""+new URL("pdf.worker.min-DEtVeC4l.mjs",import.meta.url).href;let u=null,f=null,p=null,w=!1;async function m(){if(!u){const t=await d(()=>import("./jszip.min-DvbXqdIg.js").then(r=>r.j),[],import.meta.url);u=t.default??t}return u}async function h(){return f||(f=await d(()=>import("./xlsx-BGhuli8m.js"),[],import.meta.url)),f}async function b(){return p||(p=await d(()=>import("./pdf-Y4YPUwDk.js"),[],import.meta.url)),w||(p.GlobalWorkerOptions.workerSrc=y,w=!0),p}async function I(t){const r=(t.name||"").toLowerCase(),e=await t.arrayBuffer();if(r.endsWith(".pdf"))return S(e);if(r.endsWith(".docx"))return j(e);if(r.endsWith(".pptx"))return P(e);if(r.endsWith(".odt"))return L(e);if(r.endsWith(".xlsx")||r.endsWith(".xls"))return A(e);throw new Error(`暂不支持读取「${t.name}」`)}function g(t){return t.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#x([0-9a-fA-F]+);/g,(r,e)=>x(parseInt(e,16))).replace(/&#(\d+);/g,(r,e)=>x(parseInt(e,10))).replace(/&amp;/g,"&")}function x(t){try{return String.fromCodePoint(t)}catch{return""}}function l(t){return t.replace(/\r\n/g,`
`).replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`).trim()}async function S(t){const e=await(await b()).getDocument({data:new Uint8Array(t)}).promise,i=[];for(let n=1;n<=e.numPages;n++){const c=(await(await e.getPage(n)).getTextContent()).items.map(s=>"str"in s?s.str:"").join(" ");i.push(`[第 ${n} 页]
${c}`)}return l(i.join(`

`))}async function j(t){var a;const i=await((a=(await(await m()).loadAsync(t)).file("word/document.xml"))==null?void 0:a.async("string"));if(!i)return"";let n=i.replace(/<w:br\b[^>]*\/>/g,`
`).replace(/<w:cr\b[^>]*\/>/g,`
`).replace(/<\/w:p>/g,`
`).replace(/<w:tab\b[^>]*\/>/g,"  ");return n=n.replace(/<w:t[^>]*>(.*?)<\/w:t>/g,(o,c)=>c),n=n.replace(/<[^>]+>/g,""),l(g(n))}async function P(t){const e=await(await m()).loadAsync(t),i=Object.keys(e.files).filter(a=>/^ppt\/slides\/slide\d+\.xml$/i.test(a)).sort((a,o)=>{const c=parseInt((a.match(/\d+/)||["0"])[0],10),s=parseInt((o.match(/\d+/)||["0"])[0],10);return c-s}),n=[];for(const a of i){let c=(await e.file(a).async("string")).replace(/<a:t[^>]*>(.*?)<\/a:t>/g,(s,_)=>_+`
`);c=c.replace(/<[^>]+>/g,""),n.push(`[幻灯片 ${a.match(/\d+/)[0]}]
${l(g(c))}`)}return n.join(`

`)}async function L(t){var a;const i=await((a=(await(await m()).loadAsync(t)).file("content.xml"))==null?void 0:a.async("string"));if(!i)return"";let n=i.replace(/<text:h\b[^>]*>/g,`
`).replace(/<text:p\b[^>]*>/g,`
`).replace(/<text:span\b[^>]*>(.*?)<\/text:span>/g,(o,c)=>c);return n=n.replace(/<[^>]+>/g,""),l(g(n))}async function A(t){const r=await h(),e=r.read(new Uint8Array(t),{type:"array"}),i=[];for(const n of e.SheetNames){const a=e.Sheets[n];if(!a)continue;const o=r.utils.sheet_to_csv(a,{blankrows:!1});i.push(`[工作表 ${n}]
${o}`)}return i.join(`

`)}export{I as e};
