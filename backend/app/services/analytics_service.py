from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.appointments import Appointment, AppointmentStatus
from app.models.crisis_logs import CrisisLog
from app.models.risk_scores import RiskScore
from app.models.students import Student
from app.models.tables import users_table
from app.models.wellness_checkins import WellnessCheckin

# ── 5-minute in-process TTL cache — avoids re-running 10+ queries per page load ──
_cache: dict[str, tuple[dict, datetime]] = {}
_CACHE_TTL = 300  # seconds


def _get_cached(key: str) -> dict | None:
    if key in _cache:
        data, ts = _cache[key]
        if (datetime.now(timezone.utc) - ts).total_seconds() < _CACHE_TTL:
            return data
    return None


def _set_cache(key: str, data: dict) -> None:
    _cache[key] = (data, datetime.now(timezone.utc))


async def get_real_chart_data(db: AsyncSession, days: int = 30, dept_id: Optional[str] = None) -> dict[str, Any]:
    cache_key = f"analytics:{days}:{dept_id}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    result = await _compute_chart_data(db, days, dept_id)
    _set_cache(cache_key, result)
    return result


async def _compute_chart_data(db: AsyncSession, days: int, dept_id: Optional[str] = None) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)
    seven_days_ago = now - timedelta(days=7)

    # Subquery: latest risk score timestamp per student
    latest_scores_sq = (
        select(
            RiskScore.student_id,
            func.max(RiskScore.computed_at).label("max_at"),
        )
        .group_by(RiskScore.student_id)
        .subquery()
    )

    # ── 1. Risk distribution — one entry per student, latest score only ───────
    dist_query = select(RiskScore.tier, func.count(RiskScore.id).label("n")).join(
        latest_scores_sq,
        (RiskScore.student_id == latest_scores_sq.c.student_id)
        & (RiskScore.computed_at == latest_scores_sq.c.max_at),
    )
    if dept_id:
        dist_query = dist_query.join(Student, Student.student_id == RiskScore.student_id).where(Student.department == dept_id)
    
    dist_query = dist_query.group_by(RiskScore.tier)
    dist_rows = (await db.execute(dist_query)).all()
    
    risk_distribution: dict[str, int] = {"green": 0, "amber": 0, "red": 0, "critical": 0}
    for row in dist_rows:
        key = row.tier.value if hasattr(row.tier, "value") else str(row.tier)
        risk_distribution[key] = row.n

    # ── 2. WRS trend — daily average over selected window ─────────────────────
    trend_query = select(
        func.date(RiskScore.computed_at).label("date"),
        func.avg(RiskScore.wrs_score).label("avg_wrs"),
        func.count(RiskScore.id).label("n"),
    ).where(RiskScore.computed_at >= window_start)
    
    if dept_id:
        trend_query = trend_query.join(Student, Student.student_id == RiskScore.student_id).where(Student.department == dept_id)
        
    trend_query = trend_query.group_by(func.date(RiskScore.computed_at)).order_by(func.date(RiskScore.computed_at))
    trend_rows = (await db.execute(trend_query)).all()
    
    wrs_trend = [
        {
            "date": str(row.date),
            "avg_wrs": round(float(row.avg_wrs), 1),
            "count": row.n,
        }
        for row in trend_rows
    ]

    # ── 3. Check-in volume by type ─────────────────────────────────────────────
    vol_query = select(
        func.date(WellnessCheckin.submitted_at).label("date"),
        WellnessCheckin.type,
        func.count(WellnessCheckin.id).label("n"),
    ).where(WellnessCheckin.submitted_at >= window_start)
    
    if dept_id:
        vol_query = vol_query.join(Student, Student.student_id == WellnessCheckin.student_id).where(Student.department == dept_id)
        
    vol_query = vol_query.group_by(func.date(WellnessCheckin.submitted_at), WellnessCheckin.type).order_by(func.date(WellnessCheckin.submitted_at))
    vol_rows = (await db.execute(vol_query)).all()
    
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

    # ── 4. Appointment stats ───────────────────────────────────────────────────
    appt_query = select(Appointment.status, func.count(Appointment.id).label("n")).where(
        Appointment.created_at >= window_start
    ).where(Appointment.deleted_at.is_(None))
    
    if dept_id:
        appt_query = appt_query.where(Appointment.student_id.in_(
            select(Student.student_id).where(Student.department == dept_id)
        ))
        
    appt_query = appt_query.group_by(Appointment.status)
    appt_rows = (await db.execute(appt_query)).all()
    
    appt_counts: dict[str, int] = {
        "pending": 0, "confirmed": 0, "booked": 0,
        "completed": 0, "cancelled": 0, "no_show": 0, "rejected": 0,
    }
    for row in appt_rows:
        key = row.status.value if hasattr(row.status, "value") else str(row.status)
        if key in appt_counts:
            appt_counts[key] = row.n
    upcoming = appt_counts["pending"] + appt_counts["confirmed"] + appt_counts["booked"]
    concluded = appt_counts["completed"] + appt_counts["cancelled"] + appt_counts["no_show"]
    appointment_stats = {
        **appt_counts,
        "upcoming": upcoming,
        "total": sum(appt_counts.values()),
        "completion_rate": round(appt_counts["completed"] / concluded, 2) if concluded else 0.0,
        "no_show_rate": round(appt_counts["no_show"] / concluded, 2) if concluded else 0.0,
    }

    # ── 5. Booking source breakdown ────────────────────────────────────────────
    src_query = select(Appointment.booking_source, func.count(Appointment.id).label("n")).where(
        Appointment.created_at >= window_start
    ).where(Appointment.deleted_at.is_(None))
    
    if dept_id:
        src_query = src_query.where(Appointment.student_id.in_(
            select(Student.student_id).where(Student.department == dept_id)
        ))
        
    src_query = src_query.group_by(Appointment.booking_source)
    src_rows = (await db.execute(src_query)).all()
    
    booking_sources: dict[str, int] = {
        "student_portal": 0,
        "psychologist_manual": 0,
        "walk_in": 0,
    }
    for row in src_rows:
        key = row.booking_source.value if hasattr(row.booking_source, "value") else str(row.booking_source)
        if key in booking_sources:
            booking_sources[key] = row.n

    # ── 6. Class-level risk breakdown ─────────────────────────────────────────
    cl_query = select(
        func.coalesce(Student.class_level, "Unknown").label("class_level"),
        RiskScore.tier,
        func.count(RiskScore.id).label("n"),
        func.avg(RiskScore.wrs_score).label("avg_wrs"),
    ).join(
        latest_scores_sq,
        (RiskScore.student_id == latest_scores_sq.c.student_id)
        & (RiskScore.computed_at == latest_scores_sq.c.max_at),
    ).join(Student, Student.student_id == RiskScore.student_id)
    
    if dept_id:
        cl_query = cl_query.where(Student.department == dept_id)
        
    cl_query = cl_query.group_by(Student.class_level, RiskScore.tier).order_by(Student.class_level)
    cl_rows = (await db.execute(cl_query)).all()
    
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
    class_level_risk = [
        {
            "class_level": lvl,
            "green": d["green"],
            "amber": d["amber"],
            "red": d["red"],
            "critical": d["critical"],
            "avg_wrs": round(d["_wrs_sum"] / d["total"], 1) if d["total"] else 0.0,
            "total": d["total"],
        }
        for lvl, d in sorted(cl_map.items())
    ]

    # ── 7. Crisis stats — both counts in one query ────────────────────────────
    crisis_query = select(
        func.count(CrisisLog.id).label("total"),
        func.sum(case((CrisisLog.resolved.is_(True), 1), else_=0)).label("resolved"),
    ).where(CrisisLog.created_at >= window_start)
    
    if dept_id:
        crisis_query = crisis_query.where(CrisisLog.student_id.in_(
            select(Student.student_id).where(Student.department == dept_id)
        ))
        
    crisis_row = (await db.execute(crisis_query)).one()
    crisis_total = int(crisis_row.total or 0)
    crisis_resolved = int(crisis_row.resolved or 0)
    crisis_stats = {
        "total_30d": crisis_total,
        "resolved": crisis_resolved,
        "unresolved": crisis_total - crisis_resolved,
        "resolution_rate": round(crisis_resolved / crisis_total, 2) if crisis_total else 0.0,
    }

    # ── 8. Student engagement, last 7 days ────────────────────────────────────
    engaged_query = select(func.count(func.distinct(WellnessCheckin.student_id))).where(
        WellnessCheckin.submitted_at >= seven_days_ago
    )
    total_students_query = select(func.count(Student.student_id))
    
    if dept_id:
        engaged_query = engaged_query.join(Student, Student.student_id == WellnessCheckin.student_id).where(Student.department == dept_id)
        total_students_query = total_students_query.where(Student.department == dept_id)
        
    engaged = (await db.execute(engaged_query)).scalar() or 0
    total_students = (await db.execute(total_students_query)).scalar() or 0
    
    eng_type_query = select(
        WellnessCheckin.type,
        func.count(func.distinct(WellnessCheckin.student_id)).label("n"),
    ).where(WellnessCheckin.submitted_at >= seven_days_ago)
    
    if dept_id:
        eng_type_query = eng_type_query.join(Student, Student.student_id == WellnessCheckin.student_id).where(Student.department == dept_id)
        
    eng_type_query = eng_type_query.group_by(WellnessCheckin.type)
    eng_type_rows = (await db.execute(eng_type_query)).all()
    
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

    # ── 9. Campus average WRS ─────────────────────────────────────────────────
    total_scored = sum(risk_distribution.values())
    high_risk_count = risk_distribution["red"] + risk_distribution["critical"]
    high_risk_proportion = round(high_risk_count / total_scored, 3) if total_scored else 0.0

    avg_wrs_query = select(func.avg(RiskScore.wrs_score)).join(
        latest_scores_sq,
        (RiskScore.student_id == latest_scores_sq.c.student_id)
        & (RiskScore.computed_at == latest_scores_sq.c.max_at),
    )
    
    if dept_id:
        avg_wrs_query = avg_wrs_query.join(Student, Student.student_id == RiskScore.student_id).where(Student.department == dept_id)
        
    avg_wrs_row = (await db.execute(avg_wrs_query)).scalar()
    avg_wrs_current = round(float(avg_wrs_row), 1) if avg_wrs_row else 0.0

    # ── 10. Total check-ins last 7 days ───────────────────────────────────────
    checkins_7d_query = select(func.count(WellnessCheckin.id)).where(
        WellnessCheckin.submitted_at >= seven_days_ago
    )
    
    if dept_id:
        checkins_7d_query = checkins_7d_query.join(Student, Student.student_id == WellnessCheckin.student_id).where(Student.department == dept_id)
        
    checkins_7d = (await db.execute(checkins_7d_query)).scalar() or 0

    # ── 11. WRS over time by faculty ──────────────────────────────────────────
    fac_trend_query = select(
        func.date(RiskScore.computed_at).label("date"),
        func.coalesce(Student.faculty, "Unknown").label("faculty"),
        func.avg(RiskScore.wrs_score).label("avg_wrs"),
    ).join(Student, Student.student_id == RiskScore.student_id).where(RiskScore.computed_at >= window_start)
    
    if dept_id:
        fac_trend_query = fac_trend_query.where(Student.department == dept_id)
        
    fac_trend_query = fac_trend_query.group_by(func.date(RiskScore.computed_at), Student.faculty).order_by(func.date(RiskScore.computed_at))
    fac_trend_rows = (await db.execute(fac_trend_query)).all()
    
    fac_trend_by_date: dict[str, dict] = defaultdict(lambda: {"date": ""})
    faculties: set[str] = set()
    for row in fac_trend_rows:
        d = str(row.date)
        fac = row.faculty or "Unknown"
        faculties.add(fac)
        fac_trend_by_date[d]["date"] = d
        fac_trend_by_date[d][fac] = round(float(row.avg_wrs), 1)
    wrs_by_faculty = sorted(fac_trend_by_date.values(), key=lambda x: x["date"])
    faculty_list = sorted(list(faculties))

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
        "wrs_by_faculty": wrs_by_faculty,
        "faculty_list": faculty_list,
    }


