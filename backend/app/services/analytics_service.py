from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.appointments import Appointment
from app.models.crisis_logs import CrisisLog
from app.models.risk_scores import RiskScore
from app.models.students import Student
from app.models.wellness_checkins import WellnessCheckin


async def get_real_chart_data(db: AsyncSession) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Subquery: latest risk score timestamp per student (reused across queries)
    latest_scores_sq = (
        select(
            RiskScore.student_id,
            func.max(RiskScore.computed_at).label("max_at"),
        )
        .group_by(RiskScore.student_id)
        .subquery()
    )

    # ── 1. Risk distribution — one entry per student, latest score only ───────
    dist_rows = (
        await db.execute(
            select(RiskScore.tier, func.count(RiskScore.id).label("n"))
            .join(
                latest_scores_sq,
                (RiskScore.student_id == latest_scores_sq.c.student_id)
                & (RiskScore.computed_at == latest_scores_sq.c.max_at),
            )
            .group_by(RiskScore.tier)
        )
    ).all()
    risk_distribution: dict[str, int] = {"green": 0, "amber": 0, "red": 0, "critical": 0}
    for row in dist_rows:
        key = row.tier.value if hasattr(row.tier, "value") else str(row.tier)
        risk_distribution[key] = row.n

    # ── 2. WRS trend — daily average over last 30 days ────────────────────────
    trend_rows = (
        await db.execute(
            select(
                func.date(RiskScore.computed_at).label("date"),
                func.avg(RiskScore.wrs_score).label("avg_wrs"),
                func.count(RiskScore.id).label("n"),
            )
            .where(RiskScore.computed_at >= thirty_days_ago)
            .group_by(func.date(RiskScore.computed_at))
            .order_by(func.date(RiskScore.computed_at))
        )
    ).all()
    wrs_trend = [
        {
            "date": str(row.date),
            "avg_wrs": round(float(row.avg_wrs), 1),
            "count": row.n,
        }
        for row in trend_rows
    ]

    # ── 3. Check-in volume by type, last 30 days (pivoted by date) ────────────
    vol_rows = (
        await db.execute(
            select(
                func.date(WellnessCheckin.submitted_at).label("date"),
                WellnessCheckin.type,
                func.count(WellnessCheckin.id).label("n"),
            )
            .where(WellnessCheckin.submitted_at >= thirty_days_ago)
            .group_by(
                func.date(WellnessCheckin.submitted_at),
                WellnessCheckin.type,
            )
            .order_by(func.date(WellnessCheckin.submitted_at))
        )
    ).all()
    vol_by_date: dict[str, dict] = defaultdict(
        lambda: {"date": "", "phq9": 0, "gad7": 0, "pulse": 0, "crisis": 0, "total": 0}
    )
    for row in vol_rows:
        d = str(row.date)
        t = row.type.value if hasattr(row.type, "value") else str(row.type)
        vol_by_date[d]["date"] = d
        if t in vol_by_date[d]:
            vol_by_date[d][t] += row.n
        vol_by_date[d]["total"] += row.n
    checkin_volume = sorted(vol_by_date.values(), key=lambda x: x["date"])

    # ── 4. Appointment stats, last 30 days ────────────────────────────────────
    appt_rows = (
        await db.execute(
            select(Appointment.status, func.count(Appointment.id).label("n"))
            .where(Appointment.created_at >= thirty_days_ago)
            .where(Appointment.deleted_at.is_(None))
            .group_by(Appointment.status)
        )
    ).all()
    appt_counts: dict[str, int] = {"booked": 0, "completed": 0, "cancelled": 0, "no_show": 0}
    for row in appt_rows:
        key = row.status.value if hasattr(row.status, "value") else str(row.status)
        if key in appt_counts:
            appt_counts[key] = row.n
    concluded = appt_counts["completed"] + appt_counts["cancelled"] + appt_counts["no_show"]
    appointment_stats = {
        **appt_counts,
        "total": sum(appt_counts.values()),
        "completion_rate": round(appt_counts["completed"] / concluded, 2) if concluded else 0.0,
        "no_show_rate": round(appt_counts["no_show"] / concluded, 2) if concluded else 0.0,
    }

    # ── 5. Booking source breakdown, last 30 days ─────────────────────────────
    src_rows = (
        await db.execute(
            select(Appointment.booking_source, func.count(Appointment.id).label("n"))
            .where(Appointment.created_at >= thirty_days_ago)
            .where(Appointment.deleted_at.is_(None))
            .group_by(Appointment.booking_source)
        )
    ).all()
    booking_sources: dict[str, int] = {
        "student_portal": 0,
        "psychologist_manual": 0,
        "walk_in": 0,
    }
    for row in src_rows:
        key = row.booking_source.value if hasattr(row.booking_source, "value") else str(row.booking_source)
        if key in booking_sources:
            booking_sources[key] = row.n

    # ── 6. Class-level risk breakdown (latest score per student) ──────────────
    cl_rows = (
        await db.execute(
            select(
                func.coalesce(Student.class_level, "Unknown").label("class_level"),
                RiskScore.tier,
                func.count(RiskScore.id).label("n"),
                func.avg(RiskScore.wrs_score).label("avg_wrs"),
            )
            .join(
                latest_scores_sq,
                (RiskScore.student_id == latest_scores_sq.c.student_id)
                & (RiskScore.computed_at == latest_scores_sq.c.max_at),
            )
            .join(Student, Student.student_id == RiskScore.student_id)
            .group_by(Student.class_level, RiskScore.tier)
            .order_by(Student.class_level)
        )
    ).all()
    cl_map: dict[str, dict] = defaultdict(
        lambda: {
            "class_level": "",
            "green": 0,
            "amber": 0,
            "red": 0,
            "critical": 0,
            "_wrs_sum": 0.0,
            "total": 0,
        }
    )
    for row in cl_rows:
        lvl = row.class_level or "Unknown"
        tier = row.tier.value if hasattr(row.tier, "value") else str(row.tier)
        cl_map[lvl]["class_level"] = lvl
        cl_map[lvl][tier] = row.n
        cl_map[lvl]["total"] += row.n
        cl_map[lvl]["_wrs_sum"] += float(row.avg_wrs) * row.n
    class_level_risk = []
    for lvl, d in sorted(cl_map.items()):
        avg = round(d["_wrs_sum"] / d["total"], 1) if d["total"] else 0.0
        class_level_risk.append(
            {
                "class_level": lvl,
                "green": d["green"],
                "amber": d["amber"],
                "red": d["red"],
                "critical": d["critical"],
                "avg_wrs": avg,
                "total": d["total"],
            }
        )

    # ── 7. Crisis stats, last 30 days ─────────────────────────────────────────
    crisis_total = (
        await db.execute(
            select(func.count(CrisisLog.id)).where(CrisisLog.created_at >= thirty_days_ago)
        )
    ).scalar() or 0
    crisis_resolved = (
        await db.execute(
            select(func.count(CrisisLog.id)).where(
                CrisisLog.created_at >= thirty_days_ago,
                CrisisLog.resolved.is_(True),
            )
        )
    ).scalar() or 0
    crisis_stats = {
        "total_30d": crisis_total,
        "resolved": crisis_resolved,
        "unresolved": crisis_total - crisis_resolved,
        "resolution_rate": round(crisis_resolved / crisis_total, 2) if crisis_total else 0.0,
    }

    # ── 8. Student engagement, last 7 days ────────────────────────────────────
    engaged = (
        await db.execute(
            select(func.count(func.distinct(WellnessCheckin.student_id))).where(
                WellnessCheckin.submitted_at >= seven_days_ago
            )
        )
    ).scalar() or 0
    total_students = (
        await db.execute(select(func.count(Student.student_id)))
    ).scalar() or 0
    eng_type_rows = (
        await db.execute(
            select(
                WellnessCheckin.type,
                func.count(func.distinct(WellnessCheckin.student_id)).label("n"),
            )
            .where(WellnessCheckin.submitted_at >= seven_days_ago)
            .group_by(WellnessCheckin.type)
        )
    ).all()
    eng_by_type: dict[str, int] = {"phq9": 0, "gad7": 0, "pulse": 0}
    for row in eng_type_rows:
        t = row.type.value if hasattr(row.type, "value") else str(row.type)
        if t in eng_by_type:
            eng_by_type[t] = row.n
    weekly_engagement = {
        "checked_in_7d": engaged,
        "total_students": total_students,
        "rate": round(engaged / total_students, 2) if total_students else 0.0,
        "by_type": eng_by_type,
    }

    # ── 9. High-risk proportion & campus average WRS ──────────────────────────
    total_scored = sum(risk_distribution.values())
    high_risk_count = risk_distribution["red"] + risk_distribution["critical"]
    high_risk_proportion = round(high_risk_count / total_scored, 3) if total_scored else 0.0

    avg_wrs_row = (
        await db.execute(
            select(func.avg(RiskScore.wrs_score)).join(
                latest_scores_sq,
                (RiskScore.student_id == latest_scores_sq.c.student_id)
                & (RiskScore.computed_at == latest_scores_sq.c.max_at),
            )
        )
    ).scalar()
    avg_wrs_current = round(float(avg_wrs_row), 1) if avg_wrs_row else 0.0

    # ── 10. Total check-ins last 7 days ───────────────────────────────────────
    checkins_7d = (
        await db.execute(
            select(func.count(WellnessCheckin.id)).where(
                WellnessCheckin.submitted_at >= seven_days_ago
            )
        )
    ).scalar() or 0

    return {
        "wrs_trend": wrs_trend,
        "risk_distribution": risk_distribution,
        "checkin_volume": checkin_volume,
        "appointment_stats": appointment_stats,
        "booking_sources": booking_sources,
        "class_level_risk": class_level_risk,
        "crisis_stats": crisis_stats,
        "weekly_engagement": weekly_engagement,
        "high_risk_proportion": high_risk_proportion,
        "avg_wrs_current": avg_wrs_current,
        "checkins_7d": checkins_7d,
    }


