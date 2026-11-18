"""Fetch official bulletin metadata; never infer legal duties or effective dates."""
import concurrent.futures, datetime as dt, hashlib, json, os, re, urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, parse_qsl, urlencode, urlunsplit

DATE=re.compile(r"(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})")
KEEP={"nttId","bbsId","noticeId","postSeq","boardId","boardSeq","seq","id","idx","mId","mode"}
class Rows(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.stack=[]; self.a=None
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in ("tr","li"): self.stack.append({"tag":tag,"text":[],"links":[]})
        if tag=="a":
            self.a={"url":attrs.get("href",""),"text":[],"onclick":attrs.get("onclick","")}
    def handle_data(self, data):
        for r in self.stack: r["text"].append(data)
        if self.a is not None: self.a["text"].append(data)
    def handle_endtag(self, tag):
        if tag=="a" and self.a is not None:
            for r in self.stack: r["links"].append(self.a.copy())
            self.a=None
        if self.stack and tag==self.stack[-1]["tag"]:
            self.rows.append(self.stack.pop())
def canonical(url):
    p=urlsplit(url)
    return urlunsplit((p.scheme,p.netloc,p.path,urlencode(sorted((k,v) for k,v in parse_qsl(p.query) if k in KEEP)), ""))
def candidates(html, source, start, end):
    parser=Rows(); parser.feed(html); out={}
    for row in parser.rows:
        m=DATE.search(" ".join(row["text"]))
        if not m: continue
        try: date=dt.date(*map(int,m.groups()))
        except ValueError: continue
        if not start<=date<=end: continue
        for a in row["links"]:
            title=" ".join(" ".join(a["text"]).split())
            if len(title)<8 or not re.search(source["keywords"], title, re.I): continue
            if re.search(r"채용|입찰|공모전|협약식|총회",title): continue
            href=a["url"]
            if "pipc.go.kr" in source["url"] and (href.startswith("javascript") or href=="#"):
                match=re.search(r"(?:fn_select|fnSelect|fn_view|fnView)[^(]*\([^)]*?['\"](\d{3,})['\"]",href+" "+a["onclick"])
                if match:
                    href=source["url"].replace("selectBoardList","selectBoardArticle")+"&nttId="+match.group(1)
            url=urljoin(source["url"],href)
            if urlsplit(url).scheme!="https" or urlsplit(url).netloc!=urlsplit(source["url"]).netloc: continue
            if not re.search(source["detail"],url): continue
            key=canonical(url)
            out[key]={"title":title,"sourceUrl":key,"publishedAt":date.isoformat()}
    return list(out.values())
def fetch_source(source,start,end):
    try:
        req=urllib.request.Request(source["url"],headers={"User-Agent":"SecurityBriefing/1.0 (public bulletin metadata)"})
        with urllib.request.urlopen(req, timeout=25) as r:
            raw=r.read(4_000_001)
            if len(raw)>4_000_000: raise ValueError("response too large")
            html=raw.decode(r.headers.get_content_charset() or "utf-8",errors="replace")
        rows=candidates(html,source,start,end)
        # HTTP 200 alone is not proof that the board was parsed.
        parser=Rows();parser.feed(html)
        dated=any(DATE.search(" ".join(row["text"])) for row in parser.rows)
        return source,rows,("일부 확인" if dated else "확인 필요"),("게시판 첫 페이지 수집; 전체 기간 망라 아님" if dated else "게시판 구조·차단 여부 확인 필요")
    except Exception as e:
        return source,[],"확인 필요",type(e).__name__+": 원문 접근 실패"
def run():
    path=Path("data.js"); raw=path.read_text(encoding="utf-8")
    data=json.loads(raw.split("=",1)[1].strip().rstrip(";"))
    sources=json.loads(Path("sources.json").read_text(encoding="utf-8"))
    now=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))); end=now.date()
    days=int(os.getenv("LOOKBACK_DAYS","30")); days=max(1,min(days,365))
    start=end-dt.timedelta(days=days-1)
    known={canonical(i["sourceUrl"]) for i in data["items"]}
    known.update(canonical(i["relatedUrl"]) for i in data["items"] if i.get("relatedUrl"))
    report=[]; added=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda s:fetch_source(s,start,end),sources))
    for source,rows,status,note in results:
        report.append({"name":source["name"],"category":source["category"],"url":source["url"],"status":status,"found":len(rows),"note":note})
        for row in rows:
            if row["sourceUrl"] in known: continue
            known.add(row["sourceUrl"]);added+=1
            category=source["category"]
            if category=="incident" and re.search(r"CVE-\d{4}-\d+|CVSS|보안\s*업데이트|보안취약점|제품.*취약점|취약점.*패치",row["title"],re.I): category="vulnerability"
            if source["name"].startswith("금융위원회") and re.search("신용정보|마이데이터",row["title"]): category="credit"
            data["items"].append(dict(row,id="auto-"+hashlib.sha256(row["sourceUrl"].encode()).hexdigest()[:12],category=category,agency=source["name"],stage="원문 검토 대기",promulgatedAt=None,effectiveAt=None,effectiveNote="원문·첨부파일 확인 필요",deadline=None,applicability="적용 대상 확인 필요",sourceLabel="공식 게시판 원문",checkedAt=end.isoformat(),overview="공식 게시판의 제목·게시일·링크를 자동 수집한 검토 후보입니다.",summary="본문·첨부파일의 변경 내용은 아직 검증하지 않았습니다. 원문 검토 후 요약을 작성하세요.",impact="[검토 대기] 실제 사용 기술·서비스와 법 적용 대상을 대조해야 합니다.",response="[제안] 공식 원문과 첨부파일을 확인하고 법령·고시 사항은 국가법령정보센터와 대조합니다.",plan="[제안] 적용 여부, 발표일·시행일·경과조치 확인 후 대응 방안과 담당 부서를 협의합니다.",verification="metadata-only"))
    data["items"].sort(key=lambda i:i.get("publishedAt") or "",reverse=True)
    data["updatedAt"]=now.strftime("%Y-%m-%d %H:%M KST")
    data["reviewWindow"]=f"{start} ~ {end} · 연결 게시판 첫 페이지, 기존 자료 보존"
    data["collection"]={"lastRunAt":now.isoformat(),"added":added,"sources":report,"status":"일부 확인" if any(r["status"]=="일부 확인" for r in report) else "실패"}
    for c in data["coverage"]:
        matching=[r for r in report if r["category"]==c["category"] or (c["category"]=="vulnerability" and r["category"]=="incident")]
        c.update(status="일부 확인" if any(r["status"]=="일부 확인" for r in matching) else "확인 필요",checkedAt=end.isoformat(),note=" / ".join(r["name"]+": "+r["note"] for r in matching) or "자동 수집 연결 미완료; 공식 원문 수동 확인 필요")
    tmp=Path("data.js.tmp")
    tmp.write_text("window.BRIEFING_DATA = "+json.dumps(data,ensure_ascii=False,indent=2)+";\n",encoding="utf-8")
    tmp.replace(path)
    summary="# 기관 자료 동기화\n\n신규 후보: "+str(added)+"건\n\n"+"\n".join("- "+r["name"]+": "+r["status"]+" ("+str(r["found"])+"건) — "+r["note"] for r in report)+"\n\n시행일·법적 의무 자동 판단 없음. 첫 페이지 수집이며 전체 기관·자료를 망라하지 않습니다.\n"
    print(summary)
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as f:f.write(summary)
if __name__=="__main__": run()
