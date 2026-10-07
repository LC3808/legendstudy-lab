import Link from "next/link";
import { buildPublicMetadata } from "@/lib/brand";
export const metadata = buildPublicMetadata("이용 안내", "LegendStudy LAB", "/pricing/", { index: false });
export default function Page() { return <section className="page-section content-wrap"><h1>이용 안내</h1><Link className="button button--primary" href="/pricing/">이용 안내 보기</Link></section>; }
