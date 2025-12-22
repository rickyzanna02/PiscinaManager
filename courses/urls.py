from rest_framework.routers import DefaultRouter
from .views import (
    CourseTypeViewSet,
    CategoryBaseRateViewSet,
    UserHourlyRateViewSet,
    InstructorCourseRateViewSet,
)

router = DefaultRouter()
router.register(r"types", CourseTypeViewSet, basename="course-types")
router.register(r"base-rates", CategoryBaseRateViewSet, basename="base-rates")
router.register(r"user-hourly-rates", UserHourlyRateViewSet, basename="user-hourly-rates")
router.register(r"instructor-course-rates", InstructorCourseRateViewSet, basename="instructor-course-rates")

urlpatterns = router.urls
