from rest_framework import serializers
from .models import CourseType, CategoryBaseRate, UserHourlyRate, InstructorCourseRate

class CourseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseType
        fields = "__all__"

class CategoryBaseRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryBaseRate
        fields = "__all__"

class UserHourlyRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserHourlyRate
        fields = "__all__"

class InstructorCourseRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorCourseRate
        fields = "__all__"
