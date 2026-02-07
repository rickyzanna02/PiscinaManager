from django.db import models
from django.conf import settings


class Shift(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # ✅ CAMBIATO: da CharField a FK
    role = models.ForeignKey(
        'users.UserRole',
        on_delete=models.PROTECT,
        related_name='shifts'
    )
    
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    course_type = models.ForeignKey(
        'courses.CourseType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    approved = models.BooleanField(default=False)

    def total_hours(self):
        from datetime import datetime
        start_dt = datetime.combine(self.date, self.start_time)
        end_dt = datetime.combine(self.date, self.end_time)
        return (end_dt - start_dt).total_seconds() / 3600

    def __str__(self):
        return f"{self.user.username} - {self.role.label} ({self.date})"


class TemplateShift(models.Model):
    # ✅ CAMBIATO: da CharField a FK
    category = models.ForeignKey(
        'users.UserRole',
        on_delete=models.PROTECT,
        related_name='template_shifts'
    )
    
    weekday = models.IntegerField(choices=[
        (i, d) for i, d in enumerate(
            ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
        )
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    course_type = models.ForeignKey(
        'courses.CourseType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.category.label} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"
    

class ReplacementRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'In attesa'),
        ('accepted', 'Accettata'),
        ('rejected', 'Rifiutata'),
        ('cancelled', 'Cancellata'),
    ]

    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="replacement_requests")
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="replacement_requests_made"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="replacement_requests_received"
    )

    partial = models.BooleanField(default=False)
    partial_start = models.TimeField(null=True, blank=True)
    partial_end = models.TimeField(null=True, blank=True)

    original_start_time = models.TimeField(null=True, blank=True)
    original_end_time = models.TimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  

    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replacement_requests_closed"
    )

    def __str__(self):
        return f"Richiesta {self.shift} → {self.target_user} ({self.status})"


class PublishedWeek(models.Model):
    """
    Traccia quali settimane sono state pubblicate per ogni categoria/ruolo.
    
    REFACTOR: ora usa ForeignKey a UserRole invece di CharField hardcoded.
    Questo garantisce coerenza con la tabella UserRole e impedisce errori
    di battitura o inconsistenze nei nomi delle categorie.
    """
    role = models.ForeignKey(
        'users.UserRole',
        on_delete=models.CASCADE,
        related_name='published_weeks',
        verbose_name='Ruolo/Categoria'
    )
    start_date = models.DateField(
        verbose_name='Data inizio settimana'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data pubblicazione'
    )

    class Meta:
        unique_together = ("role", "start_date")
        verbose_name = 'Settimana pubblicata'
        verbose_name_plural = 'Settimane pubblicate'
        ordering = ['-start_date', 'role']

    def __str__(self):
        return f"{self.role.label} - {self.start_date}"