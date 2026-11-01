/** Remove only the keyed footer link; body links and policy content stay byte-identical. */
export function refineFooter(source) {
 const tuple = /\["\$","\$L[0-9a-f]+","\/refund\/",\{"href":"\/refund\/","children":"환불정책"\}\],/g;
 const plain = text => text.replace(tuple, '');
 let result = source.replace(/(<nav class="footer-nav"[^>]*>)([\s\S]*?)(<\/nav>)/g,
   (_,open,body,close) => open + body.replace('<a href="/refund/">환불정책</a>', '') + close);
 result = result.replace(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g,
   (all,encoded) => { const old=JSON.parse(encoded), next=plain(old); return next===old ? all : 'self.__next_f.push([1,'+JSON.stringify(next)+'])'; });
 return plain(result);
}
