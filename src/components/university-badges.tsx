export function EssayTypeBadges({types}:{types:string[]}){
 return <div className="university-badges" aria-label="논술 유형">{[...new Set(types)].map(type=><span className="university-badge university-badge--type" data-type={type} key={type}>{type}</span>)}</div>;
}
