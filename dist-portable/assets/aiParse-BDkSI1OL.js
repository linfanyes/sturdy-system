import{c as M}from"./index-CrvhU485.js";import{e as z}from"./document-CDmV10Vs.js";import{u as X,a as N}from"./ai-ClAGGpno.js";/**
 * @license lucide-vue-next v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=M("image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]),C=[".txt",".md",".markdown",".csv",".tsv",".json",".xml",".html",".htm",".yml",".yaml",".ini",".log",".sql",".js",".ts",".vue",".css",".scss",".java",".py",".c",".cpp",".h",".go",".rs",".sh",".bat",".tex",".rst",".adoc"],J=[".png",".jpg",".jpeg",".gif",".webp",".bmp"],P=[".pdf",".docx",".xlsx",".xls",".pptx",".odt"],v=[".doc",".ppt",".rtf",".ods",".odp",".pages",".numbers",".key",".zip",".rar",".7z",".tar",".gz",".bz2",".mp3",".mp4",".wav",".avi",".mov",".mkv",".flv",".webm",".exe",".dll",".bin",".apk",".iso",".db",".sqlite"],I=1*1024*1024,_=4*1024*1024,O=8*1024*1024,x=8e4;function U(){return"att-"+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4)}function W(t,e){const r=(t||"").toLowerCase();return e!=null&&e.startsWith("image/")||J.some(n=>r.endsWith(n))?"image":e!=null&&e.startsWith("text/")||C.some(n=>r.endsWith(n))?"text":P.some(n=>r.endsWith(n))?"doc":v.some(n=>r.endsWith(n))?"unsupported":e!=null&&e.startsWith("image/")?"image":e!=null&&e.startsWith("text/")?"text":"unsupported"}function m(t){return t<1024?t+" B":t<1024*1024?(t/1024).toFixed(1)+" KB":(t/1024/1024).toFixed(2)+" MB"}async function Q(t){const e=W(t.name,t.type),r={id:U(),name:t.name,kind:e,mime:t.type||(e==="image"?"image/*":e==="doc"?"application/document":e==="text"?"text/plain":"application/octet-stream"),size:t.size};if(e==="unsupported"){const n=(t.name.split(".").pop()||"").toLowerCase();throw new Error(`暂不支持读取「${t.name}」(.${n||"未知"} 格式) —— AI 无法识别此类文件内容。请将其另存为 .txt / .md / .csv，或把内容直接粘贴到输入框再发送。`)}if(e==="doc"){if(t.size>O)throw new Error(`文档「${t.name}」超过 ${m(O)} 限制, 请精简后再上传`);const n=await z(t);if(!n.trim())throw new Error(`未能从「${t.name}」提取到文字内容。可能是扫描版 PDF、加密文档或图片型内容, 请改用 .txt，或把内容直接粘贴到输入框再发送。`);return r.text=n.length>x?n.slice(0,x)+`

[内容已截断, 原文约 ${n.length} 字, 仅读取前 ${x} 字]`:n,r}if(e==="text"){if(t.size>I)throw new Error(`文本文件「${t.name}」超过 ${m(I)} 限制, 请精简后再上传`);r.text=await t.text()}else{if(t.size>_)throw new Error(`图片「${t.name}」超过 ${m(_)} 限制, 请压缩后再上传`);r.dataUrl=await B(t)}return r}const L=1024;async function B(t){const e=await new Promise((r,n)=>{const s=new FileReader;s.onload=()=>r(s.result),s.onerror=()=>n(new Error("读取图片失败")),s.readAsDataURL(t)});return F(e,L)}function F(t,e){return new Promise(r=>{const n=new Image;n.onload=()=>{const{width:s,height:a}=n;if(s<=e&&a<=e){r(t);return}const c=Math.min(e/s,e/a),f=Math.round(s*c),u=Math.round(a*c),d=document.createElement("canvas");d.width=f,d.height=u;const p=d.getContext("2d");if(!p){r(t);return}p.drawImage(n,0,0,f,u);try{r(d.toDataURL("image/jpeg",.85))}catch{r(t)}},n.onerror=()=>r(t),n.src=t})}function V(t,e){const r=e.filter(a=>(a.kind==="text"||a.kind==="doc")&&a.text),n=e.filter(a=>a.kind==="image"&&a.dataUrl);if(n.length===0){if(r.length===0)return t;const a=[t];for(const c of r)a.push(`

--- 附件: ${c.name} (${c.mime}, ${m(c.size)}) ---
${c.text}
---`);return a.join("")}const s=[];if(t.trim()&&s.push({type:"text",text:t}),r.length){const a=r.map(c=>`附件「${c.name}」(共 ${m(c.size)}):
${c.text}`).join(`

`);s.push({type:"text",text:`

`+a})}for(const a of n)s.push({type:"image_url",image_url:{url:a.dataUrl}});return s}async function Y(t){var u,d,p,y,$;const r=X().settings;if(!r.apiKey)return{ok:!1,data:[],raw:"",error:"请先在「AI 对话 → 设置」中配置 API Key"};const n=(r.baseUrl||N).replace(/\/$/,""),s=r.textModel||"qwen3.7-plus",a=Object.entries(t.schema.fields).map(([o,h])=>`- ${o}: ${h}`).join(`
`),c=JSON.stringify(t.schema.example,null,2),f=`你是一名数据整理助手, 擅长把老师提供的非结构化文本解析为 JSON 数组.

## 任务
把用户提供的「原始文本」解析为一个 JSON 数组, 数组每个元素是一条结构化记录.

## 字段说明 (${t.schema.name})
${a}
${t.schema.extra?`
## 特别要求
`+t.schema.extra:""}

## 输出格式 (严格遵守)
- 必须是合法 JSON 数组, 以 \`[\` 开头 \`]\` 结尾
- 不要包含任何解释性文字, 不要使用 markdown 代码块包裹
- 字段值尽量简短, 与原始文本保持一致, 不要编造未出现的信息
- 缺失的字段填空字符串 \`""\` 或 \`null\`
- 解析后请额外检查: 数组长度合理、每条记录的字段数量一致

## 示例
输入示例: ...(省略, 直接给结构)
输出示例:
${c}

现在请解析用户提供的「原始文本」. 只输出 JSON 数组, 不要多余的话.`;try{const o=await fetch(n+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+r.apiKey},body:JSON.stringify({model:s,temperature:.2,stream:!0,messages:[{role:"system",content:f},{role:"user",content:"原始文本:\n```\n"+t.text+"\n```"}]}),signal:t.signal});if(!o.ok){const i=await o.text();return{ok:!1,data:[],raw:"",error:"请求失败: "+o.status+" "+i.slice(0,300)}}const h=(u=o.body)==null?void 0:u.getReader();if(!h)return{ok:!1,data:[],raw:"",error:"浏览器不支持流式响应"};const T=new TextDecoder("utf-8");let l="",w="";for(;;){const{value:i,done:j}=await h.read();if(j)break;w+=T.decode(i,{stream:!0});const S=w.split(`
`);w=S.pop()||"";for(const D of S){const g=D.trim();if(!g||g==="data: [DONE]"||!g.startsWith("data:"))continue;const A=g.slice(5).trim();if(A)try{const k=((y=(p=(d=JSON.parse(A).choices)==null?void 0:d[0])==null?void 0:p.delta)==null?void 0:y.content)||"";k&&(l+=k,($=t.onProgress)==null||$.call(t,l))}catch{}}}const b=R(l);let E=[];try{const i=JSON.parse(b);E=Array.isArray(i)?i:[i]}catch(i){return{ok:!1,data:[],raw:l,error:"JSON 解析失败: "+((i==null?void 0:i.message)||String(i))}}return{ok:!0,data:E,raw:l}}catch(o){return(o==null?void 0:o.name)==="AbortError"?{ok:!1,data:[],raw:"",error:"已取消"}:{ok:!1,data:[],raw:"",error:"错误: "+((o==null?void 0:o.message)||String(o))}}}function R(t){let e=t.trim();return e=e.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/i,"").trim(),e}export{H as I,V as b,m as f,Y as p,Q as r};
