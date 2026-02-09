from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, UserRole, ContabilitaCheck
from rest_framework import serializers


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name")


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ("id", "code", "label")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    roles = serializers.PrimaryKeyRelatedField(
        queryset=UserRole.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = User
        fields = (
            "username",
            "password",
            "first_name",
            "last_name",
            "date_of_birth",
            "roles",
        )

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        roles = validated_data.pop("roles", [])
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)  # hash
        user.save()

        if roles:
            user.roles.set(roles)

        return user

class ContabilitaCheckSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id")

    class Meta:
        model = ContabilitaCheck
        fields = ("id", "user_id", "checked_at")
