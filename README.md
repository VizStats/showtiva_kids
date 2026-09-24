# ShowTiva Kids

The kids' app in the ShowTiva family: cartoons, songs and stories for ages 2 to 12, starring six friends from Tiva Island. It is its own app, separate from the main ShowTiva site, on the same stack (Next.js 16, React 19, TypeScript, Tailwind CSS 4).

This is an early, front-end-only build. Profiles, favourites, watch progress, trail progress and the break timer live on the device, the shows are original placeholders, and the player runs stand-in footage.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## The flow

| Route | What it is |
|---|---|
| `/` | One-screen landing: the logo, the crew, and the way in |
| `/watch` | Home: featured banner, the trail card, friends, keep watching, one row per friend's world. Works without a profile; a profile narrows it to that child's age |
| `/watch/[id]` | A show: banner, who's in it, episodes by season, the player |
| `/trail` | The game: stops on a winding road through seven islands. The child's buddy guides them, the next stop unlocks when one is watched, and each island ends in a treasure chest holding a sticker |
| `/friends`, `/friends/[id]` | The crew, and each friend's world. Tap the character and it talks |
| `/profiles` | "Who's watching?" Adding a profile (buddy, name, age band) sits behind the grown-up check |
| `/parents` | Grown-ups area: profiles and age bands, break timer, reset |

Search opens **Discover** from any page: a shuffled mix of episodes, movies, minis and friends. Tapping a card plays it in place, with "Up next" beside it.

The grown-up check is a times-table question written in words. Passing it holds for five minutes.

## Content

`data/catalog.json` holds the characters, shows, episodes, curated rows and the trail. It is read on every request, so edits appear without a rebuild, and it is validated on read, so a bad edit names the broken path rather than breaking a page.

Show artwork is generated from the characters (`app/_components/ShowArt.tsx`), not stored. When real key art exists, that component is the one to replace.

## Assets

`public/characters/*.svg` and `public/brand/*.svg` were extracted from the ShowTiva Kids brand sheet, cut out as transparent vectors.
