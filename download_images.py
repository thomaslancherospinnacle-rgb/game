"""
FIFA Manager — Download All Images
====================================
Reads the sofifa URLs straight out of players.json,
downloads every image, and saves it named by its ID.

REQUIRES:
    pip install requests

PUT this script in the same folder as players.json + teams.json, then:
    python download_images.py

CREATES:
    club_logos/      ->  team_0001.png, team_0002.png ...
    player_images/   ->  158023.png, 158024.png ...

REWRITES:
    teams.json       ->  adds club_logo_url = "club_logos/team_0001.png"
    players.json     ->  changes media.face_url = "player_images/158023.png"
"""

import json, os, time, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# ─── CONFIG ────────────────────────────────────────────
WORKERS     = 12
RETRIES     = 3
RETRY_WAIT  = 1.5
HEADERS     = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}


# ─── DOWNLOAD ONE FILE ─────────────────────────────────
def fetch(url, dest):
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            if len(r.content) < 100:
                return (dest, False, "too small")
            with open(dest, "wb") as f:
                f.write(r.content)
            return (dest, True, None)
        except Exception as e:
            if attempt == RETRIES - 1:
                return (dest, False, str(e))
            time.sleep(RETRY_WAIT)


# ─── PROGRESS BAR ──────────────────────────────────────
def progress(label, done, total):
    pct = int(done / total * 100) if total else 0
    n   = int(pct / 2)
    print(f"\r  {label}  [{'█'*n}{'░'*(50-n)}] {pct}%  {done:,}/{total:,}", end="", flush=True)


# ─── BATCH DOWNLOAD ────────────────────────────────────
def download_all(label, jobs):
    """jobs = list of (url, dest_path).  Returns (ok_count, fail_count)."""
    ok = fail = 0
    if not jobs:
        print(f"  {label}: nothing to do")
        return ok, fail

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(fetch, url, dest): dest for url, dest in jobs}
        done = 0
        for fut in as_completed(futures):
            _, success, err = fut.result()
            done += 1
            if success:
                ok += 1
            else:
                fail += 1
                if fail <= 10:
                    print(f"\n    ✗ {os.path.basename(futures[fut])}: {err}")
            progress(label, done, len(jobs))
    print()
    return ok, fail