async def get_org_insights(db: AsyncSession, days: int = 30) -> dict[str, Any]:
    """Org-level operational insights for admins (TTL-cached)."""
    cache_key = f"org_insights:{days}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    result = await _compute_org_insights(db, days)
    _set_cache(cache_key, result)
    return result


async def _compute_org_insights(db: AsyncSession, days: int) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=days)

    # ── 1. Caseload per counsellor ────────────────────────────────────────────
    caseload_rows = (
        await db.execute(
            select(users_table.c.full_name, func.count(Student.student_id).label("load"))
            .join(Student, Student.assigned_psychologist_id == users_table.c.id)
            .group_by(users_table.c.id, users_table.c.full_name)
            .order_by(func.count(Student.student_id).desc())
        )
    ).all()
    caseload = [{"counselor": r.full_name or "Unknown", "students": r.load} for r in caseload_rows]

    # ── 2. Counsellor throughput (completed sessions in window) ────────────────
    throughput_rows = (
        await db.execute(
            select(users_table.c.full_name, func.count(Appointment.id).label("n"))
            .join(Appointment, Appointment.psychologist_id == users_table.c.id)
            .where(
                Appointment.status == AppointmentStatus.completed,
                Appointment.start_time >= window_start,
                Appointment.deleted_at.is_(None),
            )
            .group_by(users_table.c.id, users_table.c.full_name)
            .order_by(func.count(Appointment.id).desc())
        )
    ).all()
    throughput = [{"counselor": r.full_name or "Unknown", "completed": r.n} for r in throughput_rows]

    # ── 3. Tier movement — each student's latest vs previous WRS ───────────────
    rn = func.row_number().over(
        partition_by=RiskScore.student_id, order_by=RiskScore.computed_at.desc()
    ).label("rn")
    ranked = select(RiskScore.student_id, RiskScore.wrs_score, rn).subquery()
    pair_rows = (
        await db.execute(select(ranked.c.student_id, ranked.c.wrs_score, ranked.c.rn).where(ranked.c.rn <= 2))
    ).all()
    by_student: dict[str, dict[int, float]] = defaultdict(dict)
    for r in pair_rows:
        by_student[r.student_id][int(r.rn)] = float(r.wrs_score)
    improving = worsening = stable = 0
    for scores in by_student.values():
        if 1 in scores and 2 in scores:
            delta = scores[1] - scores[2]
            if delta < -2:
                improving += 1
            elif delta > 2:
                worsening += 1
            else:
                stable += 1
    tier_movement = {"improving": improving, "worsening": worsening, "stable": stable}

    # ── 4. Weekly attendance trend ────────────────────────────────────────────
    week = func.date_trunc("week", Appointment.start_time).label("week")
    att_rows = (
        await db.execute(
            select(week, Appointment.status, func.count(Appointment.id).label("n"))
            .where(Appointment.start_time >= window_start, Appointment.deleted_at.is_(None))
            .group_by(week, Appointment.status)
            .order_by(week)
        )
    ).all()
    att_map: dict[str, dict] = defaultdict(lambda: {"week": "", "completed": 0, "no_show": 0, "cancelled": 0})
    for r in att_rows:
        wk = str(r.week.date()) if hasattr(r.week, "date") else str(r.week)
        key = r.status.value if hasattr(r.status, "value") else str(r.status)
        att_map[wk]["week"] = wk
        if key in att_map[wk]:
            att_map[wk][key] += r.n
    attendance_trend = sorted(att_map.values(), key=lambda x: x["week"])

    # ── 5. Crisis resolution ──────────────────────────────────────────────────
    crisis_rows = (await db.execute(select(CrisisLog.resolved, CrisisLog.created_at, CrisisLog.resolved_at))).all()
    total_crises = len(crisis_rows)
    resolved = sum(1 for r in crisis_rows if r.resolved)
    resolution_hours: list[float] = []
    for r in crisis_rows:
        if r.resolved and r.resolved_at and r.created_at:
            resolution_hours.append((r.resolved_at - r.created_at).total_seconds() / 3600.0)
    avg_resolution_hours = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None
    crisis_resolution = {
        "total": total_crises,
        "resolved": resolved,
        "unresolved": total_crises - resolved,
        "avg_resolution_hours": avg_resolution_hours,
    }

    return {
        "caseload": caseload,
        "throughput": throughput,
        "tier_movement": tier_movement,
        "attendance_trend": attendance_trend,
        "crisis_resolution": crisis_resolution,
        "window_days": days,
    }


def generate_ai_insights(charts: dict) -> dict:
    """Generate AI insights when GROQ is enabled. Returns empty dict otherwise."""
    if not settings.AI_ENABLED or not settings.GROQ_API_KEY:
        return {}
    try:
        from groq import Groq
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
