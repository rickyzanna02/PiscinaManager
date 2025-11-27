# courses/views.py
from rest_framework.viewsets import ReadOnlyModelViewSet
from .models import CourseType
from .serializers import CourseTypeSerializer

class CourseTypeViewSet(ReadOnlyModelViewSet):
    queryset = CourseType.objects.all()
    serializer_class = CourseTypeSerializer