def generate_ai_insights(charts: dict) -> dict:
    """Generate AI insights when GROQ is enabled. Returns empty dict otherwise."""
    if not settings.AI_ENABLED or not settings.GROQ_API_KEY:
        return {}
    try:
        from groq import Groq  # only import when needed
        client = Groq(api_key=settings.GROQ_API_KEY)
        summary = (
            f"Risk distribution: {charts.get('risk_distribution')}\n"
            f"WRS trend data points: {len(charts.get('wrs_trend', []))}\n"
            f"High-risk proportion: {charts.get('high_risk_proportion')}\n"
            f"Weekly engagement rate: {charts.get('weekly_engagement', {}).get('rate')}\n"
            f"Appointment completion rate: {charts.get('appointment_stats', {}).get('completion_rate')}\n"
            f"Crisis stats: {charts.get('crisis_stats')}"
        )
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an analytics assistant for university psychology unit staff. "
                        "Provide concise, actionable insights (2-3 sentences each) based on wellness data. "
                        "Be professional and NDPR-compliant — never reference individual students."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Wellness dashboard data:\n{summary}\n\n"
                        "Give brief insights for: wrs_trend, risk_distribution, engagement, appointments."
                    ),
                },
            ],
        )
        content = response.choices[0].message.content.strip()
        return {"summary": content}
    except Exception:
        return {}
