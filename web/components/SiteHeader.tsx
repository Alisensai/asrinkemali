"use client";

import { useState } from "react";
import { primaryNavigation } from "@/lib/site-data";
import { Masthead } from "./Masthead";
import { Navigation } from "./Navigation";
import { SearchDialog } from "./SearchDialog";
import { UtilityBar } from "./UtilityBar";

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  return <><a className="skip" href="#icerik">İçeriğe geç</a><UtilityBar onSearch={() => setSearchOpen(true)} /><header className="site-header"><Masthead onSearch={() => setSearchOpen(true)} /><Navigation items={primaryNavigation} /></header><SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} /></>;
}
