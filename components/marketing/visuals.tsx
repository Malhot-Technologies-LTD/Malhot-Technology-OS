import Image from "next/image";

import { photos, type Photo } from "@/content/images";
import { cn } from "@/lib/utils";

/** Photography blocks for the website. Sources and replacement rules: content/images.ts. */

export function Picture({
  photo,
  className,
  sizes,
  priority = false,
}: {
  photo: Photo;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-bg-subtle", className)}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

/** Staggered five-photo collage, as on the reference site's About section. */
export function PhotoCollage({ className }: { className?: string }) {
  const items = [
    { photo: photos.teamTable, className: "sm:translate-y-8" },
    { photo: photos.pairing, className: "" },
    { photo: photos.planningWall, className: "sm:translate-y-12" },
    { photo: photos.meeting, className: "" },
    { photo: photos.openOffice, className: "sm:translate-y-8" },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4", className)}>
      {items.map((item, index) => (
        <Picture
          key={index}
          photo={item.photo}
          sizes="(min-width: 640px) 20vw, 50vw"
          className={cn("aspect-[4/5] rounded-2xl shadow-s", item.className, index === 4 && "hidden sm:block")}
        />
      ))}
    </div>
  );
}
