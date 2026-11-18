"use strict";
const D=window.BRIEFING_DATA;
const $=id=>document.getElementById(id);
let category="",activeId="";
const steps=["신규 접수","적용 여부 검토","대응 계획","조치 중","검증","완료","시행 대기","적용 제외","중복 종료"];
let saved={};try{const v=JSON.parse(localStorage.getItem("regulatory-ticket-state")||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))saved=v}catch{}
const state=i=>steps.includes(saved[i.id]?.status)?saved[i.id].status:"신규 접수";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const link=(url,label)=>{try{const u=new URL(url);return u.protocol==="https:"?'<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':esc(label)}catch{return esc(label)}};
function render(){
 const term=$("search").value.trim().toLowerCase(),stage=$("stage").value;
 const list=D.items.filter(i=>(!category||i.category===category)&&(!stage||i.stage===stage)&&(!term||JSON.stringify(i).toLowerCase().includes(term)));
 $("count").textContent=list.length+"건";
 $("feed").innerHTML='<div class="issue-table-wrap"><table class="issue-table"><caption class="sr-only">분야별 규제 대응 티켓 목록</caption><thead><tr><th scope="col">티켓</th><th scope="col">제목</th><th scope="col">분야</th><th scope="col">처리 상태</th><th scope="col">입법 단계</th><th scope="col">발표일</th><th scope="col">의견제출 기한</th></tr></thead><tbody>'+list.map(i=>'<tr data-id="'+esc(i.id)+'"><td class="issue-key">'+esc(i.id.toUpperCase())+'</td><td class="issue-title"><button data-id="'+esc(i.id)+'">'+esc(i.title)+'</button><small>'+esc(i.agency)+'</small></td><td>'+esc(D.categories.find(c=>c.id===i.category)?.name||i.category)+'</td><td><span class="status-chip">'+esc(state(i))+'</span></td><td><span class="badge">'+esc(i.stage)+'</span></td><td class="issue-date">'+esc(i.publishedAt)+'</td><td class="issue-date">'+esc(i.deadline||"—")+'</td></tr>').join("")+(!list.length?'<tr><td colspan="7" class="issue-empty">조건에 맞는 티켓이 없습니다.</td></tr>':"")+'</tbody></table></div>';

 document.querySelectorAll("[data-category]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.category===category)));
}
function show(id){
 const i=D.items.find(x=>x.id===id);if(!i)return;activeId=id;
 $("detail-content").innerHTML='<p class="eyebrow">'+esc(i.agency)+'</p><h2 id="detail-title">'+esc(i.title)+'</h2><span class="badge">'+esc(i.stage)+'</span><dl><dt>발표일</dt><dd>'+esc(i.publishedAt)+'</dd><dt>공포일</dt><dd>'+esc(i.promulgatedAt||"미공포 / 해당 없음")+'</dd><dt>시행일</dt><dd>'+esc(i.effectiveAt||i.effectiveNote)+'</dd><dt>의견제출</dt><dd>'+esc(i.deadline||"해당 없음")+'</dd><dt>적용 대상</dt><dd>'+esc(i.applicability)+'</dd><dt>확인일</dt><dd>'+esc(i.checkedAt)+'</dd></dl>'+[["① 점검 개요",i.overview],["② 법령·가이드 변경 요약 · 확인된 사실",i.summary],["③ 우리 업무 영향 · 실무 해석",i.impact],["④ 대응 방안·정책 변경 검토",i.response],["⑤ 실행 계획",i.plan]].map(([t,v])=>'<h3>'+t+'</h3><p>'+esc(v)+'</p>').join("")+'<p>'+link(i.sourceUrl,i.sourceLabel)+(i.relatedUrl?' · '+link(i.relatedUrl,"관련 보도자료"):"")+'</p>';
 $("detail-content").insertAdjacentHTML("beforeend",'<section class="panel"><h3>티켓 처리</h3><label>처리 상태<select id="ticket-status">'+steps.map(s=>'<option'+(state(i)===s?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></label><label>검토·종료 사유<textarea id="ticket-note" rows="3">'+esc(saved[id]?.note||"")+'</textarea></label><button id="save-ticket">변경 저장</button><p id="save-feedback" role="status"></p><p class="muted">이 브라우저에만 저장됩니다. Jira·GitHub·다른 기기와 동기화되지 않습니다. 개인정보·내부 증적을 입력하지 마세요.</p></section>');
 $("save-ticket").addEventListener("click",()=>{
 const status=$("ticket-status").value,note=$("ticket-note").value.trim();
 if(["완료","적용 제외","중복 종료"].includes(status)&&!note){$("save-feedback").textContent="종료 사유 또는 검증 결과를 입력해 주세요.";return}
 const next={...saved,[activeId]:{status,note,changedAt:new Date().toISOString()}};
 try{localStorage.setItem("regulatory-ticket-state",JSON.stringify(next));saved=next;render();$("save-feedback").textContent="이 브라우저에 저장했습니다."}catch{$("save-feedback").textContent="저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요."}
 });
 $("detail").showModal();
}
$("categories").innerHTML=[{id:"",name:"전체 분야"},...D.categories].map(c=>'<button data-category="'+c.id+'" aria-pressed="'+(c.id==="")+'">'+esc(c.name)+'</button>').join("");
$("updated").textContent="마지막 반영 · "+D.updatedAt;
$("sync").textContent="dot 동기화 · "+D.sync.status;
$("sync-note").textContent=D.sync.note;
$("window").textContent=D.reviewWindow;
$("total").textContent=D.items.length;
$("pending").textContent=D.items.filter(i=>/예고|예정/.test(i.stage)).length;
$("unchecked").textContent=D.coverage.filter(c=>c.status!=="확인된 변경 없음"&&c.status!=="확인 완료").length;
$("coverage").innerHTML=D.coverage.map(c=>'<div><b>'+esc(D.categories.find(x=>x.id===c.category)?.name||c.category)+'</b><span class="badge">'+esc(c.status)+'</span><small>'+esc(c.note)+(c.checkedAt?' · '+esc(c.checkedAt):"")+'</small></div>').join("");
$("sources").innerHTML=D.categories.map(c=>'<div><h3>'+esc(c.name)+'</h3><p>'+link(c.url,c.agency)+'</p><p>'+esc(c.materials)+'</p><p>검토 초점 · '+esc(c.focus)+'</p></div>').join("");
$("prompt").textContent=D.syncPrompt;
$("categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b){category=b.dataset.category;render()}});
$("feed").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)show(b.dataset.id)});
$("close").addEventListener("click",()=>$("detail").close());
$("search").addEventListener("input",render);
$("stage").addEventListener("change",render);
$("reset").addEventListener("click",()=>{category="";$("search").value="";$("stage").value="";render()});
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(D.syncPrompt);$("copy-status").textContent="동기화 지침을 복사했습니다. 기존 dot 브리핑 설정에 적용할 수 있습니다."}catch{$("prompt").parentElement.open=true;$("copy-status").textContent="자동 복사를 사용할 수 없습니다. 아래 지침을 선택해 복사해 주세요."}});
render();
$("refresh-data").addEventListener("click",()=>location.reload());
const collection=D.collection;
$("collection-status").textContent=collection ? "최근 수집 · "+collection.lastRunAt+" · "+collection.status+" · 신규 "+collection.added+"건 (본문 검토 전)" : "동기화 실행 → GitHub Run workflow → 완료 후 결과 새로고침";
if(collection){$("sources").insertAdjacentHTML("afterbegin",collection.sources.map(s=>'<div><h3>'+esc(s.name)+' · '+esc(s.status)+'</h3><p>'+esc(s.note)+' · 후보 '+esc(s.found)+'건</p></div>').join(""));}
