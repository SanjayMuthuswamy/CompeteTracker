import feedparser
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup
import re 
# 🌟 Import the function by the final, simple name 🌟
from summarizer import summarize_text # Corrected to summarize_text

# ----------------------------------------------------------------------
# --- COMPETITOR DATA MANAGEMENT (Updated) ---
# ----------------------------------------------------------------------

# 🌟 This is the master list of all competitors 🌟
COMPETITORS = [
    {
        "name": "TechCrunch",
        "rss": "http://feeds.feedburner.com/TechCrunch/",
        "website": "https://techcrunch.com",
        "description": "Leading technology news and startup coverage.", # Added default description
    },
    {
        "name": "The Verge",
        "rss": "https://www.theverge.com/rss/index.xml",
        "website": "https://www.theverge.com",
        "description": "Tech news, reviews, and culture.",
    },
    {
        "name": "VentureBeat AI",
        "rss": "https://venturebeat.com/category/ai/feed/",
        "website": "https://venturebeat.com",
        "description": "Transformative technology news for business leaders.",
    }
]

def add_competitor(name: str, rss_link: str, webpage_link: str, description: str = ""):
    """Adds a new competitor dictionary to the global COMPETITORS list."""
    new_competitor = {
        "name": name,
        "rss": rss_link,
        "website": webpage_link,
        "description": description
    }
    # Check if a competitor with the same name already exists
    if any(c["name"] == name for c in COMPETITORS):
        print(f"Competitor '{name}' already exists. Skipping addition.")
        return False
        
    COMPETITORS.append(new_competitor)
    print(f"Competitor '{name}' added successfully.")
    return True

# ----------------------------------------------------------------------
# --- SCRAPING AND SUMMARIZATION LOGIC (Unchanged/Refined) ---
# ----------------------------------------------------------------------

# --- Extract clean text from a URL (FIXED FOR AI TRENDS) ---
def extract_text_from_url(url: str) -> str:
    try:
        # Use a common user-agent
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
        r = requests.get(url, headers=headers, timeout=15)
        r.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        
        # Use 'lxml' parser which is generally faster and more fault-tolerant
        soup = BeautifulSoup(r.text, "lxml") 

        # Remove irrelevant tags (scripts, styles, navigation, footer, ads)
        for selector in ["script", "style", "nav", "footer", "aside", ".sidebar", ".ad", ".banner-unit"]:
            for tag in soup.find_all(selector):
                tag.decompose()

        # 🌟 IMPROVED TARGETING: Added 'td-post-content' (common for AI TRENDS) 🌟
        main_content_tags = soup.find_all([
            'article', 
            'main', 
            {'id': re.compile(r'content|main|article', re.I)}, 
            # Added td-post-content for better coverage of AI Trends
            {'class': re.compile(r'content|article|post|body|story|td-post-content', re.I)} 
        ])

        if main_content_tags:
            # Use the first successful finding
            main_element = main_content_tags[0]
            
            # Extract only the text from paragraphs within the main element
            article_paragraphs = [p.get_text(strip=True) for p in main_element.find_all('p')]
            article_text = "\n\n".join(article_paragraphs)
            
            # Fallback logic
            if len(article_text) < 100: 
                text = main_element.get_text(separator="\n")
            else:
                text = article_text
        else:
            # If no main content tag found, fall back to simple full-page extraction
            text = soup.get_text(separator="\n")


        # Clean up text: collapse multiple newlines, remove lines that are mostly whitespace/punctuation
        lines = [line.strip() for line in text.splitlines()]
        
        # Filter out very short or non-substantive lines (e.g., "Skip to content")
        lines = [line for line in lines if len(line) > 20 or re.search(r'[a-zA-Z]{3,}', line)]
        
        # Join the remaining clean text
        clean_text = "\n".join(lines)
        
        return clean_text
        
    except requests.exceptions.RequestException:
        # Request failed (timeout, 404, connection error)
        return ""
    except Exception as e:
        # General scraping/parsing error
        print(f"Error extracting text from {url}: {e}")
        return ""

# --- Fetch RSS feed items (unchanged) ---
def fetch_rss_items(rss_url: str, limit: int = 5):
    try:
        feed = feedparser.parse(rss_url)
        return [{"title": e.get("title"), "url": e.get("link")} for e in feed.entries[:limit]]
    except Exception:
        return []

# --- Fetch article content (UPDATED to include summarization) ---
def fetch_article_content(entry: dict) -> dict:
    # 1. Scrape the full article text
    text = extract_text_from_url(entry["url"])
    
    # 2. 🌟 Generate Summary using the imported function 🌟
    # Call the correctly imported function: summarize_text
    summary_data = summarize_text(text) 
    
    # 3. Combine entry data, full content, and summary data
    return {
        **entry, 
        "content": text,
        # The main summary field should use the 'insight' or first bullet for a preview
        "summary": summary_data.get('insight', summary_data.get('bullets', ['Error'])[0]),
        "bullets": summary_data.get('bullets', []),
        "insight": summary_data.get('insight', 'N/A'),
        "tags": summary_data.get('tags', [])
    }

# --- Fetch and extract all articles for a competitor (unchanged) ---
def fetch_and_extract(competitor: dict, rss_limit: int = 5, workers: int = 3):
    rss = competitor.get("rss")
    if not rss:
        return []

    items = fetch_rss_items(rss, limit=rss_limit)
    results = []

    # Use ThreadPoolExecutor to fetch article content concurrently
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(fetch_article_content, item): item for item in items}
        for fut in as_completed(futures):
            try:
                results.append(fut.result())
            except Exception:
                continue
    return results