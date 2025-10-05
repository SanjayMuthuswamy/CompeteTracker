import json
import datetime
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc, or_
import logging

# 🌟 NEW IMPORTS FOR MAILING AND SCHEDULING 🌟
from flask_mail import Mail, Message
from threading import Thread
import time 

# --- Import from your modules ---
from models import init_db, SessionLocal, Article, Competitor
from fetcher import fetch_and_extract 
from summarizer import summarize_text 

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
CORS(app)  # Allow CORS for all origins during development

# 🌟 FLASK-MAIL CONFIGURATION 🌟
# NOTE: REPLACE THESE WITH YOUR ACTUAL SMTP DETAILS!
app.config['MAIL_SERVER'] = 'smtp.gmail.com' # Example for Gmail
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'nandhu6256@gmail.com'  # <-- REPLACE THIS
app.config['MAIL_PASSWORD'] = 'vbckfpzlrjaxamji'     # <-- REPLACE THIS (Use an App Password!)
app.config['MAIL_DEFAULT_SENDER'] = 'nandhu6256@gmail.com'


mail = Mail(app)
init_db()

# --- Helper function for DB session ---
def get_db():
    db = SessionLocal()
    return db

# --- Define severity keywords for KPI calculation ---
CRITICAL_KPI_KEYWORDS = [
    '%critical%', 
    '%vulnerability%', 
    '%threat%', 
    '%lawsuit%',
    '%top 10%', 
    '%transform%' 
]
# Define high-priority keywords for digest generation
HIGH_PRIORITY_KEYWORDS = ['critical', 'vulnerability', 'threat', 'major security', 
                          'major outage', 'lawsuit', 'acquisition', 'top 10', 'transform']

# ----------------------------------------------------
# 🌟 MAILER FUNCTIONS (Used by Scheduler and Manual Send) 🌟
# ----------------------------------------------------

def send_async_email(app, msg):
    """Sends email asynchronously to prevent blocking the web server."""
    with app.app_context():
        try:
            mail.send(msg)
            logging.info(f"Digest email sent successfully to {msg.recipients[0]}")
        except Exception as e:
            logging.error(f"Failed to send email: {e}")

def create_digest_content(insights):
    """Generates the HTML content for the digest email."""
    if not insights:
        return "<h1>CompeteTrack Weekly Digest</h1><p>No new high-priority insights were found this week.</p>"

    html_content = "<h1>CompeteTrack Weekly Digest</h1>"
    html_content += f"<p>Here are **{len(insights)}** high-priority competitor insights from the last week:</p>"
    html_content_list = "<ul style='list-style: none; padding-left: 0;'>"

    for i in insights:
        html_content_list += f"""
        <li style="margin-bottom: 25px; padding: 15px; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9;">
            <strong style="color: #c0392b; font-size: 1.1em;">[{i['competitor']}] {i['title']}</strong>
            <p style="margin-top: 5px; color: #333;">{i['summary']}</p>
            <p style="font-size: 0.8em; color: #888;">
                Priority: {i['priority']} | Category: {i['category']}
            </p>
            <a href='{i['source_url']}' target='_blank' style="color: #2980b9; text-decoration: none;">View Source Article &rarr;</a>
        </li>
        """
    html_content_list += "</ul>"
    
    return html_content + html_content_list

def send_weekly_digest(recipient_email, insights_data):
    """Initiates the sending of the email."""
    msg = Message(
        subject=f"CompeteTrack Digest: {len(insights_data)} New High-Priority Insights",
        recipients=[recipient_email],
        html=create_digest_content(insights_data)
    )
    Thread(target=send_async_email, args=(app, msg)).start()

# ----------------------------------------------------
# 🌟 TASK SCHEDULER (Background Task) 🌟
# ----------------------------------------------------

# Global state to track the last digest day sent
LAST_DIGEST_SENT_DAY = None 

