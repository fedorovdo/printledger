import unittest
from unittest.mock import patch

from app.models.enums import CartridgeCondition, CartridgeTransactionType
from app.schemas.inventory import (
    CartridgeInventoryImportPreviewResponse,
    CartridgeInventoryImportPreviewRow,
    CartridgeInventoryImportPreviewSummary,
)
from app.services.cartridge_inventory_excel import (
    InventoryApplyValidationError,
    InventorySnapshotConflict,
    _build_import_comment,
    apply_inventory_import,
)


class _Dialect:
    name = "sqlite"


class _Bind:
    dialect = _Dialect()


class FakeSession:
    def __init__(self, fail_on_add: int | None = None):
        self.pending = []
        self.committed = []
        self.commit_count = 0
        self.rollback_count = 0
        self.add_count = 0
        self.fail_on_add = fail_on_add

    def get_bind(self):
        return _Bind()

    def add(self, item):
        self.add_count += 1
        if self.fail_on_add == self.add_count:
            raise RuntimeError("simulated batch failure")
        item.id = 1000 + self.add_count
        self.pending.append(item)

    def flush(self):
        return None

    def commit(self):
        self.commit_count += 1
        self.committed.extend(self.pending)
        self.pending.clear()

    def rollback(self):
        self.rollback_count += 1
        self.pending.clear()


def _row(
    row_number: int,
    model_id: int,
    current_new: int,
    actual_new: int,
    current_refilled: int,
    actual_refilled: int,
    status: str | None = None,
    errors: list[str] | None = None,
) -> CartridgeInventoryImportPreviewRow:
    delta_new = actual_new - current_new
    delta_refilled = actual_refilled - current_refilled
    return CartridgeInventoryImportPreviewRow(
        row_number=row_number,
        status=status
        or ("unchanged" if delta_new == 0 and delta_refilled == 0 else "change"),
        cartridge_model_id=model_id,
        model_name=f"MODEL-{model_id}",
        current_new=current_new,
        actual_new=actual_new,
        delta_new=delta_new,
        current_refilled=current_refilled,
        actual_refilled=actual_refilled,
        delta_refilled=delta_refilled,
        installed_total=7,
        comment=f"row {row_number}",
        errors=errors or [],
    )


def _preview(
    rows: list[CartridgeInventoryImportPreviewRow],
    snapshot_hash: str,
) -> CartridgeInventoryImportPreviewResponse:
    return CartridgeInventoryImportPreviewResponse(
        summary=CartridgeInventoryImportPreviewSummary(
            total_rows=len(rows),
            matched_rows=sum(row.cartridge_model_id is not None for row in rows),
            changed_rows=sum(row.status == "change" for row in rows),
            unchanged_rows=sum(row.status == "unchanged" for row in rows),
            error_rows=sum(row.status == "error" for row in rows),
            snapshot_hash=snapshot_hash,
        ),
        rows=rows,
    )


