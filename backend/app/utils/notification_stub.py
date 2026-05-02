async def send_crisis_alert(psychologist_id: str, student_id: str, appointment_id: str):
    print(
        f"[CRISIS ALERT] Psychologist {psychologist_id} notified for student {student_id}, "
        f"appointment {appointment_id}"
    )
