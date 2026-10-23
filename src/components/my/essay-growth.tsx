'use client';
import Link from 'next/link';
import {readEssaySummary} from '@/lib/my/foundation';
import {summarizeGrowth, type GrowthSummary} from '@/lib/my/essay-growth';
import {DataStatus, useOwnerData} from './owner-data';

/**
 * 나의 논술 성장 — presentation only, folded from the deployed `my_essay_summary`.
 *
 * Every line is a real completed student evaluation. The level comparison is the
 * strict same-context gate (`comparableDimensionDelta`); when a first and a rewrite
 * result cannot be compared the block simply does not appear, and when they can, an
 * unchanged or declined result is shown as it happened — the card never rounds a
 * result up to "완료" or "향상". Criterion names are not in this contract, so the
 * growth block reports how many elements moved and links to the detail view for the
 * named breakdown rather than inventing a label.
 */
export function EssayGrowthCard() {
 const result = useOwnerData(readEssaySummary);
 if (!result.data) return <DataStatus error={result.error} reload={result.reload} />;
 const g = summarizeGrowth(result.data);
 if (g.status === 'none') {
  return <div className="my-empty-block">
   <p className="my-empty">아직 논술 기록이 없어요. 첫 답안을 작성하면 성장 과정을 여기에서 볼 수 있어요.</p>
   <Link className="button button--primary button--small" href="/essay-lab/">논술 LAB 시작하기</Link>
  </div>;
 }
 return <div className="my-panel my-growth">
  <GrowthHeadline g={g} />
  <dl className="my-growth__stats">
   <div><dt>연습한 대학</dt><dd>{g.universitiesPracticed}곳</dd></div>
   <div><dt>최초 첨삭</dt><dd>{g.initialEvaluations}회</dd></div>
   <div><dt>재첨삭 완료</dt><dd>{g.reEvaluations}회</dd></div>
  </dl>
  {g.comparison && <div className="my-growth__compare">
   <h3>최초 첨삭 → 재첨삭 변화</h3>
   <p className="my-growth__change">
    <span className="my-growth__up">향상 {g.comparison.improved}</span> ·
    <span> 동일 {g.comparison.unchanged}</span> ·
    <span className="my-growth__down"> 하락 {g.comparison.declined}</span>
    <span className="my-note"> · 비교한 평가 항목 {g.comparison.pairs}개</span>
   </p>
   {g.comparison.bestDelta !== null && g.comparison.bestDelta > 0 &&
    <p className="my-note">가장 크게 오른 항목은 {g.comparison.bestDelta}단계 올랐어요. 어떤 항목인지 상세에서 확인해 보세요.</p>}
   <p className="my-note">같은 문제·평가 기준의 결과만 비교하며, 등급 변화가 어떤 수정 때문인지는 단정하지 않아요.</p>
  </div>}
  <div className="my-actions">
   <Link className="button button--outline button--small" href="/account/essay/">평가 결과 분석</Link>
   <Link className="button button--outline button--small" href="/my/essays/">나의 첨삭 기록</Link>
  </div>
 </div>;
}

function GrowthHeadline({g}: {g: GrowthSummary}) {
 if (g.status === 'in-progress') {
  return <p className="my-growth__headline">
   {g.recentUniversity ? `${g.recentUniversity} 논술에 도전했어요!` : '논술 답안을 작성했어요!'}
   <span className="my-growth__sub"> 평가 결과를 준비하고 있어요.</span>
  </p>;
 }
 const stage = g.recentStage === 'reeval' ? '재첨삭까지 받았어요' : '첫 첨삭을 받았어요';
 return <p className="my-growth__headline">
  {g.recentUniversity ? `${g.recentUniversity} 논술에 도전했어요!` : '논술 첨삭을 받았어요!'}
  <span className="my-growth__sub"> 가장 최근 기록은 {stage}.</span>
 </p>;
}
