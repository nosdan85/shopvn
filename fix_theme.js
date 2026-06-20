const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'web', 'app');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(targetDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Dark Blue Backgrounds -> Glass
    content = content.replace(/bg-\[#071326\]\/80/g, "bg-white/30 backdrop-blur-md border border-white/50 shadow-lg");
    content = content.replace(/bg-\[#071326\]\/90/g, "bg-white/40 backdrop-blur-md border border-white/50 shadow-lg");
    content = content.replace(/bg-\[#071326\]\/95/g, "bg-white/50 backdrop-blur-md border border-white/50 shadow-lg");
    content = content.replace(/bg-\[#071326\]/g, "bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]");
    
    // Other Dark Backgrounds
    content = content.replace(/bg-\[#1E1E1E\]/g, "bg-white/50 backdrop-blur-md");
    content = content.replace(/bg-\[#2A2A2A\]/g, "bg-white/60 backdrop-blur-md");
    content = content.replace(/bg-black\/50/g, "bg-white/30 backdrop-blur-sm");
    content = content.replace(/bg-black\/80/g, "bg-white/40 backdrop-blur-sm");
    content = content.replace(/bg-black/g, "bg-white/50 backdrop-blur-sm");

    content = content.replace(/bg-\[#1A1A1A\]/g, "bg-white/50 backdrop-blur-md");
    content = content.replace(/bg-\[#0D0D0D\]/g, "bg-white/60 backdrop-blur-md");

    // Gradients
    content = content.replace(/from-\[#071326\]/g, "from-white/60");
    content = content.replace(/to-\[#071326\]/g, "to-white/60");
    
    // Gradients (Sky/Blue) - Just remove background so body gradient shows
    content = content.replace(/bg-gradient-to-br from-sky-950 via-blue-950\/80 to-cyan-950/g, "bg-transparent");
    content = content.replace(/bg-gradient-to-br from-sky-950 via-blue-950\/90 to-cyan-950\/80/g, "bg-transparent");

    // Text Colors (ensure readability on light background)
    content = content.replace(/text-white\/50/g, "text-slate-500");
    content = content.replace(/text-white\/60/g, "text-slate-500");
    content = content.replace(/text-white\/80/g, "text-slate-600");
    content = content.replace(/text-white/g, "text-[#071326]/90");
    content = content.replace(/text-blue-200\/70\/80/g, "text-slate-600");
    content = content.replace(/text-blue-200\/70\/60/g, "text-slate-500");
    content = content.replace(/text-blue-200\/70/g, "text-slate-600");

    // Borders
    content = content.replace(/border-white\/20/g, "border-white/50");
    content = content.replace(/border-white\/10/g, "border-white/40");
    content = content.replace(/border-\[#2A2A2A\]/g, "border-white/60");

    // Specific component styles
    content = content.replace(/bg-white\/5/g, "bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]");
    content = content.replace(/bg-white\/10/g, "bg-white/50 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]");
    content = content.replace(/bg-white\/8\/50/g, "bg-white/60 backdrop-blur-sm border border-white/50");
    content = content.replace(/bg-white\/8/g, "bg-white/40 backdrop-blur-sm border border-white/50");

    // Sapphire Blue
    content = content.replace(/bg-\[#2F9BE6\]\/15/g, "bg-white/30 backdrop-blur-sm");
    content = content.replace(/bg-\[#2F9BE6\]\/20/g, "bg-white/40 backdrop-blur-sm");
    content = content.replace(/bg-\[#2F9BE6\]/g, "bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]");
    content = content.replace(/hover:bg-\[#49B6FF\]/g, "hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)]");
    content = content.replace(/border-\[#2F9BE6\]\/30/g, "border-white/50");
    content = content.replace(/border-\[#2F9BE6\]/g, "border-white/60");
    content = content.replace(/text-\[#2F9BE6\]/g, "text-[#071326]/90");
    content = content.replace(/focus:border-\[#2F9BE6\]/g, "focus:border-white focus:ring-2 focus:ring-white/50");
    content = content.replace(/bg-\[#1a6cb8\]/g, "bg-white/30 backdrop-blur-md");

    // Green
    content = content.replace(/bg-\[#3DDC84\]\/15/g, "bg-white/30 backdrop-blur-sm");
    content = content.replace(/bg-\[#3DDC84\]/g, "bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]");
    content = content.replace(/hover:bg-\[#4EE67A\]/g, "hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)]");
    content = content.replace(/text-\[#3DDC84\]/g, "text-emerald-700");
    content = content.replace(/text-green-400/g, "text-emerald-700");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log("Updated", file);
    }
});