# ─── MAIN ──────────────────────────────────────────────
def main():
    t0 = time.time()

    # ── load ──────────────────────────────────────────
    print("\n📂  Loading JSON…")
    for name in ("players.json", "teams.json"):
        if not os.path.exists(name):
            print(f"  ❌ {name} not found — run this from the folder that contains it.")
            return

    with open("players.json", "r", encoding="utf-8") as f:
        players = json.load(f)
    with open("teams.json",   "r", encoding="utf-8") as f:
        teams   = json.load(f)

    print(f"  ✓ {len(players):,} players")
    print(f"  ✓ {len(teams):,} teams")

    os.makedirs("club_logos",    exist_ok=True)
    os.makedirs("player_images", exist_ok=True)

    # ──────────────────────────────────────────────────
    # PASS 1 — scan players.json and grab every URL
    #          BEFORE we overwrite anything
    # ──────────────────────────────────────────────────
    print("\n🔍  Scanning players.json for image URLs…")

    club_logo_url   = {}   # club_name  -> "https://cdn.sofifa.net/teams/73/60.png"
    player_face_url = {}   # player_id  -> "https://cdn.sofifa.net/players/158/023/22_120.png"

    for p in players:
        pid   = p.get("player_id")
        media = p.get("media") or {}
        club  = (p.get("club") or {}).get("name")

        if pid and media.get("face_url"):
            player_face_url[pid] = media["face_url"]

        if club and media.get("club_logo_url") and club not in club_logo_url:
            club_logo_url[club] = media["club_logo_url"]

    print(f"  ✓ {len(club_logo_url):,} unique club logos")
    print(f"  ✓ {len(player_face_url):,} player faces")

    # ──────────────────────────────────────────────────
    # PASS 2 — match teams.json -> logo URL
    #          exact -> lowercase -> substring
    # ──────────────────────────────────────────────────
    print("\n🔗  Matching teams to logo URLs…")
    club_lower = {k.lower(): v for k, v in club_logo_url.items()}

    logo_jobs   = []
    unmatched   = []

    for team in teams:
        tid   = team["team_id"]
        tname = team["team_name"]
        dest  = os.path.join("club_logos", f"{tid}.png")

        # already on disk -> skip
        if os.path.exists(dest) and os.path.getsize(dest) > 100:
            team["club_logo_url"] = f"club_logos/{tid}.png"
            continue

        url = club_logo_url.get(tname)                          # 1) exact
        if not url:
            url = club_lower.get(tname.lower())                 # 2) case-insensitive
        if not url:                                             # 3) substring
            tlow = tname.lower()
            for cname, curl in club_logo_url.items():
                if tlow in cname.lower() or cname.lower() in tlow:
                    url = curl
                    break

        if url:
            logo_jobs.append((url, dest))
            team["club_logo_url"] = f"club_logos/{tid}.png"
        else:
            team["club_logo_url"] = ""
            unmatched.append(tname)

    print(f"  ✓ {len(teams) - len(unmatched):,} matched")
    if unmatched:
        print(f"  ⚠ {len(unmatched)} unmatched (fallback emoji in-game)")

    # ──────────────────────────────────────────────────
    # PASS 3 — build face download list from saved URLs
    # ──────────────────────────────────────────────────
    print("\n👤  Preparing face downloads…")
    face_jobs = []

    for p in players:
        pid = p.get("player_id")
        if not pid:
            continue

        dest = os.path.join("player_images", f"{pid}.png")

        # already on disk -> skip
        if os.path.exists(dest) and os.path.getsize(dest) > 100:
            if p.get("media"):
                p["media"]["face_url"] = f"player_images/{pid}.png"
            continue

        orig = player_face_url.get(pid)         # URL we saved in pass 1
        if not orig:
            continue

        face_jobs.append((orig, dest))
        if p.get("media"):
            p["media"]["face_url"] = f"player_images/{pid}.png"

    print(f"  ✓ {len(logo_jobs):,} logos to download")
    print(f"  ✓ {len(face_jobs):,} faces to download")

    # ──────────────────────────────────────────────────
    # DOWNLOAD
    # ──────────────────────────────────────────────────
    print("\n⚽  Logos…")
    logo_ok, logo_fail = download_all("Logos", logo_jobs)

    print("\n👤  Faces…")
    face_ok, face_fail = download_all("Faces", face_jobs)

    # ──────────────────────────────────────────────────
    # WRITE UPDATED JSON
    # ──────────────────────────────────────────────────
    print("\n💾  Saving…")
    with open("teams.json",   "w", encoding="utf-8") as f:
        json.dump(teams,   f, indent=2, ensure_ascii=False)
    with open("players.json", "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    print("  ✓ teams.json    ->  club_logo_url = club_logos/{team_id}.png")
    print("  ✓ players.json  ->  face_url      = player_images/{player_id}.png")

    # ──────────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────────
    print()
    print("=" * 52)
    print(f"  📊  DONE  —  {time.time()-t0:.0f}s")
    print("=" * 52)
    print(f"  Logos   ✓ {logo_ok:,}   ✗ {logo_fail}")
    print(f"  Faces   ✓ {face_ok:,}   ✗ {face_fail}")
    print("=" * 52)
    print()
    print("  Upload all of this to your GitHub repo:")
    print("    club_logos/")
    print("    player_images/")
    print("    teams.json")
    print("    players.json")
    print("    index.html  game.html  game.js  style.css  MatchSimulation.js")
    print()


if __name__ == "__main__":
    main()
