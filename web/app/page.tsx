import { Archive } from "@/components/Archive";
import { Chronology } from "@/components/Chronology";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Masthead } from "@/components/Masthead";
import { Navigation } from "@/components/Navigation";
import { Publications } from "@/components/Publications";
import { SearchDialog } from "@/components/SearchDialog";
import { ShortcutGrid } from "@/components/ShortcutGrid";
import { UtilityBar } from "@/components/UtilityBar";
import { chronology, heroSlides, primaryNavigation, publications, shortcuts } from "@/lib/site-data";

export default function HomePage() {
  return <main><UtilityBar dateLabel="23 Ekim" quote="Kaynak doğrulaması önceliğimizdir." /><Masthead title="ASRIN KEMALİ" motto="Bir asrın mirası, sonsuzluğun hafızası" /><Navigation items={primaryNavigation} /><SearchDialog /><Hero slide={heroSlides[0]} /><ShortcutGrid items={shortcuts} /><Publications items={publications} /><Chronology entries={chronology} /><Archive records={[]} /><Footer /></main>;
}
