import os
import shutil

codex_dir = "/Users/minwokim/Documents/Codex"

def sync_copies():
    # Sync index.html to landing.html, dist/index.html, dist/landing.html
    shutil.copy(os.path.join(codex_dir, "index.html"), os.path.join(codex_dir, "landing.html"))
    shutil.copy(os.path.join(codex_dir, "index.html"), os.path.join(codex_dir, "dist/index.html"))
    shutil.copy(os.path.join(codex_dir, "index.html"), os.path.join(codex_dir, "dist/landing.html"))
    print("Synced main templates.")

    # Create root copies
    for page in ["about.html", "services.html", "payment.html", "contact.html"]:
        shutil.copy(os.path.join(codex_dir, "index.html"), os.path.join(codex_dir, page))
        shutil.copy(os.path.join(codex_dir, "index.html"), os.path.join(codex_dir, "dist", page))
    print("Generated copies for routing fallbacks.")

    # Sync bg_video_*.mp4 files to dist/
    for i in range(1, 5):
        vid_name = f"bg_video_{i}.mp4"
        src_path = os.path.join(codex_dir, vid_name)
        dest_path = os.path.join(codex_dir, "dist", vid_name)
        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
            print(f"Synced {vid_name} to dist/")

    # Sync _redirects to dist/_redirects (Cloudflare Pages reads redirects from the output directory)
    src_redirects = os.path.join(codex_dir, "_redirects")
    dest_redirects = os.path.join(codex_dir, "dist", "_redirects")
    if os.path.exists(src_redirects):
        shutil.copy(src_redirects, dest_redirects)
        print("Synced _redirects to dist/_redirects")

    # Sync slides/ directory to dist/slides/
    src_slides = os.path.join(codex_dir, "slides")
    dest_slides = os.path.join(codex_dir, "dist", "slides")
    if os.path.exists(src_slides):
        if os.path.exists(dest_slides):
            shutil.rmtree(dest_slides)
        shutil.copytree(src_slides, dest_slides)
        print("Synced slides/ directory to dist/slides/")

if __name__ == "__main__":
    sync_copies()
