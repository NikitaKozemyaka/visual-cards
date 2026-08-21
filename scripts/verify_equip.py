from pathlib import Path

path = Path(r"D:\visual-cards\modules\stasis_anchor.html")
text = path.read_text(encoding="utf-8")
checks = {
    "sim-equip": 'id="sim-equip"' in text,
    "sim-pin": 'id="sim-pin"' in text,
    "pin off": 'aria-checked="false" id="sim-pin"' in text or 'id="sim-pin"' in text,
    "hit 83": ">83%</span>" in text,
    "sim js": "stasis_sim.js" in text,
}
print(checks)
if "stasis_sim.js?v=" not in text:
    text = text.replace('src="./stasis_sim.js"', 'src="./stasis_sim.js?v=2"')
    path.write_text(text, encoding="utf-8")
    print("bumped sim js")
else:
    # bump version
    import re
    text2 = re.sub(r"stasis_sim\.js\?v=\d+", "stasis_sim.js?v=2", text)
    if text2 != text:
        path.write_text(text2, encoding="utf-8")
        print("rebumped")
    else:
        print("js cache ok")
