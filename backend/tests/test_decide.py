"""Rozhodování: jazykový model připraví podklady, Jev vybere verdikt, váhání a výpadky řeší druhý model."""

import asyncio
import dataclasses

import pytest

from nenalet import jev
from nenalet.analyzer import Analyzer, Facts
from nenalet.config import Settings
from nenalet.schemas import CheckRequest, ModelVerdict, RedFlag

CFG = dataclasses.replace(Settings(), provider="openrouter", model="cheap/model", second_model="strong/model", decider="jev")


def verdict(v: str) -> ModelVerdict:
    return ModelVerdict(
        verdict=v, confidence="stredni", headline="h", scam_type=None,
        red_flags=[RedFlag(signal="Spěch", evidence="do 24 h", explanation="nátlak")] if v != "bez_varovnych_signalu" else [],
        reassuring_signs=[], what_to_do=["a", "b"], explanation="e",
    )


def run(cheap, decision, strong="podvod", cheap_fails=False):
    calls = []

    async def fake_ask(self, model, content):
        calls.append(model)
        if model == "cheap/model":
            if cheap_fails:
                raise RuntimeError("výpadek")
            return verdict(cheap), "cheap/model", {"cost": 0.001}
        return verdict(strong), "strong/model", {"cost": 0.003}

    async def fake_decide(http, state):
        assert "nalezene_varovne_signaly" in state and "zprava" in state
        if decision is None:
            raise jev.JevError("výpadek")
        return jev.Decision(decision, 0.93, {decision: 0.93}, 0.00002)

    mp = pytest.MonkeyPatch()
    mp.setattr(Analyzer, "_ask", fake_ask)
    mp.setattr(jev, "decide", fake_decide)
    try:
        a = Analyzer(None, CFG, client=object())
        mv, used, usage = asyncio.run(a._decide(CheckRequest(text="Zaplaťte do 24 h"), Facts(), []))
    finally:
        mp.undo()
    return mv, used, usage, calls


def test_jev_rozhodne_pri_shode():
    mv, used, usage, calls = run("podezrele", "podvod")
    assert mv.verdict == "podvod" and mv.confidence == "vysoka"
    assert calls == ["cheap/model"] and "jev" in used
    assert usage["cost"] == pytest.approx(0.00102)


def test_jev_pusti_pravou_zpravu():
    mv, _, _, calls = run("bez_varovnych_signalu", "bez_varovnych_signalu")
    assert mv.verdict == "bez_varovnych_signalu" and calls == ["cheap/model"]


@pytest.mark.parametrize("cheap,decision", [("podvod", "podezrele"), ("podvod", "bez_varovnych_signalu"), ("bez_varovnych_signalu", "podvod"), ("podvod", "nelze_posoudit")])
def test_vahani_nebo_neshoda_jde_na_druhy_model(cheap, decision):
    mv, used, _, calls = run(cheap, decision, strong="podezrele")
    assert calls == ["cheap/model", "strong/model"]
    assert mv.verdict == "podezrele" and used.endswith("strong/model")


def test_vypadek_jeva_jde_na_druhy_model():
    mv, _, _, calls = run("podvod", None, strong="podvod")
    assert calls == ["cheap/model", "strong/model"] and mv.verdict == "podvod"


def test_vypadek_levneho_modelu_jde_na_druhy_model():
    mv, used, _, calls = run("podvod", "podvod", strong="podezrele", cheap_fails=True)
    assert calls == ["cheap/model", "strong/model"] and mv.verdict == "podezrele" and used == "strong/model"
