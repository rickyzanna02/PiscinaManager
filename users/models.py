from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Responsabile'),
        ('collab', 'Collaboratore'),
        ('account', 'Contabilità'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='collab')
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
