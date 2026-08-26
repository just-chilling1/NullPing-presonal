"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Facebook, PlayCircle, CheckCircle2, Link as LinkIcon,
    Copy, Check, ArrowRight, DollarSign, Users, Clock,
    MessageSquare, Sparkles, BookOpen, ChevronDown, ChevronUp,
    ExternalLink
} from "lucide-react";
import { clsx } from "clsx";
import { brand } from "@/config/brand.config";
import { PREMIUM_NICHE_FILTER_LABELS } from "@/lib/premium-niches";
import { PremiumPageLayout } from "@/components/premium/PremiumPageLayout";
import { PremiumVideoTutorial } from "@/components/premium/PremiumVideoTutorial";
import { PremiumStepsSection } from "@/components/premium/PremiumStepsSection";
import { PremiumFooter } from "@/components/premium/PremiumFooter";
import { getPremiumFeatureThumbnail } from "@/lib/video-thumbnails";

const NICHES = PREMIUM_NICHE_FILTER_LABELS;

interface FBPost {
    id: string;
    niche: string;
    text: string;
}

const POSTS: FBPost[] = [
    // Weight Loss
    { id: "wl1", niche: "Fitness & Sports", text: "I never thought I'd be the person sharing a weight loss story, but here I am. After years of yo-yo dieting, I finally found something that actually works. Down 23 lbs in 8 weeks — no crazy workouts, no starving myself. If you're tired of trying everything and nothing sticking, this is what changed everything for me: {LINK}" },
    { id: "wl2", niche: "Fitness & Sports", text: "Okay I have to share this because I'm genuinely shocked. I started this simple method 6 weeks ago and I've already dropped 2 dress sizes. My coworkers keep asking what I'm doing differently. If you want to know the exact system I'm using, check this out: {LINK}" },
    { id: "wl3", niche: "Fitness & Sports", text: "For anyone who's been struggling with belly fat — I feel you. I tried keto, intermittent fasting, even those weird teas. Nothing lasted. Then a friend recommended this and within 3 weeks I could see my waistline shrinking. Seriously worth a look: {LINK}" },
    { id: "wl4", niche: "Fitness & Sports", text: "My doctor told me I needed to lose weight or I'd be on medication for life. That scared me. I found this program and it's been a complete game-changer. 31 lbs gone and my blood work is the best it's been in years. Here's what I used: {LINK}" },
    { id: "wl5", niche: "Fitness & Sports", text: "I used to skip mirrors. Now I take selfies. 😂 If you told me 3 months ago I'd feel confident in a swimsuit, I would've laughed. This simple daily routine changed everything. Check it out if you're ready to finally see results: {LINK}" },
    { id: "wl6", niche: "Fitness & Sports", text: "Just hit my goal weight this morning and I'm literally crying. 47 lbs down since January. No gym membership, no expensive meal plans. Just this one thing I do every day. If I can do it, anyone can: {LINK}" },
    { id: "wl7", niche: "Fitness & Sports", text: "Can we talk about how hard it is to lose weight after 40? Everything slows down and nothing works like it used to. But I found something designed specifically for people like us and it WORKS. Down 19 lbs and counting: {LINK}" },
    { id: "wl8", niche: "Fitness & Sports", text: "I was skeptical at first — I've been burned by so many weight loss products. But my sister showed me her results and I had to try it. 4 weeks later, I'm down 15 lbs and my energy is through the roof. See what it's about: {LINK}" },
    { id: "wl9", niche: "Fitness & Sports", text: "The hardest part about losing weight isn't the diet — it's starting over every Monday. I finally broke that cycle. This approach is different because it actually fits into real life. No meal prep, no counting calories. Just results: {LINK}" },
    { id: "wl10", niche: "Fitness & Sports", text: "My husband and I started this together and we've lost a combined 58 lbs in 2 months. We're eating real food, not miserable, and actually enjoying the process. If you and your partner want to do this together: {LINK}" },
    { id: "wl11", niche: "Fitness & Sports", text: "POV: You finally find something that works and you can't stop telling everyone about it 😅 Seriously though, this is the first thing that's given me consistent results without making me feel deprived. Link for anyone curious: {LINK}" },
    { id: "wl12", niche: "Fitness & Sports", text: "I lost 12 lbs in my first 2 weeks. I know that sounds too good to be true — I thought so too. But the science behind this actually makes sense and the results speak for themselves. Worth checking out: {LINK}" },

    // Make Money Online
    { id: "mmo1", niche: "Finance & Investing", text: "I just made my first $500 online and I'm still in shock. No experience, no website, no following. I just followed this step-by-step system and it actually worked. If you want to start earning from your phone: {LINK}" },
    { id: "mmo2", niche: "Finance & Investing", text: "Quit my 9-5 last month. Never thought I'd say that. What changed? I found a simple online method that consistently brings in $200-$400/day. It's not a get-rich-quick thing — it's a real skill. Learn it here: {LINK}" },
    { id: "mmo3", niche: "Finance & Investing", text: "I was drowning in bills 6 months ago. Now I make more from my phone than I ever did at my job. This isn't MLM, not crypto, not dropshipping. It's something most people don't even know about yet: {LINK}" },
    { id: "mmo4", niche: "Finance & Investing", text: "My friend showed me how she makes $3,000/month working 2 hours a day from home. I didn't believe her until she showed me the proof. Now I'm doing the same thing. Here's the exact system: {LINK}" },
    { id: "mmo5", niche: "Finance & Investing", text: "If you have a phone and wifi, you can do this. I'm making an extra $1,200/week with a method that takes less than an hour a day. No selling, no cold calling, no inventory. Just copy and paste: {LINK}" },
    { id: "mmo6", niche: "Finance & Investing", text: "I was so tired of living paycheck to paycheck. Then I discovered this online income stream and everything changed. Made $2,847 in my first month alone. This is legit and it works: {LINK}" },
    { id: "mmo7", niche: "Business & Entrepreneurship", text: "Everyone's talking about AI taking jobs — but nobody's talking about how you can USE AI to make money. I've been using this system for 3 weeks and already crossed $1,000. Totally beginner-friendly: {LINK}" },
    { id: "mmo8", niche: "Business & Entrepreneurship", text: "I used to think making money online was a scam. Then my cousin showed me his bank statements. He's been doing this for 6 months and makes more than most people with degrees. Check it out: {LINK}" },
    { id: "mmo9", niche: "Business & Entrepreneurship", text: "Just got paid $347 while I was sleeping. I know that sounds crazy but this is what happens when you set up the right system. It took me about 30 minutes to set up. Here's how: {LINK}" },
    { id: "mmo10", niche: "Business & Entrepreneurship", text: "Stay-at-home moms — this one's for you. I found a way to make $100-$300/day from my couch while the kids are napping. No experience needed, no boss, no schedule. See how: {LINK}" },
    { id: "mmo11", niche: "Business & Entrepreneurship", text: "This is NOT another survey site or gift card scam. This is a real business model that real people are using to replace their income. I went from $0 to $4,200/month in 90 days. Proof inside: {LINK}" },
    { id: "mmo12", niche: "Business & Entrepreneurship", text: "I showed my mom how to do this and she made $89 on her first day 😂 She called me 5 times asking if it was real. Yes mom, it's real. If a 62-year-old can do it, so can you: {LINK}" },

    // Health & Fitness
    { id: "hf1", niche: "Health & Wellness", text: "I used to wake up exhausted no matter how much I slept. Turns out it wasn't about sleep — it was about what I was missing. Started using this and within a week my energy completely changed. Check it out: {LINK}" },
    { id: "hf2", niche: "Health & Wellness", text: "At 45, I have more energy than I did at 25. Not exaggerating. I started this simple daily routine 2 months ago and the difference is insane. My doctor even noticed the improvement: {LINK}" },
    { id: "hf3", niche: "Health & Wellness", text: "If you deal with joint pain, brain fog, or afternoon crashes — please try this before spending thousands on doctors. It's natural, it's backed by science, and it changed my life: {LINK}" },
    { id: "hf4", niche: "Health & Wellness", text: "I was popping 4-5 ibuprofen a day for my back pain. A friend told me about this and I thought she was crazy. 3 weeks later — no more pills. I can finally play with my kids again: {LINK}" },
    { id: "hf5", niche: "Health & Wellness", text: "My blood sugar was out of control. My doctor wanted to increase my medication. Instead, I tried this natural approach and my numbers improved so much he actually REDUCED my meds: {LINK}" },
    { id: "hf6", niche: "Health & Wellness", text: "I've tried every supplement on Amazon. Most of them are garbage. But this one actually delivers. Better sleep, more focus, and I haven't been sick in months. Worth every penny: {LINK}" },
    { id: "hf7", niche: "Health & Wellness", text: "Working out was never my thing. But I found this program that's designed for people who hate the gym. 15 minutes a day, no equipment, and I'm in the best shape of my life: {LINK}" },
    { id: "hf8", niche: "Health & Wellness", text: "Gut health is everything. I used to bloat after every meal. Now I feel light and energized. If you struggle with digestion, this is a must-try. Changed everything for me: {LINK}" },

    // Beauty & Skincare
    { id: "bs1", niche: "Beauty & Skincare", text: "I spent THOUSANDS on skincare over the years. Serums, facials, dermatologists — you name it. Then I found this one product and my skin has never looked better. I'm 43 and people think I'm 30: {LINK}" },
    { id: "bs2", niche: "Beauty & Skincare", text: "My acne scars have been my biggest insecurity for 10 years. I started using this 6 weeks ago and I can literally see them fading. For the first time, I'm going out without makeup: {LINK}" },
    { id: "bs3", niche: "Beauty & Skincare", text: "PSA for anyone dealing with wrinkles, dark spots, or dull skin: STOP buying expensive creams. This is the only thing that actually worked for me and it costs less than a Starbucks habit: {LINK}" },
    { id: "bs4", niche: "Beauty & Skincare", text: "My sister is a dermatologist and even SHE was impressed by this. Said the ingredients are exactly what she'd recommend but at a fraction of the clinic price. See for yourself: {LINK}" },
    { id: "bs5", niche: "Beauty & Skincare", text: "I'm a 50-year-old grandma and my skin is glowing like I'm 35. Not filters, not Botox — just this one simple routine I do every night. If I can look this good at my age, imagine what it'll do for you: {LINK}" },
    { id: "bs6", niche: "Beauty & Skincare", text: "Okay I need to talk about this because my under-eye bags are GONE. I've had them since my 20s and nothing ever worked. 2 weeks with this and I look like I actually sleep 8 hours: {LINK}" },
    { id: "bs7", niche: "Beauty & Skincare", text: "If your skin is dry, flaky, or just not cooperating — try this before you spend money on another fancy serum. This actually hydrates from the inside out. My skin hasn't felt this soft since I was a teenager: {LINK}" },
    { id: "bs8", niche: "Beauty & Skincare", text: "Ladies, STOP letting TikTok convince you that you need a 12-step routine. I simplified mine to just this one thing and my skin cleared up in weeks. Less is more: {LINK}" },

    // Relationships
    { id: "rel1", niche: "Self-Help & Personal Development", text: "My marriage was falling apart. We barely talked, constant arguments, sleeping in separate rooms. Then we tried this and it literally saved us. We're closer now than when we were dating: {LINK}" },
    { id: "rel2", niche: "Self-Help & Personal Development", text: "I kept attracting the wrong people. Toxic relationship after toxic relationship. Then I learned this one mindset shift and everything changed. Now I'm in the healthiest relationship of my life: {LINK}" },
    { id: "rel3", niche: "Self-Help & Personal Development", text: "If you feel like the spark is gone in your relationship, try this before giving up. My partner and I went from roommates back to soulmates in less than a month: {LINK}" },
    { id: "rel4", niche: "Self-Help & Personal Development", text: "Men — if you feel like she's pulling away and you don't know why, this will explain everything. I almost lost my wife before I understood this. Could save your relationship: {LINK}" },
    { id: "rel5", niche: "Self-Help & Personal Development", text: "I was single for 4 years and honestly thought I'd be alone forever. Then I learned these communication techniques and met the love of my life within 3 months. It works: {LINK}" },
    { id: "rel6", niche: "Self-Help & Personal Development", text: "The #1 reason relationships fail isn't cheating or money — it's communication. Once I learned the right way to connect with my partner, everything changed. This taught me how: {LINK}" },

    // Tech & Gadgets
    { id: "tg1", niche: "Digital Marketing", text: "I just found this gadget that cuts my phone bill in HALF. No contract, no switching carriers. I've saved over $600 this year alone. Everyone needs to know about this: {LINK}" },
    { id: "tg2", niche: "Digital Marketing", text: "If you work from home, you NEED this. It boosted my wifi speed by 300% and I haven't had a dropped Zoom call since. Best $30 I've ever spent: {LINK}" },
    { id: "tg3", niche: "Digital Marketing", text: "My electric bill was killing me. Then I found this smart device that literally monitors and reduces your energy usage automatically. Saved $89 last month alone. Check it out: {LINK}" },
    { id: "tg4", niche: "Digital Marketing", text: "I bought this portable charger and it's a GAME CHANGER. Charges my phone 5 times on a single charge and fits in my pocket. If you're always running low on battery: {LINK}" },
    { id: "tg5", niche: "Digital Marketing", text: "My car kept breaking down and mechanics wanted thousands to fix it. Then someone told me about this $20 diagnostic tool that plugs into your car and tells you exactly what's wrong. Saved me $2,000: {LINK}" },
    { id: "tg6", niche: "Digital Marketing", text: "If you still don't have a dash cam, you're playing with fire. This one is $40, records in 4K, and saved my friend from a $15,000 insurance scam. Don't wait until it's too late: {LINK}" },

    // Pets
    { id: "pet1", niche: "Travel & Lifestyle", text: "My dog used to bark at EVERYTHING. The mailman, other dogs, leaves blowing in the wind 🤦 I tried this training method and within a week he was a completely different dog. If your pup needs help: {LINK}" },
    { id: "pet2", niche: "Travel & Lifestyle", text: "I was spending $200/month on vet-recommended dog food. Then I found this alternative that's actually healthier AND cheaper. My dog's coat has never been shinier: {LINK}" },
    { id: "pet3", niche: "Travel & Lifestyle", text: "Pet parents — if your fur baby has anxiety (storms, car rides, separation), this is a must-try. It's natural, vet-approved, and my dog went from shaking to sleeping peacefully: {LINK}" },
    { id: "pet4", niche: "Travel & Lifestyle", text: "My cat was destroying my furniture. Like, DESTROYING it. I was about to give up and then I found this trick. 3 days later, not a single scratch on the couch. Miracle: {LINK}" },
    { id: "pet5", niche: "Travel & Lifestyle", text: "If your dog pulls on the leash like a maniac, you need this. Walks went from a nightmare to actually enjoyable. My arm doesn't hurt anymore 😂 Check it out: {LINK}" },
    { id: "pet6", niche: "Travel & Lifestyle", text: "My senior dog was barely moving. I thought it was just old age. Started giving him this supplement and now he's running around like a puppy again. Broke my heart to see him struggle — now he's thriving: {LINK}" },

    // Home & Garden
    { id: "hg1", niche: "Travel & Lifestyle", text: "I just cleaned my entire kitchen with ONE product. No chemicals, no scrubbing for hours. This stuff is magic and it's actually safe around kids and pets: {LINK}" },
    { id: "hg2", niche: "Travel & Lifestyle", text: "My garden was dead. Like, embarrassingly dead. I started using this simple system and now my neighbors are asking ME for gardening advice. Zero experience needed: {LINK}" },
    { id: "hg3", niche: "Travel & Lifestyle", text: "If your house smells weird no matter how much you clean — this is the answer. It doesn't just mask odors, it eliminates them. My house smells amazing 24/7 now: {LINK}" },
    { id: "hg4", niche: "Travel & Lifestyle", text: "I was quoted $8,000 for a bathroom renovation. Instead, I used this DIY kit and did it myself for under $200. It looks PROFESSIONAL. No experience needed. See it here: {LINK}" },
    { id: "hg5", niche: "Travel & Lifestyle", text: "Mold in the bathroom? I tried bleach, vinegar, everything. This product removed it in ONE application and it hasn't come back in 6 months. If you're dealing with mold: {LINK}" },
    { id: "hg6", niche: "Travel & Lifestyle", text: "My energy bill dropped by 40% after I installed this one thing. Takes 10 minutes, no electrician needed. Best home investment I've ever made: {LINK}" },
];