def run_weekly_scheduler():
    """Checks if the digest should be sent based on the day."""
    global LAST_DIGEST_SENT_DAY
    
    # Check every 6 hours
    INTERVAL_SECONDS = 6 * 3600 
    
    while True:
        time.sleep(INTERVAL_SECONDS)
        
        now = datetime.datetime.now()
        current_day = now.strftime('%A') 
        
        # Hardcoded schedule based on the screenshot: Monday
        SCHEDULED_DAY = "Monday" 
        RECIPIENT_EMAIL = "nandhu6256@gmail.com" # Hardcoded email from the screenshot
        
        if current_day == SCHEDULED_DAY and current_day != LAST_DIGEST_SENT_DAY:
            
            db = get_db()
            try:
                seven_days_ago = datetime.datetime.utcnow() - timedelta(days=7)
                articles_query = db.query(Article).filter(
                    Article.fetched_at >= seven_days_ago
                ).all()

                high_priority_insights = []
                
                for a in articles_query:
                    full_text = a.title.lower() + (a.summary.lower() if a.summary else "")
                    
                    if any(k in full_text for k in HIGH_PRIORITY_KEYWORDS):
                        main_summary = "Action required."
                        category = "General"
                        try:
                            summary_data = json.loads(a.summary)
                            main_summary = summary_data.get("insight") or summary_data.get("bullets", [""])[0]
                            category = summary_data.get("tags", ["General"])[0] 
                        except:
                            pass 

                        high_priority_insights.append({
                            'competitor': a.competitor,
                            'title': a.title,
                            'summary': main_summary,
                            'source_url': a.url,
                            'priority': 'High Priority',
                            'category': category
                        })

                if high_priority_insights:
                    logging.info(f"Scheduled run triggered: sending digest with {len(high_priority_insights)} insights.")
                    send_weekly_digest(RECIPIENT_EMAIL, high_priority_insights)
                    LAST_DIGEST_SENT_DAY = current_day # Mark as sent
                else:
                    logging.info("Scheduled run: No high-priority insights to send.")
                    LAST_DIGEST_SENT_DAY = current_day # Still mark as checked for today
                    
            except Exception as e:
                logging.error(f"Error during scheduled digest run: {e}")
            finally:
                db.close()
        
        elif current_day != SCHEDULED_DAY:
            # Reset the global state when the day changes
            LAST_DIGEST_SENT_DAY = None

# ----------------------------------------------------
# API ENDPOINTS
# ----------------------------------------------------

# 1️⃣ Competitor Management
@app.route('/api/competitors', methods=['GET'])
def get_competitor_details():
    db = get_db()
    try:
        competitors = db.query(Competitor).all()
        
        comp_list = [{
            "name": c.name,
            "website": c.website,
            "rss": c.rss,
            "description": c.description or "AI/SaaS competitor"
        } for c in competitors]
        
        return jsonify(comp_list)
    finally:
        db.close()

@app.route('/api/add-competitor', methods=['POST'])
def add_competitor_to_db():
    db = get_db()
    data = request.get_json()
    
    name = data.get('competitor_name')
    rss_link = data.get('rss_link')
    webpage_link = data.get('webpage_link')
    description = data.get('description', '') 

    if not all([name, rss_link, webpage_link]):
        return jsonify({'message': 'Missing required fields: name, RSS, or website.', 'status': 'error'}), 400
    
    try:
        new_competitor = Competitor(
            name=name,
            website=webpage_link,
            rss=rss_link,
            description=description
        )
        db.add(new_competitor)
        db.commit()
        return jsonify({
            'message': f'Competitor "{name}" successfully added to the database.', 
            'status': 'success'
        }), 201
    
    except IntegrityError:
        db.rollback()
        return jsonify({'message': f'Competitor "{name}" already exists.', 'status': 'error'}), 409 

    except Exception as e:
        logging.error(f"Error adding competitor: {e}")
        db.rollback()
        return jsonify({'message': 'Internal Server Error during save.', 'status': 'error'}), 500
    finally:
        db.close()

@app.route('/api/competitors/<string:competitor_name>', methods=['DELETE'])
def delete_competitor(competitor_name):
    db = get_db()
    try:
        competitor = db.query(Competitor).filter(Competitor.name == competitor_name).first()

        if not competitor:
            return jsonify({'message': f'Competitor "{competitor_name}" not found.', 'status': 'error'}), 404

        db.query(Article).filter(Article.competitor == competitor_name).delete(synchronize_session=False)
        db.delete(competitor)
        db.commit()

        return jsonify({'message': f'Competitor "{competitor_name}" and associated articles deleted successfully.', 'status': 'success'}), 200

    except Exception as e:
        logging.error(f"Error deleting competitor {competitor_name}: {e}")
        db.rollback()
        return jsonify({'message': f'Internal Server Error during deletion: {str(e)}', 'status': 'error'}), 500
    finally:
        db.close()


# 2️⃣ Fetch & Summarize Articles
@app.route('/api/fetch-and-summarize', methods=['POST'])
def fetch_and_summarize_data():
    body = request.json or {}
    name = body.get('competitor_name')
    db = get_db()
    
    try:
        db_comp = db.query(Competitor).filter(Competitor.name == name).first()
        if not db_comp:
            return jsonify({'error': f'Competitor {name} not found in database'}), 404

        comp = {
            "name": db_comp.name,
            "rss": db_comp.rss,
            "website": db_comp.website
        }

        items = fetch_and_extract(comp, rss_limit=5, workers=3)
        new_articles_count = 0

        for item in items:
            url = item.get('url')
            if db.query(Article).filter(Article.url == url).first():
                continue

            summary_dict = {
                "insight": item.get('insight', 'N/A'),
                "bullets": item.get('bullets', []),
                "tags": item.get('tags', [])
            }

            article = Article(
                competitor=name,
                url=url,
                title=item.get('title'),
                content=item.get('content'),
                summary=json.dumps(summary_dict),
                fetched_at=datetime.datetime.utcnow(),
                status='pending'
            )

            try:
                db.add(article)
                db.commit()
                new_articles_count += 1
            except IntegrityError:
                db.rollback()
                continue

        return jsonify({
            'message': f"Processed {len(items)} items. Added {new_articles_count} new articles/insights for {name}.",
            'new_articles_count': new_articles_count
        })
        
    except Exception as e:
        logging.error(f"Error in fetch-and-summarize: {e}")
        db.rollback()
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500
    finally:
        db.close()


