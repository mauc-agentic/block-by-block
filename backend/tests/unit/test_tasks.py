# UC-006 BR-007: una verificación a la vez por causa (sin red ni BD)

from types import SimpleNamespace

import pytest

from app import tasks


class FakeExecutor:
    def __init__(self, fail=False):
        self.submitted, self.fail = [], fail

    def submit(self, fn, *args):
        if self.fail:
            raise RuntimeError("pool cerrado")
        self.submitted.append((fn, args))


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    tasks._inflight.clear()
    monkeypatch.setattr(tasks, "_executor", FakeExecutor())
    yield
    tasks._inflight.clear()


def test_uc006_br007_second_enqueue_for_same_cause_is_ignored():
    assert tasks.enqueue_verification(7) is True
    assert tasks.is_verifying(7) is True
    assert tasks.enqueue_verification(7) is False          # A8
    assert len(tasks._executor.submitted) == 1
    assert tasks.enqueue_verification(8) is True            # otra causa sí se encola


def test_uc006_br007_finished_task_frees_the_cause(monkeypatch):
    async def fake_task(cause_id):
        assert tasks.is_verifying(cause_id)

    monkeypatch.setattr(tasks, "verify_cause_task", fake_task)
    tasks.enqueue_verification(3)
    tasks._run_verification_task(3)
    assert tasks.is_verifying(3) is False
    assert tasks.enqueue_verification(3) is True            # se puede reintentar después


def test_uc006_br007_failed_task_also_frees_the_cause(monkeypatch):
    async def boom(cause_id):
        raise RuntimeError("fallo inesperado")

    monkeypatch.setattr(tasks, "verify_cause_task", boom)
    tasks.enqueue_verification(4)
    tasks._run_verification_task(4)
    assert tasks.is_verifying(4) is False


def test_uc006_failed_submit_does_not_leave_cause_locked(monkeypatch):
    monkeypatch.setattr(tasks, "_executor", FakeExecutor(fail=True))
    assert tasks.enqueue_verification(5) is False
    assert tasks.is_verifying(5) is False
