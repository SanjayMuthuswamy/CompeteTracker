from bs4 import BeautifulSoup
import requests
from newspaper import Article as NPArticle

def extract_text_from_url(url: str) -> str:
    try:
        a = NPArticle(url)
        a.download()
        a.parse()
        if a.text and len(a.text) > 100:
            return a.text
    except Exception:
        pass
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        paragraphs = soup.find_all('p')
        text = '\n'.join(p.get_text().strip() for p in paragraphs)
        return text[:20000]
    except Exception:
        return ""
