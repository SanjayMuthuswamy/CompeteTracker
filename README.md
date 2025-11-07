# 🚀 CompeteTracker


## 1. Overview
**CompeteTracker** is a **Competitive Intelligence Tracker for Startups**.  
Startups often struggle to keep up with competitors’ product launches, feature updates, and marketing campaigns. **CompeteTracker** helps by continuously monitoring competitor activity, summarizing key changes, and delivering actionable insights in a digestible format.  

---

## 2. Features ✨
- 🌐 Monitor competitor websites, blogs, and press releases.  
- 📱 Track social media activity of competitors.  
- 📝 Summarize important updates automatically.  
- 📅 Generate daily or weekly digest emails.  
- 📊 Clean and interactive dashboard for competitor analysis.  

---

## 3. Tools Used 🛠️
- **Backend:** Python, FastAPI, BeautifulSoup, Newspaper3k, Requests  
- **Frontend:** React.js, TailwindCSS  
- **Database:** SQLite3  
- **Other Tools:** Cron jobs (for scheduling scraping), Axios (frontend API calls)  

---

## 4. How It Works ⚙️

### Backend 🔧
1. **Scraping & Monitoring:**  
   - Scrapes competitor websites, blogs, and press releases for updates.  
   - Monitors social media pages for new posts or announcements.  
2. **Summarization:**  
   - Uses AI/NLP models to summarize relevant content into actionable insights.  
3. **Database Storage:**  
   - Stores competitor updates, summaries, and timestamps.  
4. **API:**  
   - Provides REST endpoints to serve summarized competitor insights to the frontend.  
5. **Scheduling:**  
   - Periodic scraping and digest generation using cron jobs or background workers.  

### Frontend 💻
1. **Dashboard:**  
   - Displays top competitor updates, most active categories, and weekly trends.  
   - Provides filter and search functionality for competitors and categories.  
2. **Digest View:**  
   - Shows summarized insights for the day/week in an easy-to-read format.  
3. **Integration:**  
   - Fetches data from backend APIs and dynamically updates the UI.  

---

## 5. How to Run ▶️

```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Run server
python app.py

# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# OR build for production
npm run build



