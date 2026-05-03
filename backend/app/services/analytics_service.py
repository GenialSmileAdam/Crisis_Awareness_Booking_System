import os
from groq import Groq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.risk_scores import RiskScore
from app.models.wellness_checkins import WellnessCheckin, WellnessCheckinType
from app.models.appointments import Appointment
from app.models.crisis_logs import CrisisLog
from datetime import datetime, timedelta

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

async def get_real_chart_data(db: AsyncSession):
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    
    # Risk distribution
    risk_dist_query = select(RiskScore.tier, func.count(RiskScore.id)).group_by(RiskScore.tier)
    risk_dist = {row[0]: row[1] for row in (await db.execute(risk_dist_query)).all()}
    
    # Average WRS by faculty (assuming class_level as proxy)
    faculty_avg_query = select(func.avg(RiskScore.wrs_score)).group_by(RiskScore.student_id)  # Simplified
    faculty_avg = {"Engineering": 60, "Science": 55, "Arts": 50, "Law": 65, "Computing": 58}  # Placeholder, adjust with real faculty data
    
    # WRS trend over time
    trend_query = select(func.date(RiskScore.computed_at), func.avg(RiskScore.wrs_score)).group_by(func.date(RiskScore.computed_at)).order_by(func.date(RiskScore.computed_at))
    wrs_trend = {str(row[0]): row[1] for row in (await db.execute(trend_query)).all()}
    
    # High risk proportion
    high_risk_query = select(func.count(RiskScore.id)).where(RiskScore.tier.in_(["red", "critical"]))
    high_risk_count = (await db.execute(high_risk_query)).scalar() or 0
    total_risk = (await db.execute(select(func.count(RiskScore.id)))).scalar() or 1
    high_risk_prop = high_risk_count / total_risk
    
    # Faculty risk heatmap (simplified)
    heatmap = {"Engineering": {"green": 10, "amber": 5, "red": 2, "critical": 1}}  # Placeholder
    
    return {
        "risk_distribution": risk_dist,
        "faculty_avg": faculty_avg,
        "wrs_trend": wrs_trend,
        "high_risk_proportion": high_risk_prop,
        "faculty_risk_heatmap": heatmap
    }

def generate_insights(charts: dict):
    # Format chart data into a prompt for Grok
    chart_summary = "\n".join([f"{key}: {str(value)}" for key, value in charts.items()])
    
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": """You are an analytics assistant for SafeSpace psychologists. Summarize and provide insights on the provided dashboard chart data. Focus on trends, risks, and recommendations. Keep it concise, professional, and NDPR-compliant. Explain the purpose of each chart/plot to help psychologists understand their value. Include AI-based risk predictions for future trends."""
            },
            {
                "role": "user",
                "content": f"Dashboard Charts Data:\n{chart_summary}\n\nProvide a summary and key insights for each chart, explaining their purpose. Predict future risks based on trends."
            }
        ],
    )
    
    return response.choices[0].message.content.strip()