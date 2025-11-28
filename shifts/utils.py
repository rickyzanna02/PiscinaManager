import calendar
import datetime
from .models import Shift, TemplateShift

def generate_shifts_from_template(year: int, month: int):
    """
    Genera automaticamente tutti i turni del mese indicato
    basandosi sui TemplateShift settimanali.
    """
    templates = TemplateShift.objects.all()
    _, num_days = calendar.monthrange(year, month)

    created_count = 0
    for day in range(1, num_days + 1):
        date = datetime.date(year, month, day)
        weekday = date.weekday()

        for t in templates.filter(weekday=weekday):
            obj, created = Shift.objects.get_or_create(
                user=t.user,
                role=t.category,              # 🔥 FIX 1
                date=date,
                start_time=t.start_time,
                end_time=t.end_time,
                defaults={
                    "approved": False,
                    "course_type": t.course_type,  # 🔥 FIX 2
                },
            )
            if created:
                created_count += 1
    return created_count
