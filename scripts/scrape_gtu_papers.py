"""
GTU past-paper scraper — run once before launch to seed the DB.

Usage:
    pip install requests beautifulsoup4
    python scripts/scrape_gtu_papers.py --out ./seed_papers

After downloading run:
    python scripts/bulk_process.py --folder ./seed_papers
"""

import argparse
import os
import time
import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; GTUExamAI-Seeder/1.0)"}

# GTU exam paper portals — check for live PDFs
SOURCES = [
    "https://www.gtu.ac.in/ExamPapers.aspx",
    "https://gtudiploma.ac.in",
]

# Subject codes to target (CE + IT, semesters 3-8)
TARGET_SUBJECTS = [
    # CE
    "2130002", "2130702", "2140002", "2140702", "2150002", "2150702",
    "2160002", "2160702", "2170002", "2170702", "2180002", "2180702",
    # IT
    "3130002", "3140002", "3150002", "3160002", "3170002", "3180002",
]


def download_pdf(url: str, dest: str) -> bool:
    try:
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        if r.status_code == 200 and b"%PDF" in r.content[:8]:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(r.content)
            print(f"  ✓ {dest}")
            return True
        print(f"  ✗ {url} (status {r.status_code})")
    except Exception as e:
        print(f"  ✗ {url} ({e})")
    return False


def scrape(out_dir: str):
    """
    Implement per-portal scraping logic here.
    The portals above use JS-rendered tables, so you may need Selenium
    or a manual paper URL list.  Stub shows the expected structure.
    """
    print("GTU ExamAI — paper scraper")
    print(f"Output dir: {out_dir}")
    print(f"Sources: {SOURCES}")
    print()
    print("NOTE: GTU portals use JS rendering.  Recommended workflow:")
    print("  1. Download PDFs manually from gtu.ac.in/ExamPapers.aspx")
    print("  2. Save to  <out_dir>/<subject_code>/<year>/<exam_type>.pdf")
    print("  3. Run bulk_process.py --folder <out_dir>")
    print()
    print("Or supply direct PDF URLs in the PAPER_URLS list below and")
    print("uncomment the batch download loop.")

    # Example batch download — fill PAPER_URLS with direct PDF links
    PAPER_URLS: list[tuple[str, str]] = [
        # (url, relative_save_path)
        # ("https://example.com/paper.pdf", "CE/2023/winter.pdf"),
    ]

    ok = fail = 0
    for url, rel_path in PAPER_URLS:
        dest = os.path.join(out_dir, rel_path)
        if download_pdf(url, dest):
            ok += 1
        else:
            fail += 1
        time.sleep(1)  # polite crawl rate

    print(f"\nDone: {ok} downloaded, {fail} failed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="./seed_papers", help="Output directory")
    args = parser.parse_args()
    scrape(args.out)