class ApplyInventoryImportTests(unittest.TestCase):
    def test_lock_is_acquired_before_preview(self):
        snapshot_hash = "0" * 64
        preview = _preview([_row(6, 1, 4, 4, 2, 2)], snapshot_hash)
        db = FakeSession()
        events = []

        with (
            patch(
                "app.services.cartridge_inventory_excel."
                "acquire_cartridge_stock_mutation_lock",
                side_effect=lambda _db: events.append("lock"),
            ),
            patch(
                "app.services.cartridge_inventory_excel.preview_inventory_import",
                side_effect=lambda _db, _content: events.append("preview") or preview,
            ),
        ):
            apply_inventory_import(db, b"xlsx", snapshot_hash, "order.xlsx", 1)

        self.assertEqual(events, ["lock", "preview"])

    def test_history_comment_is_sanitized_and_bounded(self):
        comment = _build_import_comment(
            "..\\unsafe\r\nname.xlsx",
            "line one\x00\r\n" + "x" * 3000,
        )

        self.assertTrue(
            comment.startswith(
                "Файл: unsafe name.xlsx; Комментарий Excel: line one "
            )
        )
        self.assertNotIn("\\", comment)
        self.assertNotIn("\r", comment)
        self.assertNotIn("\n", comment)
        self.assertNotIn("\x00", comment)
        self.assertLessEqual(len(comment), 180 + 2000 + 40)

    def test_creates_expected_corrections_in_one_commit(self):
        snapshot_hash = "a" * 64
        preview = _preview(
            [
                _row(6, 1, 10, 12, 4, 7),
                _row(7, 2, 8, 6, 3, 2),
                _row(8, 3, 5, 5, 1, 1),
            ],
            snapshot_hash,
        )
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=preview,
        ):
            response = apply_inventory_import(
                db,
                b"xlsx",
                snapshot_hash,
                "../inventory.xlsx",
                created_by_user_id=42,
            )

        self.assertEqual(db.commit_count, 1)
        self.assertEqual(db.rollback_count, 0)
        self.assertEqual(response.changed_models, 2)
        self.assertEqual(response.transactions_created, 4)
        self.assertEqual(response.correction_plus_total, 5)
        self.assertEqual(response.correction_minus_total, 3)
        self.assertEqual(
            [
                (item.transaction_type, item.item_condition, item.quantity)
                for item in db.committed
            ],
            [
                (CartridgeTransactionType.correction_plus, CartridgeCondition.new, 2),
                (CartridgeTransactionType.correction_plus, CartridgeCondition.refilled, 3),
                (CartridgeTransactionType.correction_minus, CartridgeCondition.new, 2),
                (CartridgeTransactionType.correction_minus, CartridgeCondition.refilled, 1),
            ],
        )
        self.assertTrue(all(item.created_by_user_id == 42 for item in db.committed))
        self.assertTrue(all(item.reason == "Инвентаризация из Excel" for item in db.committed))
        self.assertTrue(all("Файл: inventory.xlsx" in item.comment for item in db.committed))

    def test_validation_error_blocks_entire_apply(self):
        snapshot_hash = "b" * 64
        row = _row(6, 1, 4, 4, 2, 2, status="error", errors=["blank"])
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=_preview([row], snapshot_hash),
        ):
            with self.assertRaises(InventoryApplyValidationError):
                apply_inventory_import(db, b"xlsx", snapshot_hash, "bad.xlsx", 1)

        self.assertEqual(db.committed, [])
        self.assertEqual(db.commit_count, 0)
        self.assertEqual(db.rollback_count, 1)

    def test_stale_snapshot_blocks_apply(self):
        preview = _preview([_row(6, 1, 10, 12, 0, 0)], "c" * 64)
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=preview,
        ):
            with self.assertRaises(InventorySnapshotConflict):
                apply_inventory_import(db, b"xlsx", "d" * 64, "stale.xlsx", 1)

        self.assertEqual(db.committed, [])
        self.assertEqual(db.commit_count, 0)
        self.assertEqual(db.rollback_count, 1)

    def test_malformed_snapshot_hash_is_a_conflict(self):
        preview = _preview([_row(6, 1, 10, 12, 0, 0)], "c" * 64)
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=preview,
        ):
            with self.assertRaises(InventorySnapshotConflict):
                apply_inventory_import(db, b"xlsx", "не-hash", "stale.xlsx", 1)

        self.assertEqual(db.committed, [])
        self.assertEqual(db.commit_count, 0)
        self.assertEqual(db.rollback_count, 1)

    def test_second_apply_is_stale_after_first_changed_stock(self):
        first_hash = "e" * 64
        second_hash = "f" * 64
        changed = _preview([_row(6, 1, 10, 12, 0, 0)], first_hash)
        unchanged = _preview([_row(6, 1, 12, 12, 0, 0)], second_hash)
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            side_effect=[changed, unchanged],
        ):
            apply_inventory_import(db, b"xlsx", first_hash, "double.xlsx", 1)
            with self.assertRaises(InventorySnapshotConflict):
                apply_inventory_import(db, b"xlsx", first_hash, "double.xlsx", 1)

        self.assertEqual(len(db.committed), 1)
        self.assertEqual(db.commit_count, 1)
        self.assertEqual(db.rollback_count, 1)

    def test_unchanged_file_is_repeatable_noop(self):
        snapshot_hash = "1" * 64
        preview = _preview([_row(6, 1, 4, 4, 2, 2)], snapshot_hash)
        db = FakeSession()

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=preview,
        ):
            first = apply_inventory_import(db, b"xlsx", snapshot_hash, "noop.xlsx", 1)
            second = apply_inventory_import(db, b"xlsx", snapshot_hash, "noop.xlsx", 1)

        self.assertEqual(first.transactions_created, 0)
        self.assertEqual(second.transactions_created, 0)
        self.assertEqual(db.committed, [])
        self.assertEqual(db.commit_count, 2)

    def test_mid_batch_failure_rolls_back_all_pending_corrections(self):
        snapshot_hash = "2" * 64
        preview = _preview([_row(6, 1, 5, 7, 3, 4)], snapshot_hash)
        db = FakeSession(fail_on_add=2)

        with patch(
            "app.services.cartridge_inventory_excel.preview_inventory_import",
            return_value=preview,
        ):
            with self.assertRaisesRegex(RuntimeError, "simulated batch failure"):
                apply_inventory_import(db, b"xlsx", snapshot_hash, "rollback.xlsx", 1)

        self.assertEqual(db.pending, [])
        self.assertEqual(db.committed, [])
        self.assertEqual(db.commit_count, 0)
        self.assertEqual(db.rollback_count, 1)


if __name__ == "__main__":
    unittest.main()
