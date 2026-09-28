# ShowTiva Kids

The kids' app in the ShowTiva family: cartoons, songs and stories for ages 2 to 12, starring six friends from Tiva Island. It is its own app, separate from the main ShowTiva site, on the same stack (Next.js 16, React 19, TypeScript, Tailwind CSS 4).

This is an early, front-end-only build. The kids' profiles, favourites, watch progress, trail progress and the break timer live on the device, the shows are original placeholders, and the player runs stand-in footage.

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
| `/profiles` | "Who's watching?" Each child picks their own picture, then Watch. With no kids yet it goes to `/profiles/new` |
| `/profiles/new` | "Add your kids": a photo from the device, a name and a birth month for each child |
| `/buddy` | "Choose your buddy": one friend big on their own colour with their name huge behind, the others small either side; arrows, swipe or arrow keys move between them. Tap the big one to make them jump; "Select" makes them this child's buddy, then a short load, a "You chose Kai!" hello and a full-screen "Meet Kai" (who they are, what they do, what they will help with) lead to "Start journey" and the trail, which they guide. They also colour the sidebar |
| `/watch` | Home: featured banner, the trail card, friends, keep watching, one row per friend's world. Works without anyone picked; once a child is watching, it only shows shows for their age |
| `/watch/[id]` | A show: banner, who's in it, episodes by season, the player |
| `/trail` | The game: stops on a winding road through seven islands. The child's buddy guides them, the next stop unlocks when one is watched, and each island ends in a treasure chest holding a sticker |
| `/friends`, `/friends/[id]` | The crew, and each friend's world. Tap the character and it talks |
| `/parents` | Grown-ups area: the kids and their levels, break timer, reset |

Inside the app, wide screens get a sidebar (the pages, every friend's world, the child watching and their buddy) and a search bar; narrower ones a top bar, and phones a bottom tab bar. Pages load behind the ShowTiva Kids logo.

Search opens **Discover** from any page: a shuffled mix of episodes, movies, minis and friends. Tapping a card plays it in place, with "Up next" beside it.

Each child has their own id: their own shows by age, favourites, trail progress and buddy. The grown-ups area is open for now; it gets a lock when there are accounts.

## Content

`data/catalog.json` holds the characters, shows, episodes, curated rows and the trail. It is read on every request, so edits appear without a rebuild, and it is validated on read, so a bad edit names the broken path rather than breaking a page.

Show artwork is generated from the characters (`app/_components/ShowArt.tsx`), not stored. When real key art exists, that component is the one to replace.

## Assets

`public/characters/*.svg` and `public/brand/*.svg` were extracted from the ShowTiva Kids brand sheet, cut out as transparent vectors.
