from pathlib import Path
import runpy,sys,json
sys.argv=['generate.py',sys.argv[1]];m=runpy.run_path('supabase/candidates/nickname_grapheme_20261114/generate.py')
p=Path('src/lib/my/unicode16-graphemes.ts')
s='// Generated Unicode 16 properties (unicode.org UCD); shared with the DB validator.\n// Unicode License v3: see supabase/candidates/nickname_grapheme_20261114/UNICODE-LICENSE.txt.\n'
for name,file,kind in [('gcb','GraphemeBreakProperty.txt','gcb'),('incb','DerivedCoreProperties.txt','incb'),('ep','emoji-data.txt','ep')]:
 rows=sorted(m['ranges'](file,kind));s+=f'const {name}:readonly (readonly [number,number,string])[]='+json.dumps(rows,separators=(',',':'))+';\n'
s+='''function property(rows:readonly (readonly [number,number,string])[],cp:number):string{
 let lo=0,hi=rows.length-1;while(lo<=hi){const m=(lo+hi)>>>1;const [a,b,v]=rows[m];if(cp<a)hi=m-1;else if(cp>b)lo=m+1;else return v;}return 'Other';
}
/** Version-pinned fallback when Intl's bundled Unicode differs from Flutter. */
export function unicode16GraphemeLength(value:string):number{
 let prev='',n=0,ri=0,epChain=false,zwjEp=false,consonant=false,linked=false;
 for(const ch of value){
  const cp=ch.codePointAt(0)!,p=property(gcb,cp),ic=property(incb,cp),isEp=property(ep,cp)==='EP';
  let joins=false;
  if(prev==='CR'&&p==='LF')joins=true;
  else if(prev===''||['Control','CR','LF'].includes(prev)||['Control','CR','LF'].includes(p))joins=false;
  else if(prev==='L'&&['L','V','LV','LVT'].includes(p))joins=true;
  else if(['LV','V'].includes(prev)&&['V','T'].includes(p))joins=true;
  else if(['LVT','T'].includes(prev)&&p==='T')joins=true;
  else if(['Extend','ZWJ','SpacingMark'].includes(p)||prev==='Prepend')joins=true;
  else if(ic==='Consonant'&&consonant&&linked)joins=true;
  else if(isEp&&prev==='ZWJ'&&zwjEp)joins=true;
  else if(prev==='Regional_Indicator'&&p==='Regional_Indicator'&&ri%2===1)joins=true;
  if(!joins)n++;
  zwjEp=p==='ZWJ'&&epChain;
  if(isEp)epChain=true;else if(p!=='Extend')epChain=false;
  if(ic==='Consonant'){consonant=true;linked=false;}
  else if(ic==='Linker'&&consonant)linked=true;
  else if(!['Extend','Linker'].includes(ic)){consonant=false;linked=false;}
  ri=p==='Regional_Indicator'?ri+1:0;prev=p;
 }
 return n;
}
''';p.write_text(s)
