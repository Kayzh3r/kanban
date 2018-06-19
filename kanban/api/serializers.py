from rest_framework import serializers
from .models import Board, Column, Card
from django.contrib.auth import get_user_model
from rest_framework_jwt.settings import api_settings


class CardListSerializer(serializers.ListSerializer):

    def update(self, instance, validated_data):
        """
        Update (and optionally delete) multiple existing cards
        """
        card_mapping = {card.id: card for card in instance}
        data_mapping = {item['id']: item for item in validated_data}

        # identify and delete cards that have the 'delete' flag
        deleted_cards = [
            card['id']
            for card
            in self.initial_data
            if card.get('delete', False)
        ]
        for card_id in deleted_cards:
            card = card_mapping[card_id]
            card.delete()

        cards = []
        for card_id, data in data_mapping.items():
            if card_id not in deleted_cards:
                card = card_mapping[card_id]
                self.child.update(card, data)
                cards.append(card)
        return cards


class ExistingCardSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField()
    column_id = serializers.IntegerField()

    class Meta:
        model = Card
        fields = ('task', 'id', 'position_id', 'column_id')
        list_serializer_class = CardListSerializer


class CardSerializer(serializers.ModelSerializer):

    column_id = serializers.IntegerField()

    class Meta:
        model = Card
        fields = ('task', 'position_id', 'column_id')


class ColumnListSerializer(serializers.ListSerializer):

    def update(self, instance, validated_data):
        """
        Update (and optionally delete) multiple existing columns
        """
        column_mapping = {column.id: column for column in instance}
        data_mapping = {item['id']: item for item in validated_data}

        # identify and delete columns that have the 'delete' flag
        deleted_columns = [
            column['id']
            for column
            in self.initial_data
            if column.get('delete', False)
        ]
        for column_id in deleted_columns:
            column = column_mapping[column_id]
            column.delete()

        # update and return columns that were not deleted
        columns = []
        for column_id, data in data_mapping.items():
            if column_id not in deleted_columns:
                column = column_mapping[column_id]
                self.child.update(column, data)
                columns.append(column)
        return columns


class ExistingColumnSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField()
    cards = ExistingCardSerializer(many=True, read_only=True)
    board_id = serializers.IntegerField()

    class Meta:
        model = Column
        fields = ('name', 'id', 'position_id', 'board_id', 'cards')
        list_serializer_class = ColumnListSerializer


class ColumnSerializer(serializers.ModelSerializer):

    cards = ExistingCardSerializer(many=True, read_only=True)
    board_id = serializers.IntegerField()

    class Meta:
        model = Column
        fields = ('name', 'id', 'position_id', 'board_id', 'cards')


class BoardSerializer(serializers.ModelSerializer):

    columns = ColumnSerializer(many=True, required=False)

    class Meta:
        model = Board
        fields = ('user', 'name', 'columns')


class CreateUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = get_user_model()
        fields = ('username', 'password')

    def create(self, validated_data):
        user = get_user_model().objects.create(
            username=validated_data['username'],
            password=validated_data['password'])
        jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
        jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER
        payload = jwt_payload_handler(user)
        token = jwt_encode_handler(payload)
        return token
