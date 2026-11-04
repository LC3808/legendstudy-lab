import {creditSourceLabels,type CreditSource} from '@/lib/essay-runtime/credit-source';

/** Shared server-selected credit source disclosure for Essay and Math submissions. */
export function EssayCreditConsent({source,credits}:{source:CreditSource;credits:number}){
 return <div className="essay-credit-consent"><dl><dt>베타 이용권 잔액</dt><dd>{source.beta}개</dd><dt>신규가입 무료 이용권 잔액</dt><dd>{source.signup_bonus}개</dd><dt>유료 이용권 잔액</dt><dd>{source.purchase}개</dd>{source.other>0&&<><dt>기타 지급 이용권 잔액</dt><dd>{source.other}개</dd></>}</dl><p><strong>이번 사용: {creditSourceLabels[source.source]} · {credits}개</strong></p>{credits===1&&source.source!=='beta'&&<p>베타 이용권 대신 위 출처의 이용권을 사용합니다. 동의한 경우에만 진행해 주세요.</p>}</div>;
}
