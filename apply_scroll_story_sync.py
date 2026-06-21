import os
import re
import shutil

codex_dir = "/Users/minwokim/Documents/Codex"

scroll_story_js = """
  // Scroll Story for Services
  function setupScrollStory() {
    const story = document.getElementById('services');
    if (!story) return;
    const scenes = Array.from(story.querySelectorAll('.story-scene'));
    const dots = Array.from(story.querySelectorAll('.story-progress span'));
    const clamp01 = v => Math.min(Math.max(v, 0), 1);
    let storyTicking = false;

    const updateStory = () => {
      if (!story.classList.contains('active')) return;
      const total = story.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const raw = clamp01(-story.getBoundingClientRect().top / total);
      const p = 0.5 + raw * (scenes.length - 1);
      
      scenes.forEach((scene, i) => {
        const d = p - (i + 0.5);
        const vis = clamp01(1 - Math.abs(d) * 2.4);
        const eased = vis * vis * (3 - 2 * vis); // smoothstep
        
        if (typeof prefersReducedMotion !== 'undefined' && prefersReducedMotion) {
          scene.style.opacity = Math.abs(d) < 0.5 ? '1' : '0';
          return;
        }
        
        scene.style.opacity = String(eased);
        scene.style.transform = `translateY(${d * -90}px) scale(${0.94 + eased * 0.06})`;
        const photo = scene.querySelector('.story-photo');
        if (photo) {
          photo.style.transform = `translateY(${d * -28}px) scale(1.12)`;
        }
        const line = scene.querySelector('.story-line');
        if (line) {
          line.style.transform = `scaleX(${eased})`;
        }
      });

      const idx = Math.min(Math.round(p - 0.5), scenes.length - 1);
      dots.forEach((dot, i) => dot.classList.toggle('on', i <= idx));
      storyTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (!storyTicking) {
        requestAnimationFrame(updateStory);
        storyTicking = true;
      }
    }, { passive: true });
    
    window.addEventListener('resize', updateStory);
    
    // Listen for tab changes (via class MutationObserver)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateStory();
        }
      });
    });
    observer.observe(story, { attributes: true });
    
    updateStory();
  }
"""

def update_aiing_js():
    filepath = os.path.join(codex_dir, "ai-ing.html")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Inject setupScrollStory() JS definition if not present
    if "function setupScrollStory(" not in content:
        # We can insert it before window.addEventListener('DOMContentLoaded')
        target = "  // On page load, check hash for tab"
        if target in content:
            content = content.replace(target, scroll_story_js + "\n" + target)
        else:
            print("Error: Target not found in ai-ing.html JS")
            return

    # Call setupScrollStory() in DOMContentLoaded if not present
    dom_call_pattern = r"window\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{([^}]+)\}\);"
    match = re.search(dom_call_pattern, content)
    if match:
        body = match.group(1)
        if "setupScrollStory()" not in body:
            new_dom = f"window.addEventListener('DOMContentLoaded', () => {{{body}    setupScrollStory();\n  }});"
            content = re.sub(dom_call_pattern, new_dom, content)
            print("Successfully updated DOMContentLoaded in ai-ing.html")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated JS in ai-ing.html")

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
    
    # Also sync ai-ing.html to dist/
    shutil.copy(os.path.join(codex_dir, "ai-ing.html"), os.path.join(codex_dir, "dist/ai-ing.html"))
    print("Generated copies for routing fallbacks.")

if __name__ == "__main__":
    update_aiing_js()
    sync_copies()