# 3️⃣ Dashboard Feed
@app.route('/api/dashboard-feed', methods=['GET'])
def get_dashboard_feed():
    db = get_db()
    try:
        articles = db.query(Article).order_by(desc(Article.fetched_at)).limit(20).all()
        feed_data = []
        
        CRITICAL_KEYWORDS = ['critical', 'vulnerability', 'threat', 'major security', 'major outage', 'lawsuit', 'acquisition', 'top 10', 'transform']
        MEDIUM_KEYWORDS = ['launch', 'new feature', 'pricing change', 'high priority', 'review', 'guide', 'easier']

        for a in articles:
            severity = "Normal"
            main_summary = a.summary
            tags = ["General"]

            full_text = a.title.lower()
            
            try:
                summary_data = json.loads(a.summary)
                main_summary = summary_data.get("insight") or summary_data.get("bullets", [""])[0]
                tags = summary_data.get("tags", ["General"])
                
                full_text += " " + main_summary.lower()
                normalized_tags = [t.lower().strip() for t in tags]
                full_text += " " + " ".join(normalized_tags) 
                
            except Exception as e:
                logging.warning(f"Summary for article ID {a.id} is not valid JSON. Using raw summary. Error: {e}")
                full_text += " " + a.summary.lower()
                tags = ["Parsing Error"]

            # SEVERITY DETERMINATION
            if any(k in full_text for k in CRITICAL_KEYWORDS):
                severity = "Critical"
            elif any(k in full_text for k in MEDIUM_KEYWORDS):
                severity = "Medium"
            
            if "Parsing Error" in tags:
                severity = "Error"
            
            feed_data.append({
                "id": a.id,
                "competitor": a.competitor,
                "time_ago": a.fetched_at.strftime('%Y-%m-%d %H:%M'),
                "title": a.title,
                "summary": main_summary,
                "tags": tags,
                "source_url": a.url,
                "status": a.status,
                "severity": severity
            })
        return jsonify(feed_data)
    finally:
        db.close()


# 4️⃣ Insights Page (FIXED CATEGORY LOGIC)
@app.route('/api/insights', methods=['GET'])
def get_insights():
    db = get_db()
    
    # Use the shared HIGH_PRIORITY_KEYWORDS
    
    try:
        articles_as_insights = db.query(Article).filter(
            Article.status.in_(['pending', 'actioned_note_added'])
        ).order_by(desc(Article.fetched_at)).all()
        
        insights_data = []
        high_priority_count = 0

        # 🌟 CATEGORY FIX: Define generic tags to ignore 🌟
        GENERIC_TAGS = ['general', 'product', 'pricing', 'update', 'launch', 'feature', 'review', 'analysis', 'tech', 'saas', 'ai']
        
        for a in articles_as_insights:
            priority = "Medium Priority"
            category = "General"
            competitor_name = a.competitor

            full_text = a.title.lower()
            main_summary = "No actionable insight provided."
            insight_tags = []

            try:
                summary = json.loads(a.summary)
                main_summary = summary.get("insight") or summary.get("bullets", [""])[0]
                insight_tags = summary.get("tags", [])
                
                full_text += " " + main_summary.lower()
                normalized_tags = [t.lower().strip() for t in insight_tags]
                full_text += " " + " ".join(normalized_tags) 
                
                # Find the first tag that is NOT generic to use as the main Category
                specific_category = next(
                    (t for t in normalized_tags if t not in GENERIC_TAGS and t), 
                    "General" 
                )
                category = specific_category.title()

            except Exception:
                full_text += " " + a.summary.lower()
                insight_tags = ["Parsing Error"]
                category = "Parsing Error"

            # Determine Priority
            if any(k in full_text for k in HIGH_PRIORITY_KEYWORDS):
                priority = "High Priority"
                high_priority_count += 1
            
            insights_data.append({
                "id": a.id,
                "competitor": competitor_name,
                "title": a.title,
                "summary": main_summary,
                "category": category,
                "priority": priority,
                "status": a.status,
                "action_notes": None,
                "tags": insight_tags
            })
            
        # KPI Counts
        total_pending = db.query(Article).filter(Article.status == 'pending').count()
        
        return jsonify({
            "insights": insights_data,
            "kpis": {
                "pending_actions": total_pending,
                "high_priority": high_priority_count,
                "total_insights": db.query(Article).count()
            }
        })
    finally:
        db.close()

