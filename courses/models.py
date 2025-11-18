from django.db import models

class Course(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    days_of_week = models.JSONField(default=list)  # es: ["Mon", "Wed", "Fri"]

    def __str__(self):
        return self.title
