from django.db import models
from django.conf import settings
from courses.models import Course

class PayRate(models.Model):
    PAY_TYPE_CHOICES = [
        ('hour', 'Per ora'),
        ('shift', 'Per turno'),
    ]

    ROLE_CHOICES = [
        ('bagnino', 'Bagnino'),
        ('istruttore', 'Istruttore'),
        ('segreteria', 'Segreteria'),
        ('pulizia', 'Pulizia'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    pay_type = models.CharField(max_length=10, choices=PAY_TYPE_CHOICES, default='hour')
    amount = models.DecimalField(max_digits=6, decimal_places=2)  # es. 15.00 €/h o 20 €/turno

    class Meta:
        unique_together = ('user', 'role')

    def __str__(self):
        tipo = "€/h" if self.pay_type == 'hour' else "€/turno"
        return f"{self.user.username} - {self.role} ({self.amount} {tipo})"

class Shift(models.Model):
    ROLE_CHOICES = [
        ('bagnino', 'Bagnino'),
        ('istruttore', 'Istruttore'),
        ('segreteria', 'Segreteria'),
        ('pulizia', 'Pulizia'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)
    approved = models.BooleanField(default=False)

    def total_hours(self):
        from datetime import datetime
        start_dt = datetime.combine(self.date, self.start_time)
        end_dt = datetime.combine(self.date, self.end_time)
        return (end_dt - start_dt).total_seconds() / 3600

    def calculate_payment(self):
        """Calcola quanto guadagna l’utente in questo turno."""
        from .models import PayRate
        try:
            rate = PayRate.objects.get(user=self.user, role=self.role)
        except PayRate.DoesNotExist:
            return 0
        if rate.pay_type == 'hour':
            return rate.amount * self.total_hours()
        return rate.amount  # per turno fisso

    def __str__(self):
        return f"{self.user.username} - {self.role} ({self.date})"
    

class TemplateShift(models.Model):
    CATEGORY_CHOICES = [
        ('bagnino', 'Bagnino'),
        ('istruttore', 'Istruttore'),
        ('segreteria', 'Segreteria'),
        ('pulizia', 'Pulizia'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    weekday = models.IntegerField(choices=[(i, d) for i, d in enumerate(
        ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"])])
    start_time = models.TimeField()
    end_time = models.TimeField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.category} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"
    

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

    # Collaboratore invitato a sostituire
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="replacement_requests_received"
    )

    # Se la richiesta riguarda tutto il turno o solo una parte
    partial = models.BooleanField(default=False)
    partial_start = models.TimeField(null=True, blank=True)
    partial_end = models.TimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Richiesta {self.shift} → {self.target_user} ({self.status})"


