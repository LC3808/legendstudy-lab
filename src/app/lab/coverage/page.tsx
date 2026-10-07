import Link from "next/link";
import { buildPublicMetadata } from "@/lib/brand";
export const metadata = buildPublicMetadata("LegendStudy LAB", "LegendStudy LAB", "/", { index: false });
export default function Page() { return <section className="page-section content-wrap"><h1>LegendStudy LAB</h1><Link className="button button--primary" href="/">LegendStudy LAB 보기</Link></section>; }
