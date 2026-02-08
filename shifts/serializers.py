# shifts/serializers.py
from rest_framework import serializers
from .models import Shift, TemplateShift, ReplacementRequest
from users.models import UserRole


class ShiftSerializer(serializers.ModelSerializer):
    replacement_info = serializers.SerializerMethodField()

    # ✅ Gestione role come FK
    role_data = serializers.SerializerMethodField(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=UserRole.objects.all(),
        source='role',
        write_only=True,
        required=False
    )

    # input compatibile col frontend (id corso)
    course = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # output ricco per il frontend
    course_type_data = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Shift
        fields = "__all__"
    
    def get_role_data(self, obj):
        """Restituisce dati completi del ruolo"""
        if not obj.role:
            return None
        return {
            "id": obj.role.id,
            "code": obj.role.code,
            "label": obj.role.label,
        }

    def validate(self, data):
        course_id = data.pop("course", None)
        if course_id:
            from courses.models import CourseType
            try:
                data["course_type"] = CourseType.objects.get(id=course_id)
            except CourseType.DoesNotExist:
                raise serializers.ValidationError({"course": "CourseType non trovato"})
        return data

    def get_course_type_data(self, obj):
        if not obj.course_type:
            return None
        return {
            "id": obj.course_type.id,
            "name": obj.course_type.name,
            "default_minutes": obj.course_type.default_minutes,
        }

    def get_replacement_info(self, shift):
        req = (
            ReplacementRequest.objects.filter(
                shift=shift,
                status="accepted"
            )
            .select_related("target_user", "requester")
            .order_by("-id")
            .first()
        )

        if not req:
            return None

        return {
            "accepted": True,
            "requester_id": req.requester_id,
            "requester_name": req.requester.username,
            "accepted_by_id": req.target_user_id,
            "accepted_by_username": req.target_user.username,
            "partial": req.partial,
            "partial_start": req.partial_start,
            "partial_end": req.partial_end,
            "original_start": req.original_start_time,
            "original_end": req.original_end_time,
        }


class TemplateShiftSerializer(serializers.ModelSerializer):
    # ✅ CORRETTO: source='category' perché il campo nel model è 'category'
    category_data = serializers.SerializerMethodField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=UserRole.objects.all(),
        source='category',  # ✅ IMPORTANTE: campo nel model è 'category'
        write_only=True,
        required=False
    )

    # il frontend manda "course" = id del corso
    course = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # e restituiamo i dati del course_type
    course_type_data = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TemplateShift
        fields = [
            "id",
            "category",         # ✅ FK oggetto (read-only per output)
            "category_id",      # ✅ Per input (write)
            "category_data",    # ✅ Dati completi ruolo
            "weekday",
            "start_time",
            "end_time",
            "user",
            "course_type",      # id FK
            "course",           # input dal frontend
            "course_type_data", # output ricco
        ]
    
    def get_category_data(self, obj):
        """Restituisce dati completi del ruolo/categoria"""
        if not obj.category:
            return None
        return {
            "id": obj.category.id,
            "code": obj.category.code,
            "label": obj.category.label,
        }

    def get_course_type_data(self, obj):
        if not obj.course_type:
            return None
        return {
            "id": obj.course_type.id,
            "name": obj.course_type.name,
            "default_minutes": obj.course_type.default_minutes,
        }

    def validate(self, data):
        course_id = data.pop("course", None)
        if course_id:
            from courses.models import CourseType
            try:
                data["course_type"] = CourseType.objects.get(id=course_id)
            except CourseType.DoesNotExist:
                raise serializers.ValidationError({"course": "CourseType non trovato"})
        return data


class ReplacementRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source="requester.username", read_only=True)
    target_user_name = serializers.CharField(source="target_user.username", read_only=True)
    shift_info = ShiftSerializer(source="shift", read_only=True)
    closed_by_name = serializers.CharField(source="closed_by.username", read_only=True)

    class Meta:
        model = ReplacementRequest
        fields = "__all__"
