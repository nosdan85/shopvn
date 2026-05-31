const fs=require('fs');
let c=fs.readFileSync('src/ShopApp.tsx','utf8');
// fix textarea typo lastVal attr
c=c.replace(/lastVal=\{String\(editing\.description \|\| ''\)\}/g,"value={String(editing.description || '')}");
// fix itemPayload trailing semicolon after function (should not have ; after function block)
c=c.replace(/function itemPayload\([\s\S]*?\n\};\n/,(m)=>m.replace(/\n\};\n/,"\n}\n"));
fs.writeFileSync('src/ShopApp.tsx',c,'utf8');
console.log('fixed');