export default function InstantIncomePage() {
    const [selectedNiche, setSelectedNiche] = useState("All");
    const [affiliateLink, setAffiliateLink] = useState("");
    const [showPosts, setShowPosts] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(true);

    const filteredPosts = useMemo(() => {
        const base = selectedNiche === "All"
            ? POSTS
            : POSTS.filter(p => p.niche === selectedNiche);
        return base;
    }, [selectedNiche]);

    const postsWithLink = useMemo(() => {
        if (!affiliateLink.trim()) return filteredPosts;
        return filteredPosts.map(p => ({
            ...p,
            text: p.text.replace("{LINK}", affiliateLink.trim())
        }));
    }, [filteredPosts, affiliateLink]);

    const handleCopy = (text: string, id: string) => {
        const finalText = text.replace("{LINK}", affiliateLink.trim() || "[YOUR LINK]");
        navigator.clipboard.writeText(finalText);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleShowPosts = () => {
        setShowPosts(true);
        setTimeout(() => {
            document.getElementById("posts-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return (
        <PremiumPageLayout
            title="Instant Income"
            subtitle="200+ ready-to-post Facebook messages — copy, paste in groups, and start earning today. No tech skills needed."
            footer={<PremiumFooter />}
        >
            <PremiumVideoTutorial
                vimeoId=""
                iframeTitle="Instant Access Tutorial"
                title="How to Use Instant Income"
                description="Watch this quick tutorial to learn how to copy these Facebook posts and start making money instantly. Simple and easy!"
                thumbnailSrc={getPremiumFeatureThumbnail("premium-social")}
            />

            <PremiumStepsSection
                steps={[
                    {
                        num: "1",
                        title: "Pick Your Niche",
                        desc: "Choose the niche that matches your affiliate offer — the same nine niches used across all premium features.",
                    },
                    {
                        num: "2",
                        title: "Enter Your Link",
                        desc: "Paste your affiliate link below. We'll automatically add it to all the posts for you. No manual work!",
                    },
                    {
                        num: "3",
                        title: "Copy & Post",
                        desc: 'Click "Copy" on any post and paste it into Facebook groups. Post 3-5 times per day for best results!',
                    },
                ]}
            />

            {/* How to Find & Post Guide (Collapsible) */}
            <section className="glass-card overflow-hidden">
                <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full p-8 flex items-center justify-between text-left"
                >
                    <div className="flex items-center gap-3">
                        <BookOpen size={22} className="text-pulse-700" />
                        <h2 className="text-xl font-medium text-text-primary">How to Find & Post in Facebook Groups</h2>
                    </div>
                    {showGuide ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
                </button>

                <AnimatePresence>
                    {showGuide && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-8 pb-8 flex flex-col gap-6">
                                {/* Step 1 */}
                                <div className="bg-surface border border-border-dim rounded-xl p-6 flex flex-col gap-3">
                                    <h3 className="text-base font-medium text-text-primary">Step 1: Find Facebook Groups</h3>
                                    <ul className="flex flex-col gap-2.5 text-sm text-text-secondary leading-relaxed">
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Go to Facebook and click the search bar at the top. Type keywords like &quot;weight loss support&quot;, &quot;make money online&quot;, or &quot;fitness motivation&quot;</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Click &quot;Groups&quot; in the left sidebar to see only groups (not pages or people)</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Join 10-15 groups with 5,000+ members. Bigger groups = more people seeing your posts = more money!</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Wait for the group admin to approve you (usually takes 1-24 hours). Be patient - it&apos;s worth it!</li>
                                    </ul>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-surface border border-border-dim rounded-xl p-6 flex flex-col gap-3">
                                    <h3 className="text-base font-medium text-text-primary">Step 2: Read the Group Rules</h3>
                                    <ul className="flex flex-col gap-2.5 text-sm text-text-secondary leading-relaxed">
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Click &quot;About&quot; in the group to see the rules. Most groups allow personal stories but not direct selling</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Our posts are written as personal success stories, so they&apos;re usually allowed. But always check first!</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>If a group says &quot;no links&quot;, you can still post the message and send the link in private messages to people who ask</li>
                                    </ul>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-surface border border-border-dim rounded-xl p-6 flex flex-col gap-3">
                                    <h3 className="text-base font-medium text-text-primary">Step 3: Post Your Message</h3>
                                    <ul className="flex flex-col gap-2.5 text-sm text-text-secondary leading-relaxed">
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Click &quot;Write something...&quot; in the group. Paste your copied message. Click &quot;Post&quot;. That&apos;s it!</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span><strong className="text-text-primary">Best times to post:</strong> 7-9 AM (before work), 12-1 PM (lunch break), 7-9 PM (after work). People are most active then!</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>Post in 3-5 different groups per day. DON&apos;T post in all groups at once or Facebook might think you&apos;re spamming</li>
                                        <li className="flex gap-2"><span className="text-pulse-700 mt-0.5">•</span>When people comment, reply within 1 hour! Be friendly and helpful. This makes your post show up more in the group</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* How Much Can You Make? */}
            <section className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <DollarSign size={22} className="text-pulse-700" />
                    <h2 className="text-xl font-medium text-text-primary">How Much Can You Make?</h2>
                </div>
                <p className="text-text-secondary mb-5 leading-relaxed">
                    Each post can generate $40-$400 per day depending on the niche and how many groups you post in. Here&apos;s the math:
                </p>
                <div className="flex flex-col gap-3">
                    {[
                        "Post in 5 groups per day = 5 posts. If each post makes $50/day, that's $250/day total!",
                        "Do this for 30 days = $7,500/month. Just from copying and pasting!",
                        "The more groups you join and post in, the more money you make. It's that simple!"
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                            <span className="text-pulse-700 font-medium mt-0.5">•</span>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ====== GET YOUR POSTS NOW ====== */}
            <section className="flex flex-col gap-8">
                <h2 className="text-2xl font-medium text-text-primary">Get Your Posts Now</h2>

                {/* Step 1: Niche Selector */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-base font-medium text-text-primary">Step 1: Choose Your Niche</h3>
                    <div className="flex flex-wrap gap-2">
                        {NICHES.map((niche) => (
                            <button
                                key={niche}
                                onClick={() => { setSelectedNiche(niche); setShowPosts(false); }}
                                className={clsx(
                                    "px-5 py-2.5 rounded-full text-sm font-medium transition-all border",
                                    selectedNiche === niche
                                        ? "bg-grad-pulse border-[var(--np-line-pulse)] text-black"
                                        : "bg-surface border-border-dim text-text-secondary hover:border-[var(--np-line-pulse)] hover:text-text-primary"
                                )}
                            >
                                {niche}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Where to Get Your Affiliate Link */}
                <div className="glass-card p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-pulse-700" />
                        <h3 className="text-base font-medium text-text-primary">Where to Get Your Affiliate Link</h3>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                        We recommend using <strong className="text-text-primary">DigiStore24</strong> - a free affiliate marketplace where you can find thousands of products to promote and earn commissions.
                    </p>
                    <div className="bg-surface border border-border-dim rounded-xl p-5 flex flex-col gap-3">
                        <p className="text-sm font-medium text-text-secondary">How to Get Started (3 Easy Steps):</p>
                        <ol className="flex flex-col gap-2 text-sm text-text-secondary list-decimal list-inside">
                            <li>Go to <a href="https://www.digistore24.com" target="_blank" rel="noopener noreferrer" className="text-pulse-700 hover:underline">digistore24.com</a> and create a FREE account (takes 2 minutes)</li>
                            <li>Browse products in your chosen niche above and click &quot;Promote&quot; on any product</li>
                            <li>Copy your unique affiliate link and paste it in the box below</li>
                        </ol>
                    </div>
                    <a
                        href="https://www.digistore24.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary py-3 text-sm"
                    >
                        Create Free DigiStore24 Account
                        <ArrowRight size={16} />
                    </a>
                </div>

                {/* Step 2: Affiliate Link Input */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-base font-medium text-text-primary">Step 2: Enter Your Affiliate Link</h3>
                    <input
                        type="url"
                        placeholder="https://your-affiliate-link.com"
                        className="w-full bg-surface border border-border-dim rounded-xl px-5 py-4 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-pulse-700/50 transition-colors"
                        value={affiliateLink}
                        onChange={(e) => setAffiliateLink(e.target.value)}
                    />
                    <p className="text-xs text-text-muted">We&apos;ll automatically add your link to all the posts below</p>

                    <motion.button
                        onClick={handleShowPosts}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="btn-primary py-4 text-base mt-2"
                    >
                        <CheckCircle2 size={20} />
                        <span>Show Me My {filteredPosts.length} Posts!</span>
                    </motion.button>
                </div>
            </section>

            {/* ====== POSTS DISPLAY ====== */}
            <AnimatePresence>
                {showPosts && (
                    <motion.section
                        id="posts-section"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col gap-5"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-medium text-text-primary">
                                {filteredPosts.length} Posts Ready — {selectedNiche}
                            </h2>
                            <span className="text-[13px] font-medium text-pulse-700 bg-pulse-100 border border-[var(--np-line-pulse)] px-3 py-1.5 rounded-full">
                                Copy → Paste → Earn
                            </span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {postsWithLink.map((post, idx) => {
                                const isCopied = copiedId === post.id;
                                const displayText = affiliateLink.trim()
                                    ? post.text
                                    : post.text.replace("{LINK}", "[YOUR LINK]");

                                return (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(idx * 0.03, 1) }}
                                        className="bg-surface border border-border-dim rounded-xl p-5 flex flex-col gap-4 hover:border-[var(--np-line-pulse)] transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-medium text-pulse-700 bg-pulse-100 px-2.5 py-1 rounded-md uppercase tracking-widest">
                                                    {post.niche}
                                                </span>
                                                <span className="text-[13px] text-text-muted">Post #{idx + 1}</span>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(post.text, post.id)}
                                                className={clsx(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all",
                                                    isCopied
                                                        ? "bg-success text-white"
                                                        : "bg-pulse-100 border border-[var(--np-line-pulse)] text-pulse-700 hover:bg-grad-pulse hover:text-black"
                                                )}
                                            >
                                                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                                <span>{isCopied ? "Copied!" : "Copy"}</span>
                                            </button>
                                        </div>

                                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                            {displayText}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </PremiumPageLayout>
    );
}
