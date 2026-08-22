# visual-cards

Здесь хранятся визуальные карточки с тап-эффектом для обучения по игре Space Text World.

**Live:** https://nikitakozemyaka.github.io/visual-cards/

## Модули брони (14 шт.)

- Каталог: [`modules/`](modules/)
- Симулятор и генерация: **[docs/module_cards_and_simulator.md](docs/module_cards_and_simulator.md)** — итог доработки, ошибки/фиксы, инструкция для агентов

Баланс подтягивается из репозитория **STW_GAME** (`module_balance.json`, `global_items.json`).

## Быстрый пересбор

```powershell
cd D:\visual-cards
python scripts/build_module_cards.py
python scripts/audit_module_sim_wiring.py
python -m unittest scripts.test_module_sim_embed -q
```
