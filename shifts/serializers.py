from rest_framework import serializers
from .models import Shift, TemplateShift, PayRate, ReplacementRequest


# --- Serializer per i turni reali ---
class ShiftSerializer(serializers.ModelSerializer):
    replacement_info = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = "__all__"

    def get_replacement_info(self, shift):
        req = ReplacementRequest.objects.filter(
            shift=shift, status="accepted"
        ).select_related("target_user", "requester").first()

        if not req:
            return None

        return {
            "accepted": True,
            "requester_id": req.requester_id,
            "accepted_by_id": req.target_user_id,
            "accepted_by_username": req.target_user.username,
            "partial": req.partial,
        }



# --- Serializer per la settimana tipo ---
class TemplateShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateShift
        fields = '__all__'


# --- Serializer per le tariffe ---
class PayRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayRate
        fields = '__all__'


# --- Serializer per richieste sostituzione ---
class ReplacementRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source="requester.username", read_only=True)
    target_user_name = serializers.CharField(source="target_user.username", read_only=True)
    shift_info = ShiftSerializer(source="shift", read_only=True)

    class Meta:
        model = ReplacementRequest
        fields = "__all__"
