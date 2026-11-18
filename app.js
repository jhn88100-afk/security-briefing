"use strict";
const D=window.BRIEFING_DATA;
const $=id=>document.getElementById(id);
let category="",activeId="";
const steps=["검토 대기","검토 중","검토 완료"];
let saved={};try{const v=JSON.parse(localStorage.getItem("regulatory-ticket-state")||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))saved=v}catch{}
const legacyStates={"신규 접수":"검토 대기","적용 여부 검토":"검토 중","대응 계획":"검토 중","조치 중":"검토 중","검증":"검토 중","시행 대기":"검토 중","완료":"검토 완료","적용 제외":"검토 완료","중복 종료":"검토 완료"};
const normalizeState=s=>steps.includes(s)?s:(legacyStates[s]||"검토 대기");
const state=i=>normalizeState(saved[i.id]?.status);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const link=(url,label)=>{try{const u=new URL(url);return u.protocol==="https:"?'<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':esc(label)}catch{return esc(label)}};


const vulnerabilitySources=[
 {agency:"CVE Program",board:"CVE 등록정보",url:"https://www.cve.org/",note:"CVE 식별자·등록정보 · 바로가기 제공, 자동 수집 미연결"},
 {agency:"NIST NVD",board:"취약점 분석·CVSS",url:"https://nvd.nist.gov/vuln",note:"취약점 분석·CVSS 정보 · 바로가기 제공, 자동 수집 미연결"},
 {agency:"FIRST",board:"CVSS 표준·계산기",url:"https://www.first.org/cvss/",note:"심각도 평가 표준·계산기 · 바로가기 제공, 자동 수집 미연결"},
 {agency:"KISA",board:"보안공지",url:"https://www.boho.or.kr/kr/bbs/list.do?bbsId=B0000133&menuNo=205020",note:"국내 취약점·업데이트 권고 · 게시판 수집 연결"}
];

