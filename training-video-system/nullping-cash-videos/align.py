#!/usr/bin/env python3
"""Align slide anchors to NullPing Cash voiceover word timestamps."""
import json
import re
from difflib import SequenceMatcher

BASE = r"c:\Users\Admin\Desktop\nullping\training-video-system\nullping-cash-videos"


def norm(t):
    out = []
    for w in t.lower().split():
        w = re.sub(r"[^a-z0-9]+", "", w)
        if w:
            out.append(w)
    return out


def load_words(path):
    d = json.load(open(path, encoding="utf-8"))
    words = []
    for s in d["segments"]:
        for w in s["words"]:
            token = re.sub(r"[^a-z0-9]+", "", w["w"].lower())
            if token:
                words.append({"t": token, "raw": w["w"].strip(), "s": w["s"], "e": w["e"]})
    return words


def find_anchor(words, anchor, start_idx):
    atoks = norm(anchor)
    n = len(atoks)
    best, best_i = 0.0, None
    hi = len(words) - n
    for i in range(start_idx, hi):
        window = [words[j]["t"] for j in range(i, i + n)]
        r = SequenceMatcher(None, atoks, window).ratio()
        if r > best:
            best, best_i = r, i
            if r > 0.97:
                break
    return best_i, best


def captions(words, max_chars=46):
    chunks, cur, cur_s = [], [], None
    for w in words:
        if cur_s is None:
            cur_s = w["s"]
        cur.append(w)
        text = " ".join(x["raw"] for x in cur)
        endp = re.search(r"[.!?…]$", w["raw"])
        if len(text) >= max_chars or endp:
            chunks.append({"s": round(cur_s, 2), "e": round(w["e"], 2), "text": text})
            cur, cur_s = [], None
    if cur:
        chunks.append({"s": round(cur_s, 2), "e": round(cur[-1]["e"], 2), "text": " ".join(x["raw"] for x in cur)})
    return chunks


def build(video, slides, out_path):
    words = load_words(f"{BASE}/transcripts/{video}.json")
    dur = max(w["e"] for w in words)
    resolved = []
    idx = 0
    misses = []
    for sl in slides:
        if sl.get("anchor") is None:
            t = sl.get("at", 0.0)
        else:
            i, score = find_anchor(words, sl["anchor"], idx)
            if i is None or score < 0.55:
                misses.append((sl["anchor"], score))
                continue
            t = words[i]["s"]
            idx = i
        item = {k: v for k, v in sl.items() if k not in ("anchor", "at")}
        item["start"] = round(t, 2)
        resolved.append(item)
    for a, b in zip(resolved, resolved[1:]):
        a["end"] = b["start"]
    resolved[-1]["end"] = round(dur, 2)
    data = {"durationSec": round(dur + 0.5, 2), "slides": resolved, "captions": captions(words)}
    json.dump(data, open(out_path, "w", encoding="utf-8"), indent=1)
    print(f"video {video}: {len(resolved)} slides, dur {dur:.1f}s -> {out_path}")
    for m, s in misses:
        print(f"  MISS ({s if s else 0:.2f}): {m[:70]}")


