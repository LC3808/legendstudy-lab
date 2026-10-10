'use client';
import { useRouter } from 'next/navigation';
export function hasSafePreviousPage(referrer: string, origin: string, length: number) {
    try {
        return length > 1 && new URL(referrer).origin === origin;
    }
    catch {
        return false;
    }
}
export function QualityBack() {
    const router = useRouter();
    return <button type="button" className="button button--outline button--small" onClick={() => {
            if (hasSafePreviousPage(document.referrer, location.origin, history.length))
                router.back();
            else
                router.replace('/admin/');
        }}>← 뒤로가기</button>;
}
