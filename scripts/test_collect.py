import datetime as dt, unittest
from collect import candidates, canonical
class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.source={"url":"https://www.boho.or.kr/kr/bbs/list.do","keywords":"보안","detail":"view.do.*nttId="}
    def parse(self,html):
        return candidates(html,self.source,dt.date(2026,11,1),dt.date(2026,11,18))
    def test_title_date_url(self):
        rows=self.parse('<tr><td><a href="view.do?nttId=123&menuNo=2">DB 제품 보안 업데이트 권고</a></td><td>2026-11-17</td></tr>')
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]["publishedAt"],"2026-11-17")
    def test_external_and_future_rejected(self):
        self.assertEqual(self.parse('<tr><a href="https://evil.test/view.do?nttId=12">DB 제품 보안 업데이트 권고</a>2026-11-17</tr>'),[])
        self.assertEqual(self.parse('<tr><a href="view.do?nttId=12">DB 제품 보안 업데이트 권고</a>2026-12-01</tr>'),[])
    def test_missing_date_rejected(self):
        self.assertEqual(self.parse('<tr><a href="view.do?nttId=12">DB 제품 보안 업데이트 권고</a></tr>'),[])
    def test_canonical_dedup(self):
        self.assertEqual(canonical("https://a.test/view?nttId=1&menuNo=2"),canonical("https://a.test/view?menuNo=3&nttId=1"))
if __name__=="__main__": unittest.main()