const sourceCatalog=[
 {agency:"CVE Program",boards:["CVE 등록정보"]},
 {agency:"NIST NVD",boards:["취약점 분석·CVSS"]},
 {agency:"FIRST",boards:["CVSS 표준·계산기"]},
 {agency:"개인정보보호위원회",boards:["보도자료","안내서","기타 게시판"]},
 {agency:"KISA",boards:["보안공지","보고서·가이드","공지사항","불법스팸 자료실","기타 게시판"]},
 {agency:"금융위원회",boards:["보도자료","입법예고·규정변경예고","고시·공고·훈령","기타 게시판"]},
 {agency:"금융감독원",boards:["기타 게시판"]},
 {agency:"금융보안원",boards:["가이드","보도자료","레그테크","기타 게시판"]},
 {agency:"방송미디어통신위원회",boards:["보도자료","기타 게시판"]}
];
function sourceInfo(i){
 const u=i.sourceUrl||"";
 if(/^https:\/\/(?:www\.)?cve\.org\//.test(u))return {agency:"CVE Program",board:"CVE 등록정보"};
 if(/^https:\/\/nvd\.nist\.gov\//.test(u))return {agency:"NIST NVD",board:"취약점 분석·CVSS"};
 if(/^https:\/\/(?:www\.)?first\.org\/cvss\//.test(u))return {agency:"FIRST",board:"CVSS 표준·계산기"};
 if(/(?:^https:\/\/)(?:www\.)?pipc\.go\.kr\//.test(u))return {agency:"개인정보보호위원회",board:/bbsId=BS074(?:&|$)/.test(u)?"보도자료":/bbsId=BS217(?:&|$)/.test(u)?"안내서":"기타 게시판"};
 if(/^https:\/\/(?:www\.)?boho\.or\.kr\//.test(u))return {agency:"KISA",board:/bbsId=B0000133(?:&|$)/.test(u)?"보안공지":/bbsId=B0000132(?:&|$)/.test(u)?"보고서·가이드":"기타 게시판"};
 if(/^https:\/\/spam\.kisa\.or\.kr\//.test(u))return {agency:"KISA",board:"불법스팸 자료실"};
 if(/^https:\/\/(?:www\.)?kisa\.or\.kr\//.test(u))return {agency:"KISA",board:/\/401(?:\/|$|\?)/.test(u)?"공지사항":"기타 게시판"};
 if(/^https:\/\/(?:www\.)?fsc\.go\.kr\//.test(u))return {agency:"금융위원회",board:/\/no010101(?:\/|$|\?)/.test(u)?"보도자료":/\/po040301(?:\/|$|\?)/.test(u)?"입법예고·규정변경예고":/\/po040200(?:\/|$|\?)/.test(u)?"고시·공고·훈령":"기타 게시판"};
 if(/^https:\/\/(?:www\.)?fss\.or\.kr\//.test(u))return {agency:"금융감독원",board:"기타 게시판"};
 if(/^https:\/\/(?:www\.|regtech\.)?fsec\.or\.kr\//.test(u))return {agency:"금융보안원",board:u.includes("regtech.")?"레그테크":/\/bbs\/222(?:\/|$|\?)/.test(u)?"가이드":/\/bbs\/69(?:\/|$|\?)/.test(u)?"보도자료":"기타 게시판"};
 if(/^https:\/\/(?:www\.)?kmcc\.go\.kr\//.test(u))return {agency:"방송미디어통신위원회",board:/page=A05030000(?:&|$)|boardId=1113(?:&|$)/.test(u)?"보도자료":"기타 게시판"};
 return {agency:i.agency||"기관 미확인",board:"게시판 확인 필요"};
}
function refreshSourceFilters(){
 const scoped=D.items.filter(i=>!category||i.category===category);
 const agencies=[...new Set([...scoped.map(i=>sourceInfo(i).agency),...(category==="vulnerability"?vulnerabilitySources.map(s=>s.agency):[])])];
 const current=$("agency-filter").value;
 $("agency-filter").innerHTML='<option value="">전체 기관</option>'+agencies.map(a=>'<option value="'+esc(a)+'">'+esc(a)+' ('+scoped.filter(i=>sourceInfo(i).agency===a).length+')</option>').join("");
 $("agency-filter").value=agencies.includes(current)?current:"";
 const agency=$("agency-filter").value;
 const subset=scoped.filter(i=>!agency||sourceInfo(i).agency===agency);
 const boards=[...new Set([...subset.map(i=>sourceInfo(i).board),...(agency?(sourceCatalog.find(s=>s.agency===agency)?.boards||[]):[])])];
 const selected=$("board-filter").value;
 $("board-filter").innerHTML='<option value="">전체 게시판</option>'+boards.map(b=>'<option value="'+esc(b)+'">'+esc(b)+' ('+subset.filter(i=>sourceInfo(i).board===b).length+')</option>').join("");
 $("board-filter").value=boards.includes(selected)?selected:"";
}

function render(){
 refreshSourceFilters();
 $("vulnerability-sources").hidden=category!=="vulnerability";
 $("vulnerability-sources").innerHTML=vulnerabilitySources.map(s=>'<div><strong>'+esc(s.agency)+' · '+esc(s.board)+'</strong><p>'+esc(s.note)+'</p>'+link(s.url,"공식 사이트 열기")+'</div>').join("");
 const stage=$("stage").value;
 const list=D.items.filter(i=>(!category||i.category===category)&&(!stage||i.stage===stage)&&(!$("agency-filter").value||sourceInfo(i).agency===$("agency-filter").value)&&(!$("board-filter").value||sourceInfo(i).board===$("board-filter").value)&&(!$("status-filter").value||state(i)===$("status-filter").value));
 list.sort((a,b)=>$("sort").value==="deadline"?(a.deadline||"9999").localeCompare(b.deadline||"9999"):$("sort").value==="oldest"?(a.publishedAt||"").localeCompare(b.publishedAt||""):(b.publishedAt||"").localeCompare(a.publishedAt||""));
 $("count").textContent=list.length+" / 전체 "+D.items.length+"건";
 $("feed-title").textContent=category?(D.categories.find(c=>c.id===category)?.name||"티켓 처리 현황"):"전체 티켓";
 $("feed").innerHTML='<div class="issue-table-wrap"><table class="issue-table"><caption class="sr-only">분야별 규제 대응 티켓 목록</caption><thead><tr><th scope="col">티켓</th><th scope="col">제목</th><th scope="col">분야</th><th scope="col">처리 상태</th><th scope="col">입법·검토 단계</th><th scope="col">발표일</th><th scope="col">의견제출 기한</th></tr></thead><tbody>'+list.map(i=>'<tr data-id="'+esc(i.id)+'"><td class="issue-key">'+esc(i.id.toUpperCase())+'</td><td class="issue-title"><button data-id="'+esc(i.id)+'">'+esc(i.title)+'</button><small>'+esc(sourceInfo(i).agency)+' · '+esc(sourceInfo(i).board)+'</small></td><td>'+esc(D.categories.find(c=>c.id===i.category)?.name||i.category)+'</td><td><span class="status-chip" data-state="'+esc(state(i))+'">'+esc(state(i))+'</span></td><td><span class="badge">'+esc(i.stage)+'</span></td><td class="issue-date">'+esc(i.publishedAt)+'</td><td class="issue-date">'+esc(i.deadline||"—")+'</td></tr>').join("")+(!list.length?'<tr><td colspan="7" class="issue-empty">조건에 맞는 등록 자료가 없습니다. 0건은 해당 기관에 발표가 없다는 뜻이 아닙니다.</td></tr>':"")+'</tbody></table></div>';

 document.querySelectorAll("[data-category]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.category===category)));
}
function show(id){
 const i=D.items.find(x=>x.id===id);if(!i)return;activeId=id;
 $("detail-content").innerHTML='<p class="eyebrow">'+esc(sourceInfo(i).agency)+' · '+esc(sourceInfo(i).board)+'</p><h2 id="detail-title">'+esc(i.title)+'</h2><span class="badge">'+esc(i.stage)+'</span><dl><dt>발표일</dt><dd>'+esc(i.publishedAt)+'</dd><dt>공포일</dt><dd>'+esc(i.promulgatedAt||"미공포 / 해당 없음")+'</dd><dt>시행일</dt><dd>'+esc(i.effectiveAt||i.effectiveNote)+'</dd><dt>의견제출</dt><dd>'+esc(i.deadline||"해당 없음")+'</dd><dt>적용 대상</dt><dd>'+esc(i.applicability)+'</dd><dt>확인일</dt><dd>'+esc(i.checkedAt)+'</dd></dl>'+[["① 점검 개요",i.overview],[i.verification==="metadata-only"?"② 원문 검토 대기 · 제목·게시일만 수집":"② 발표 요약",i.summary],["③ 우리 업무 영향 · 실무 해석",i.impact],["④ 대응 방안·정책 변경 검토",i.response],["⑤ 실행 계획",i.plan]].map(([t,v])=>'<h3>'+t+'</h3><p>'+esc(v)+'</p>').join("")+'<p>'+link(i.sourceUrl,i.sourceLabel)+(i.relatedUrl?' · '+link(i.relatedUrl,"관련 보도자료"):"")+'</p>';
 $("detail-content").insertAdjacentHTML("beforeend",'<section class="panel"><h3>티켓 처리</h3><label>처리 상태<select id="ticket-status">'+steps.map(s=>'<option'+(state(i)===s?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></label><label>검토 메모 (선택)<textarea id="ticket-note" rows="3">'+esc(saved[id]?.note||"")+'</textarea></label><button id="save-ticket">변경 저장</button><p id="save-feedback" role="status"></p><p class="muted">이 브라우저에만 저장됩니다. Jira·GitHub·다른 기기와 동기화되지 않습니다. 개인정보·내부 증적을 입력하지 마세요.</p></section>');
 $("save-ticket").addEventListener("click",()=>{
 const status=$("ticket-status").value,note=$("ticket-note").value.trim();
 
 const next={...saved,[activeId]:{status,note,changedAt:new Date().toISOString()}};
 try{localStorage.setItem("regulatory-ticket-state",JSON.stringify(next));saved=next;render();$("save-feedback").textContent="이 브라우저에 저장했습니다."}catch{$("save-feedback").textContent="저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요."}
 });
 if(i.category==="vulnerability")$("detail-content").insertAdjacentHTML("afterbegin",'<div class="panel"><strong>취약점 정보</strong><p>CVE: '+esc(Array.isArray(i.cves)&&i.cves.length?i.cves.join(", "):"원문 확인 필요")+'</p><p>CVSS: '+esc(i.cvss||"점수·버전·출처 확인 필요")+'</p></div>');
 $("detail").showModal();
}
$("categories").innerHTML=[{id:"",name:"전체 분야"},...D.categories].map(c=>'<button data-category="'+c.id+'" aria-pressed="'+(c.id==="")+'">'+esc(c.name)+'<span class="nav-count">'+D.items.filter(i=>!c.id||i.category===c.id).length+'</span></button>').join("");
$("updated").textContent="마지막 반영 · "+D.updatedAt;
$("sync").textContent="dot 동기화 · "+D.sync.status;
$("sync-note").textContent=D.sync.note;
$("window").textContent=D.reviewWindow;
$("total").textContent=D.items.length;
$("pending").textContent=D.items.filter(i=>i.verification==="metadata-only"||i.stage==="원문 검토 대기").length;
$("unchecked").textContent=(D.collection?.sources||[]).filter(s=>s.status==="확인 필요").length;
$("coverage").innerHTML=D.coverage.map(c=>'<div><b>'+esc(D.categories.find(x=>x.id===c.category)?.name||c.category)+'</b><span class="badge">'+esc(c.status)+'</span><small>'+esc(c.note)+(c.checkedAt?' · '+esc(c.checkedAt):"")+'</small></div>').join("");
$("sources").innerHTML=D.categories.map(c=>'<div><h3>'+esc(c.name)+'</h3><p>'+link(c.url,c.agency)+'</p><p>'+esc(c.materials)+'</p><p>검토 초점 · '+esc(c.focus)+'</p></div>').join("");
$("prompt").textContent=D.syncPrompt;
$("categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b){category=b.dataset.category;$("agency-filter").value="";$("board-filter").value="";render()}});
$("feed").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)show(b.dataset.id)});
$("close").addEventListener("click",()=>$("detail").close());

$("status-filter").innerHTML+=steps.map(s=>'<option>'+esc(s)+'</option>').join("");
$("status-filter").addEventListener("change",render);
$("sort").addEventListener("change",render);
$("stage").addEventListener("change",render);
$("agency-filter").addEventListener("change",()=>{$("board-filter").value="";render()});
$("board-filter").addEventListener("change",render);
$("reset").addEventListener("click",()=>{category="";$("agency-filter").value="";$("board-filter").value="";$("stage").value="";$("status-filter").value="";$("sort").value="newest";render()});
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(D.syncPrompt);$("copy-status").textContent="동기화 지침을 복사했습니다. 기존 dot 브리핑 설정에 적용할 수 있습니다."}catch{$("prompt").parentElement.open=true;$("copy-status").textContent="자동 복사를 사용할 수 없습니다. 아래 지침을 선택해 복사해 주세요."}});
render();
$("refresh-data").addEventListener("click",()=>location.reload());
const collection=D.collection;
$("collection-status").textContent=collection ? "최근 수집 · "+collection.lastRunAt+" · "+collection.status+" · 신규 "+collection.added+"건 (본문 검토 전)" : "동기화 실행 → GitHub Run workflow → 완료 후 결과 새로고침";
if(collection){$("sources").insertAdjacentHTML("afterbegin",collection.sources.map(s=>'<div><h3>'+esc(s.name)+' · '+esc(s.status)+'</h3><p>'+esc(s.note)+' · 후보 '+esc(s.found)+'건</p></div>').join(""));}
