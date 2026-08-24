const html = await fetch("https://black-box-sigma-two.vercel.app/admin").then((r) => r.text());
const scripts = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((x) => x[0]);
console.log("scripts:", scripts.length);
for (const s of scripts) {
  const t = await fetch(`https://black-box-sigma-two.vercel.app${s}`).then((r) => r.text());
  const refs = [...t.matchAll(/([a-z0-9]{20})\.supabase\.co/g)].map((x) => x[1]);
  if (refs.length) {
    console.log("FOUND:", s, [...new Set(refs)]);
    break;
  }
}
