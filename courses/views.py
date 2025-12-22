from rest_framework.viewsets import ReadOnlyModelViewSet
from .models import CourseType, CategoryBaseRate, UserHourlyRate, InstructorCourseRate
from .serializers import (
    CourseTypeSerializer,
    CategoryBaseRateSerializer,
    UserHourlyRateSerializer,
    InstructorCourseRateSerializer,
)

class CourseTypeViewSet(ReadOnlyModelViewSet):
    queryset = CourseType.objects.all()
    serializer_class = CourseTypeSerializer

class CategoryBaseRateViewSet(ReadOnlyModelViewSet):
    queryset = CategoryBaseRate.objects.all()
    serializer_class = CategoryBaseRateSerializer

class UserHourlyRateViewSet(ReadOnlyModelViewSet):
    queryset = UserHourlyRate.objects.all()
    serializer_class = UserHourlyRateSerializer

class InstructorCourseRateViewSet(ReadOnlyModelViewSet):
    queryset = InstructorCourseRate.objects.all()
    serializer_class = InstructorCourseRateSerializer