V1 = [
    {"anchor": None, "at": 0.0, "type": "intro", "num": "1", "title": ["WATCH", "THIS FIRST"], "sub": "Before you touch anything"},
    {"anchor": "a little voice is gonna show up in your head", "type": "quote", "text": "\u201cDid I really just spend money on that?\u201d", "label": "TONIGHT, A LITTLE VOICE"},
    {"anchor": "before you click a single button before you open a single tool", "type": "shot", "img": "dashboard.png", "caption": "Give me ten minutes. Just ten."},
    {"anchor": "but first congratulations not for buying software", "type": "title", "kicker": "FIRST THINGS FIRST", "headline": "Congratulations.", "sub": "Not for buying software \u2014 for what buying it says about you."},
    {"anchor": "most people watch videos about making money online for years", "type": "title", "kicker": "THE DIVIDING LINE", "headline": "Most people watch.\nYou decided.", "sub": "A decision, backed with your own money."},
    {"anchor": "it's not talent it's not luck it's decisions", "type": "title", "kicker": "", "headline": "Not talent.\nNot luck.\nDECISIONS.", "sub": ""},
    {"anchor": "now let's talk about that voice because I know its script by heart", "type": "title", "kicker": "NAME THE ENEMY", "headline": "The Remorse Voice", "sub": "It has a script. I know it by heart."},
    {"anchor": "you've bought stuff like this before and it's still sitting", "type": "quote", "text": "\u201cYou've bought stuff like this before\u2026\u201d", "label": "THE VOICE SAYS"},
    {"anchor": "everybody online is running some kind of scam", "type": "quote", "text": "\u201cEverybody online is running some kind of scam\u2026\u201d", "label": "THE VOICE SAYS"},
    {"anchor": "you don't even use pinterest what are you doing", "type": "quote", "text": "\u201cYou don't even use Pinterest\u2026\u201d", "label": "THE VOICE SAYS"},
    {"anchor": "you're not the kind of person this actually works for", "type": "quote", "text": "\u201cYou're not the kind of person this works for.\u201d", "label": "ITS FAVORITE ONE \u2014 2 AM"},
    {"anchor": "every single member who's ever made this work heard that exact same voice", "type": "title", "kicker": "HERE'S THE TRUTH", "headline": "Every successful member\nheard that voice.", "sub": "Every. Single. One. It's just noise. It's weather."},
    {"anchor": "psychologists have been studying this since the fifties", "type": "title", "kicker": "SINCE THE 1950s", "headline": "Post-Purchase\nDissonance", "sub": "Your brain felt the money leave \u2014 it can't see the result yet."},
    {"anchor": "it's not the feeling of a mistake it's the feeling of a commitment", "type": "title", "kicker": "SO THAT FEELING?", "headline": "Not a mistake.\nA commitment.", "sub": "Nobody gets buyer's remorse over a sandwich."},
    {"anchor": "you didn't buy software today you bought a different kind of tuesday", "type": "title", "kicker": "WHAT YOU ACTUALLY BOUGHT", "headline": "A different kind\nof Tuesday.", "sub": "Picture it \u2014 a few weeks from now."},
    {"anchor": "you open nullping cash you pick a product you want to promote", "type": "shot", "img": "activate.png", "caption": "Pick a product. Press one button. Page built."},
    {"anchor": "then you press another button and it hands you ten pictures", "type": "shot", "img": "traffic.png", "caption": "Ten pins. Titles and descriptions already written."},
    {"anchor": "here's why picking this was smart in plain terms", "type": "title", "kicker": "WHY THIS WAS SMART", "headline": "Companies pay you\na cut of the sale.", "sub": "Shoppers are already on Pinterest \u2014 looking to buy."},
    {"anchor": "that grind is where beginners quit and that grind is exactly what nullping cash does for you", "type": "title", "kicker": "THE REAL OBSTACLE", "headline": "The grind is where\nbeginners quit.", "sub": "NullPing builds the page and the pictures."},
    {"anchor": "you didn't buy a lottery ticket today", "type": "title", "kicker": "", "headline": "Not a lottery ticket.", "sub": "You bought back the hours standing between you and shoppers."},
    {"anchor": "before nullping cash was ever a product this was just my own routine", "type": "title", "kicker": "HOW I KNOW", "headline": "Before it was a product,\nit was my workflow.", "sub": "Weekends lost to building one page at a time."},
    {"anchor": "same me but instead of one page a month there were pages and pictures going out constantly", "type": "title", "kicker": "WHAT CHANGED", "headline": "Same me.\nMore output.", "sub": "That exact routine \u2014 cleaned up and put behind buttons."},
    {"anchor": "sometime this week you're gonna mention this to somebody", "type": "quote", "text": "\u201cYou bought WHAT?\u201d", "label": "THE LOOK \u2014 IT'S COMING"},
    {"anchor": "they're not judging nullping cash they can't be they've never seen it", "type": "title", "kicker": "REMEMBER THIS", "headline": "That's love,\nexpressed badly.", "sub": "Skeptics aren't convinced by debates. They're convinced by results."},
    {"anchor": "give me a month I'll show you instead of telling you", "type": "quote", "text": "\u201cGive me a month \u2014 I'll show you\ninstead of telling you.\u201d", "label": "JUST SAY THIS"},
    {"anchor": "now the part most sellers skip which is exactly why I won't", "type": "title", "kicker": "THE HONEST PART", "headline": "This works.\nAnd it's still work.", "sub": "The software removes the building \u2014 not the showing up."},
    {"anchor": "if anybody ever promises you money with zero effort close the tab", "type": "title", "kicker": "STRAIGHT TALK", "headline": "\u201cZero effort\u201d\nis a lie.", "sub": "Every twenty minutes you put in leaves something behind."},
    {"anchor": "in between them you'll see a gold card it says free member training", "type": "banner", "headline": "FREE MEMBER TRAINING", "sub": "Scale to $1,000 \u2013 $5,000 per day", "note": "Gold card between Start Here videos"},
    {"anchor": "click the button that says click here to learn how register", "type": "banner", "headline": "CLICK HERE TO LEARN HOW", "sub": "Takes about thirty seconds. Do it now.", "note": "Buyers hesitate. Doers click."},
    {"anchor": "here's your map from here so you're never lost", "type": "steps", "kicker": "YOUR MAP", "items": ["This video", "How The Money Flows", "Your 5-Minute Tour", "Academy"], "sub": "Video \u2192 video \u2192 tour \u2192 Academy. That's the whole path."},
    {"anchor": "you're covered by the thirty day guarantee exactly as promised", "type": "title", "kicker": "PRESSURE'S OFF", "headline": "You're covered.", "sub": "30-day money-back guarantee. Now\u2026 we build."},
    {"anchor": "that next video how the money flows I'd call it the difference", "type": "title", "kicker": "UP NEXT", "headline": "How the money\nactually flows.", "sub": "The difference between members who make this work \u2014 and members who stay confused."},
    {"anchor": "hit play on how the money flows and I'll see you in the next video", "type": "end", "headline": "Hit play on How The Money Flows", "sub": "See you in the next video."},
]