@app.route('/api/insights/<int:article_id>/status', methods=['PUT'])
def update_insight_status(article_id):
    db = get_db()
    data = request.get_json()
    new_status = data.get('status')
    
    try:
        article = db.query(Article).filter(Article.id == article_id).first()
        if article:
            article.status = new_status
            db.commit()
            return jsonify({"message": f"Insight {article_id} status updated to {new_status}."}), 200
        return jsonify({"error": "Insight not found."}), 404
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# 5️⃣ KPI Data
@app.route('/api/dashboard/kpis', methods=['GET'])
def get_kpis():
    db = get_db()
    try:
        pending_count = db.query(Article).filter(Article.status == 'pending').count()
        
        critical_count_query = db.query(Article)
        critical_conditions = [Article.title.ilike(k) for k in CRITICAL_KPI_KEYWORDS]
        
        if critical_conditions:
            critical_count_query = critical_count_query.filter(or_(*critical_conditions))

        critical_count = critical_count_query.count()

        one_day_ago = datetime.datetime.utcnow() - timedelta(hours=24)
        recent_count = db.query(Article).filter(Article.fetched_at >= one_day_ago).count()

        return jsonify({
            "unread_changes": pending_count,
            "critical_updates": critical_count,
            "last_24_hours": recent_count
        })
    finally:
        db.close()

# 6️⃣ Manual Digest Send Endpoint
@app.route('/api/send-digest-now', methods=['POST'])
def send_digest_now():
    """Immediately triggers the digest generation and sends the email."""
    
    RECIPIENT_EMAIL = "nandhu6256@gmail.com" # Hardcoded recipient based on screenshot
    db = get_db()
    now = datetime.datetime.utcnow()
    
    try:
        seven_days_ago = now - timedelta(days=7)
        
        articles_query = db.query(Article).filter(
            Article.fetched_at >= seven_days_ago
        ).all()

        high_priority_insights = []
        
        for a in articles_query:
            full_text = a.title.lower() + (a.summary.lower() if a.summary else "")
            
            if any(k in full_text for k in HIGH_PRIORITY_KEYWORDS):
                main_summary = "Action required."
                category = "General"
                try:
                    summary_data = json.loads(a.summary)
                    main_summary = summary_data.get("insight") or summary_data.get("bullets", [""])[0]
                    category = summary_data.get("tags", ["General"])[0] 
                except:
                    pass 

                high_priority_insights.append({
                    'competitor': a.competitor,
                    'title': a.title,
                    'summary': main_summary,
                    'source_url': a.url,
                    'priority': 'High Priority',
                    'category': category
                })

        if high_priority_insights:
            logging.info(f"Manual send initiated: sending digest with {len(high_priority_insights)} insights to {RECIPIENT_EMAIL}.")
            send_weekly_digest(RECIPIENT_EMAIL, high_priority_insights)
            
            return jsonify({
                "message": f"Digest initiated. Check your inbox ({RECIPIENT_EMAIL}) soon.",
                "insights_count": len(high_priority_insights)
            }), 200
        else:
            return jsonify({
                "message": "Digest initiated, but no high-priority insights found in the last 7 days to send.",
                "insights_count": 0
            }), 200
            
    except Exception as e:
        logging.error(f"Error during manual digest run: {e}")
        return jsonify({'error': f'An error occurred during digest send: {str(e)}'}), 500
    finally:
        db.close()


# --- Initialize default competitors ---
def initialize_default_competitors():
    db = get_db()
    from fetcher import COMPETITORS as DEFAULT_COMPETITORS_LIST 
    try:
        for comp in DEFAULT_COMPETITORS_LIST:
            if not db.query(Competitor).filter(Competitor.name == comp['name']).first():
                db.add(Competitor(
                    name=comp['name'],
                    website=comp['website'],
                    rss=comp.get('rss'),
                    description=comp.get('description', 'Generic competitor source')
                ))
        db.commit()
    except Exception as e:
        logging.error(f"Error initializing competitors: {e}")
        db.rollback()
    finally:
        db.close()

# --- Run Flask App ---
def run_app():
    """Starts the scheduler thread and runs the Flask application."""
    # Start the scheduler in a separate thread
    scheduler_thread = Thread(target=run_weekly_scheduler)
    scheduler_thread.daemon = True 
    scheduler_thread.start()
    
    # use_reloader=False is crucial when starting threads
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False) 

if __name__ == '__main__':
    initialize_default_competitors()
    run_app()