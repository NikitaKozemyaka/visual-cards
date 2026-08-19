from pathlib import Path


ROOT = Path(r"D:\visual-cards")
BASE_URL = "https://nikitakozemyaka.github.io/visual-cards"


def transform_home(text: str) -> str:
    text = text.replace(
        "https://cardify-indol.vercel.app/opengraph-image?c1373306b8614948",
        f"{BASE_URL}/site-preview.png",
    )
    text = text.replace("https://cardify-indol.vercel.app", f"{BASE_URL}/")
    text = text.replace("/_next/static/", "./_next/static/")
    text = text.replace("/modules/stasis-anchor", "./modules/stasis_anchor.html")
    return text


def transform_module(text: str) -> str:
    text = text.replace(
        "https://cardify-indol.vercel.app/modules/stasis-anchor/opengraph-image?4121622ff7e636c0",
        f"{BASE_URL}/stasis-anchor-preview.png",
    )
    text = text.replace(
        "https://cardify-indol.vercel.app/modules/stasis-anchor",
        f"{BASE_URL}/modules/stasis_anchor.html",
    )
    text = text.replace("/_next/static/", "../_next/static/")
    text = text.replace('href="/"', 'href="../index.html"')
    text = text.replace('\\"/\\"', '\\"../index.html\\"')
    return text


def main() -> None:
    home_src = (ROOT / "tmp_cardify_home.html").read_text(encoding="utf-8")
    module_src = (ROOT / "tmp_cardify_module.html").read_text(encoding="utf-8")

    (ROOT / "index.html").write_text(transform_home(home_src), encoding="utf-8")
    (ROOT / "modules" / "stasis_anchor.html").write_text(
        transform_module(module_src),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