V2 = [
    {"anchor": None, "at": 0.0, "type": "intro", "num": "2", "title": ["HOW THE", "MONEY FLOWS"], "sub": "Where it comes from \u00b7 how you get paid"},
    {"anchor": "I want to hand you one thing the thing the training assumes you already have the map", "type": "title", "kicker": "BEFORE YOU TOUCH A TOOL", "headline": "The Map.", "sub": "How money moves \u2014 assuming you know nothing."},
    {"anchor": "ten minutes now saves you about ten hours of confusion later", "type": "title", "kicker": "TEN MINUTES NOW", "headline": "\u201cOh \u2014 obviously.\u201d\nvs \u201cWait \u2014 what?\u201d", "sub": "Ten minutes now saves ten hours of confusion later."},
    {"anchor": "here's the whole business in one sentence", "type": "title", "kicker": "THE WHOLE BUSINESS", "headline": "One sentence.", "sub": ""},
    {"anchor": "companies will pay you a cut of the sale every time you send them a customer who buys", "type": "title", "kicker": "", "headline": "Send a customer.\nGet paid a cut.", "sub": "That's the machine. Everything else is detail."},
    {"anchor": "imagine a massive shopping center right by the doors a giant noticeboard", "type": "title", "kicker": "THE MASTER ANALOGY", "headline": "Board. Room.\nDoor. Fee.", "sub": "Pinterest is the noticeboard. Your money page is the room."},
    {"anchor": "why would a shopper listen to a stranger because that's already how people shop", "type": "title", "kicker": "WHO PAYS & WHY", "headline": "They pay for customers.\nShoppers want real pages.", "sub": "You're holding the door open when they decide."},
    {"anchor": "so where does nullping cash actually sit in all that", "type": "title", "kicker": "WHERE NULLPING SITS", "headline": "Building the room\nis where people quit.", "sub": "NullPing replaces that link."},
    {"anchor": "you give it a product it writes and builds the room for you", "type": "shot", "img": "activate.png", "caption": "Activate Asset \u2192 money page built in minutes."},
    {"anchor": "then it makes your flyers ten at a time titles and descriptions already done", "type": "shot", "img": "traffic.png", "caption": "Ten pins per run. Copy, download, post."},
    {"anchor": "right let's learn the local language", "type": "title", "kicker": "JARGON SCHOOL", "headline": "10 words.\n30 seconds each.", "sub": "No jargon left behind."},
    {"anchor": "first one affiliate a company agrees to pay outsiders for customers", "type": "term", "n": 1, "term": "Affiliate", "def": "A company pays outsiders for customers \u2014 with a link that has your name in it.", "analogy": "A name-tag on a customer walking into the store."},
    {"anchor": "next your money page that's the review page nullping builds you", "type": "term", "n": 2, "term": "Money Page", "def": "The review page NullPing builds, with a button to buy.", "analogy": "Your little room down the corridor."},
    {"anchor": "next activate asset that's the button that builds your money page", "type": "term", "n": 3, "term": "Activate Asset", "def": "Builds your money page from a product address or name.", "analogy": "Ordering a shop from a blueprint."},
    {"anchor": "next publish publishing puts that page live on the internet", "type": "term", "n": 4, "term": "Publish", "def": "Puts your page live at its own web address.", "analogy": "Flipping the sign from closed to open."},
    {"anchor": "next a pin on pinterest a pin is an image with a title", "type": "term", "n": 5, "term": "Pin", "def": "An image with title, description, and link on Pinterest.", "analogy": "The flyer on the noticeboard."},
    {"anchor": "next a tracking link that's the link inside your pin", "type": "term", "n": 6, "term": "Tracking Link", "def": "Goes to your money page and records the visit.", "analogy": "A stamped ticket at the door."},
    {"anchor": "next results that's the page inside the app showing two honest numbers", "type": "term", "n": 7, "term": "Results", "def": "Visitors to your pages and clicks to the product.", "analogy": "Your foot-traffic counter."},
    {"anchor": "next your niche that's just the category you decide to work in", "type": "term", "n": 8, "term": "Niche", "def": "The category you focus on \u2014 kitchen gadgets, fitness, dog stuff.", "analogy": "One aisle of the supermarket you decide to own."},
    {"anchor": "next commission that's the money the company pays you after somebody buys", "type": "term", "n": 9, "term": "Commission", "def": "The finder's fee after someone buys through your link.", "analogy": "This is the actual money."},
    {"anchor": "and the last one premium features that's the sidebar section with the paid upgrades", "type": "term", "n": 10, "term": "Premium Features", "def": "Paid upgrades in the sidebar \u2014 for later.", "analogy": "The back room with the power tools."},
    {"anchor": "let's watch every one of those words do its job once start to finish", "type": "title", "kicker": "THE STORY PASS", "headline": "Meet Dana.", "sub": "Tuesday night. Kitchen gadgets. One full loop."},
    {"anchor": "she opens nullping cash she clicks activate asset", "type": "shot", "img": "activate.png", "caption": "Activate Asset \u2192 money page ready."},
    {"anchor": "then she goes to generate traffic and it hands her ten pins", "type": "shot", "img": "traffic.png", "caption": "Ten pins. Every one pointing back at her page."},
    {"anchor": "then saturday morning she opens results and there it is visitors", "type": "shot", "img": "results.png", "caption": "Visitors. Clicks. Commission on the company side."},
    {"anchor": "now three doubts you've got all three of them right now everybody does", "type": "steps", "kicker": "THE 3 DOUBTS", "items": ["Does this actually work?", "Can I do it?", "Do my circumstances allow it?"], "sub": ""},
    {"anchor": "companies have paid outsiders to bring them customers for as long as shops have existed", "type": "title", "kicker": "DOES IT WORK?", "headline": "NullPing didn't invent\nthis game.", "sub": "It automated the part everyone quits over."},
    {"anchor": "what's left is picking a product and pressing buttons in order", "type": "title", "kicker": "CAN I DO IT?", "headline": "Pick. Press.\nPublish. Post.", "sub": "If you can shop online, you can do this."},
    {"anchor": "your first page and its ten pins is one sitting call it half an hour", "type": "title", "kicker": "MY CIRCUMSTANCES?", "headline": "~30 min first win.\nA few minutes after.", "sub": "Five generation runs a day. Built for life alongside a job."},
    {"anchor": "let's do honest math small numbers because small numbers are the only ones worth trusting", "type": "title", "kicker": "HONEST MATH", "headline": "One page.\nTen pins.", "sub": "Small numbers stacked, over and over."},
    {"anchor": "on your home screen in between those start here videos there's a gold card", "type": "banner", "headline": "FREE MEMBER TRAINING", "sub": "Scale to $1,000 \u2013 $5,000 per day", "note": "Click Here To Learn How \u2014 thirty seconds."},
    {"anchor": "okay how to actually use what's in here", "type": "steps", "kicker": "YOUR ORDER", "items": ["Your 5-Minute Tour", "Activate Your First Asset", "Publish Your Money Page", "Pinterest Traffic & Results"], "sub": "One video. Do the thing. Then the next."},
    {"anchor": "open activate asset give it one product a web address or just the name", "type": "shot", "img": "activate.png", "caption": "Tonight: Activate \u2192 Publish. One live page."},
    {"anchor": "you now understand how this business works better than most people", "type": "title", "kicker": "YOU'RE AN OPERATOR NOW", "headline": "You're not a buyer.\nYou're an operator.", "sub": "You know who pays. You know what every word means."},
    {"anchor": "so go on let's get that door open I'll see you in the tour", "type": "end", "headline": "Let's get that door open.", "sub": "I'll see you in the tour."},
]

build("1", V1, f"{BASE}/remotion/src/data/video1.json")
build("2", V2, f"{BASE}/remotion/src/data/video2.json")
