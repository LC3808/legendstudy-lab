/** Display accents only; never used to decide service availability. */
const themes:Record<string,{accent:string;tint:string}>={
 inha:{accent:'#005BAC',tint:'#EEF6FC'},
 hanyang:{accent:'#004483',tint:'#EFF5FA'},
 chungang:{accent:'#0068B7',tint:'#EEF6FC'},
 cau:{accent:'#0068B7',tint:'#EEF6FC'},
 kyunghee:{accent:'#8E1836',tint:'#FCF2F5'},
 skku:{accent:'#00664F',tint:'#EFF8F4'},
 korea:{accent:'#8B0029',tint:'#FCF1F4'},
 sogang:{accent:'#9B1838',tint:'#FCF2F5'},
 konkuk:{accent:'#006B3F',tint:'#EEF7F2'},
 hufs:{accent:'#007681',tint:'#EDF7F8'},
};
export function universityEssayTheme(sourceId:string){return themes[sourceId]??{accent:'#244A6A',tint:'#F2F6FA'};}
