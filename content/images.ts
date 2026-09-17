/**
 * Photography used on the website. All are Unsplash placeholders (Unsplash
 * licence, free for commercial use, no attribution required) chosen to look
 * like a working software team. Replace with Malhot's own photos before launch
 * (content/README.md). Keep `alt` descriptive of what is actually pictured.
 */
export type Photo = { src: string; alt: string; width: number; height: number };

const unsplash = (id: string, w: number, h: number): string =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

export const photos = {
  hero: {
    src: unsplash("1531482615713-2afd69097998", 1200, 1400),
    alt: "Two engineers reviewing code together on a monitor",
    width: 1200,
    height: 1400,
  },
  teamTable: {
    src: unsplash("1522071820081-009f0129c71c", 900, 700),
    alt: "A team working on laptops around a shared table",
    width: 900,
    height: 700,
  },
  planningWall: {
    src: unsplash("1552664730-d307ca884978", 900, 700),
    alt: "A planning session with sticky notes on a wall",
    width: 900,
    height: 700,
  },
  pairing: {
    src: unsplash("1551434678-e076c223a692", 900, 700),
    alt: "Two developers pairing at a desk",
    width: 900,
    height: 700,
  },
  meeting: {
    src: unsplash("1521737604893-d14cc237f11d", 900, 700),
    alt: "A small team in discussion at a table",
    width: 900,
    height: 700,
  },
  codeLaptop: {
    src: unsplash("1498050108023-c5249f4df085", 1000, 700),
    alt: "A laptop showing source code on a desk",
    width: 1000,
    height: 700,
  },
  deskOverhead: {
    src: unsplash("1519389950473-47ba0277781c", 1000, 700),
    alt: "Overhead view of a work table with laptops and notebooks",
    width: 1000,
    height: 700,
  },
  openOffice: {
    src: unsplash("1573164713988-8665fc963095", 1000, 700),
    alt: "Engineers working at desks in an open office",
    width: 1000,
    height: 700,
  },
  serverRoom: {
    src: unsplash("1556761175-b413da4baf72", 1600, 900),
    alt: "A person walking through a data centre corridor",
    width: 1600,
    height: 900,
  },
  workshop: {
    src: unsplash("1581091226825-a6a2a5aee158", 1000, 700),
    alt: "An engineer working at a workstation",
    width: 1000,
    height: 700,
  },
} as const satisfies Record<string, Photo>;
