# courses/serializers.py
from rest_framework import serializers
from .models import CourseType

class CourseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseType
        fields = "__all__"
