"""Mentor: modelo, citas y valoración en `chat_messages` (F3-09, F3-11).

Agrega tres columnas NULAS (las filas existentes, si las hubiera, siguen siendo válidas):

- `model`: modelo que sirvió la respuesta.
- `citas`: JSON con las fuentes mostradas al estudiante.
- `valoracion`: 1 (me sirvió) o -1 (no me sirvió).

Usa tipos de SQLAlchemy puros para seguir siendo reproducible aunque los modelos cambien.

Revision ID: b7d2f4a91c36
Revises: a3c81e5d7b02
Create Date: 2026-09-24 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7d2f4a91c36"
down_revision: str | Sequence[str] | None = "a3c81e5d7b02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.add_column(sa.Column("model", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("citas", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("valoracion", sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("chat_messages") as batch_op:
        batch_op.drop_column("valoracion")
        batch_op.drop_column("citas")
        batch_op.drop_column("model")
