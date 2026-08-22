# visual-cards

Здесь хранятся визуальные карточки с тап-эффектом для обучения по игре Space Text World.

**Live:** https://nikitakozemyaka.github.io/visual-cards/

## Модули брони (14 шт.)

- Каталог: [`modules/`](modules/)
- Симулятор и генерация: **[docs/module_cards_and_simulator.md](docs/module_cards_and_simulator.md)** — итог доработки, ошибки/фиксы, инструкция для агентов

Баланс подтягивается из репозитория **STW_GAME** (`module_balance.json`, `global_items.json`).

## Механики (1 сценарий)

- Каталог: [`mechanics/`](mechanics/)
- Демо: [стабилизатор и осколки](mechanics/stabilizer.html) — параметры → «Погиб» → итог (формулы из `module_death_stabilizer.py` в STW_GAME)
- Сборка: `python scripts/build_mechanics_cards.py`
- Тесты: `python scripts/test_mechanics_sim.py` · `python -m unittest scripts.test_mechanics_sim_embed -q`

## Быстрый пересбор

```powershell
cd D:\visual-cards
python scripts/build_module_cards.py
python scripts/build_mechanics_cards.py
python scripts/audit_module_sim_wiring.py
python -m unittest scripts.test_module_sim_embed scripts.test_mechanics_sim_embed -q
python scripts/test_mechanics_sim.py
```
