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
| `/buddy` | "Choose your buddy": one friend big on their own colour with their name huge behind, the others small either side; arrows, swipe or arrow keys move between them. Tap the big one to make them jump; "Select" makes them this child's buddy, then, after a short load, they perform: they bound in and introduce themselves out loud, one line at a time with a move for each (a different voice per friend, with sound on/off, again and skip), and "Start journey" goes onto the trail, which they guide |
| `/trail` | Home, and the game: stops on a winding road through seven islands, only shows for the child's age. Their buddy hosts the first island and guides them all the way; the next stop unlocks when one is watched, each island ends in a treasure chest holding a sticker, and a heart on each stop saves it to their favourites. The islands melt into one another rather than meeting at an edge, and the map is always gently moving: rippling water, surf washing the sand, lapping shorelines, swaying trees, rocking boats, ringing ponds and clouds drifting over it all |
| `/watch/[id]` | A show, opened from favourites: banner, who's in it, episodes by season, the player |
| `/parents` | Grown-ups area: the kids and their levels, break timer, reset |

Inside the app there is no bar and no menu, just buttons floating over the top corners: Favourites on the left, and on the right the child watching (switch kids, "Who's watching?", Grown-ups) and their buddy (swap to another friend on the spot, or meet them all on the stage). The old `/watch` and `/friends` addresses redirect to the trail. Pages load behind the ShowTiva Kids logo.

Each child has their own id: their own shows by age, favourites, trail progress and buddy. The grown-ups area is open for now; it gets a lock when there are accounts.

## Content

`data/catalog.json` holds the characters (including each one's spoken introduction and voice), shows, episodes, curated rows and the trail. It is read on every request, so edits appear without a rebuild, and it is validated on read, so a bad edit names the broken path rather than breaking a page.

Show artwork is generated from the characters (`app/_components/ShowArt.tsx`), not stored. When real key art exists, that component is the one to replace.

## Assets

`public/characters/*.svg` and `public/brand/*.svg` were extracted from the ShowTiva Kids brand sheet, cut out as transparent vectors.
