"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { SearchAssistForm } from "@/components/search-assist-form";
import { isStockFirstHeaderGroupEnabled } from "@/lib/public-launch-scope";
import type { HeaderMenuGroupKey, ManagedNavLink, ManagedTickerItem } from "@/lib/site-experience";

type SiteHeaderNavClientProps = {
  brand: {
    mark: string;
    logoUrl: string;
    logoWidthPx: number;
    label: string;
    href: string;
  };
  tickerItems: ManagedTickerItem[];
  marketNav: ManagedNavLink[];
  utilityNav: ManagedNavLink[];
  visibleMenuGroups: HeaderMenuGroupKey[];
  accountLabel?: string | null;
  isSignedIn: boolean;
};

type HeaderGroupItem = {
  label: string;
  href: string;
  dividerAfter?: boolean;
};

type HeaderGroup = {
  key: string;
  label: string;
  items: HeaderGroupItem[];
};

type ContentTheme = "dark" | "light";

function applyContentTheme(theme: ContentTheme) {
  document.documentElement.dataset.riddraContentTheme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("riddra-site-content-theme", theme);
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function uniqueItems(items: HeaderGroupItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.href}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function resolveNavItem(
  links: ManagedNavLink[],
  options: { label: string; href: string; aliases?: string[]; dividerAfter?: boolean },
): HeaderGroupItem {
  const aliasKeys = [options.label, ...(options.aliases ?? [])].map(normalizeLabel);
  const matched =
    links.find((link) => aliasKeys.includes(normalizeLabel(link.label))) ??
    links.find((link) => link.href === options.href);

  return {
    label: options.label,
    href: matched?.href ?? options.href,
    dividerAfter: options.dividerAfter,
  };
}

function buildHeaderGroups(
  marketNav: ManagedNavLink[],
  utilityNav: ManagedNavLink[],
  visibleMenuGroups: HeaderMenuGroupKey[],
): HeaderGroup[] {
  const links = [...marketNav, ...utilityNav];
  const allowedGroups = new Set<HeaderMenuGroupKey>(visibleMenuGroups);

  return [
    {
      key: "markets",
      label: "Markets",
      items: uniqueItems([
        resolveNavItem(links, {
          label: "Markets overview",
          href: "/markets",
          aliases: ["Markets"],
          dividerAfter: true,
        }),
        resolveNavItem(links, { label: "Sensex", href: "/sensex" }),
        resolveNavItem(links, { label: "Nifty 50", href: "/nifty50", aliases: ["Nifty50"] }),
        resolveNavItem(links, { label: "Bank Nifty", href: "/banknifty", aliases: ["BankNifty"] }),
        resolveNavItem(links, { label: "Fin Nifty", href: "/finnifty", aliases: ["FinNifty"] }),
        resolveNavItem(links, { label: "Gift Nifty", href: "/markets", aliases: ["GiftNifty"] }),
      ]),
    },
    {
      key: "stocks",
      label: "Stocks",
      items: uniqueItems([
        resolveNavItem(links, { label: "Indian Stocks", href: "/stocks" }),
        resolveNavItem(links, { label: "Screener", href: "/screener" }),
        resolveNavItem(links, { label: "Charts", href: "/charts" }),
      ]),
    },
    {
      key: "funds",
      label: "Funds",
      items: uniqueItems([resolveNavItem(links, { label: "Mutual Funds", href: "/mutual-funds" })]),
    },
    {
      key: "tools",
      label: "Tools",
      items: uniqueItems([resolveNavItem(links, { label: "Calculators", href: "/tools" })]),
    },
    {
      key: "learn",
      label: "Learn",
      items: uniqueItems([
        resolveNavItem(links, { label: "Learn", href: "/learn" }),
        resolveNavItem(links, { label: "Courses", href: "/courses" }),
        resolveNavItem(links, { label: "Newsletter", href: "/newsletter" }),
      ]),
    },
  ].filter((group) =>
    allowedGroups.has(group.key as HeaderMenuGroupKey) &&
    isStockFirstHeaderGroupEnabled(group.key as HeaderMenuGroupKey),
  );
}

function isHrefActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Chevron({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m3 4.5 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3.5 5.5h13" strokeLinecap="round" />
      <path d="M3.5 10h13" strokeLinecap="round" />
      <path d="M3.5 14.5h13" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="m5 5 10 10" strokeLinecap="round" />
      <path d="M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="8.5" cy="8.5" r="5.25" />
      <path d="M12.5 12.5 16.25 16.25" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13.7 14.4A6.4 6.4 0 0 1 7.3 4.2a6.6 6.6 0 1 0 6.4 10.2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="3.25" />
      <path d="M10 2.5v2.2M10 15.3v2.2M17.5 10h-2.2M4.7 10H2.5M15.3 4.7l-1.6 1.6M6.3 13.7l-1.6 1.6M15.3 15.3l-1.6-1.6M6.3 6.3 4.7 4.7" strokeLinecap="round" />
    </svg>
  );
}

function getAccountInitial(label?: string | null) {
  const trimmed = label?.trim();

  if (!trimmed) {
    return "A";
  }

  return trimmed.charAt(0).toUpperCase();
}

export function SiteHeaderNavClient({
  brand,
  tickerItems,
  marketNav,
  utilityNav,
  visibleMenuGroups,
  accountLabel,
  isSignedIn,
}: SiteHeaderNavClientProps) {
  const pathname = usePathname();
  const navGroups = useMemo(
    () => buildHeaderGroups(marketNav, utilityNav, visibleMenuGroups),
    [marketNav, utilityNav, visibleMenuGroups],
  );
  const [contentTheme, setContentTheme] = useState<ContentTheme>("light");
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    markets: true,
    stocks: true,
    funds: true,
    tools: true,
    learn: true,
  });
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("riddra-site-content-theme");
    const nextTheme: ContentTheme = savedTheme === "dark" ? "dark" : "light";
    setContentTheme(nextTheme);
  }, []);

  useEffect(() => {
    applyContentTheme(contentTheme);
  }, [contentTheme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: ContentTheme }>).detail?.theme;
      if (theme === "dark" || theme === "light") {
        setContentTheme(theme);
      }
    };

    window.addEventListener("riddra-content-theme-change", handleThemeChange as EventListener);
    return () => {
      window.removeEventListener("riddra-content-theme-change", handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    setOpenDesktopGroup(null);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (accountMenuRef.current?.contains(target)) {
        return;
      }

      setAccountMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const isDark = true;
  const accountName = accountLabel?.trim() || (isSignedIn ? "Account" : "Sign in");
  const brandMark = brand.mark.trim().slice(0, 2) || "R";
  const brandLogoUrl = brand.logoUrl.trim();
  const brandLogoWidthPx = Number.isFinite(brand.logoWidthPx) ? brand.logoWidthPx : 28;
  const brandLabel = brand.label.trim() || "Riddra";
  const brandHref = brand.href.trim() || "/";
  const signedOutAccountLinks = [
    { label: "Sign in", href: "/login" },
    { label: "Sign up", href: "/signup" },
    { label: "View plans", href: "/pricing" },
  ];
  const renderTickerItems = (suffix: string, ariaHidden = false) =>
    tickerItems.map((item) => {
      const positive = item.change?.startsWith("+");
      const negative = item.change?.startsWith("-");

      return (
        <Link
          key={`${item.label}-${suffix}`}
          href={item.href}
          aria-hidden={ariaHidden || undefined}
          tabIndex={ariaHidden ? -1 : undefined}
          className={`inline-flex items-center gap-2 transition ${isDark ? "hover:text-white" : "hover:text-[#111827]"}`}
        >
          <span
            className={`uppercase tracking-[0.12em] ${
              isDark ? "text-[rgba(255,255,255,0.56)]" : "text-[rgba(15,23,42,0.48)]"
            }`}
          >
            {item.label}
          </span>
          <span className={isDark ? "text-[rgba(255,255,255,0.9)]" : "text-[#111827]"}>{item.value}</span>
          {item.change ? (
            <span
              className={
                positive
                  ? "text-[#4ADE80]"
                  : negative
                    ? "text-[#F87171]"
                    : isDark
                      ? "text-[rgba(255,255,255,0.6)]"
                      : "text-[rgba(15,23,42,0.56)]"
              }
            >
              {item.change}
            </span>
          ) : null}
        </Link>
      );
    });

  function scheduleOpen(groupKey: string) {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }
    setAccountMenuOpen(false);

    openTimerRef.current = window.setTimeout(() => {
      setOpenDesktopGroup(groupKey);
    }, 80);
  }

  function scheduleClose() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setOpenDesktopGroup(null);
    }, 120);
  }

  function toggleTheme() {
    const nextTheme: ContentTheme = contentTheme === "dark" ? "light" : "dark";
    setContentTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("riddra-content-theme-change", { detail: { theme: nextTheme } }));
  }

  function toggleMobileGroup(groupKey: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  const shellClasses = isDark
    ? {
        bar: "border-b border-[rgba(255,255,255,0.07)] bg-[#141414] text-white shadow-[0_4px_10px_rgba(0,0,0,0.14)]",
        ticker: "border-t border-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.08)] bg-[linear-gradient(90deg,#090909_0%,#0E1420_100%)] text-[rgba(255,255,255,0.74)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        navItem: "text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white",
        navItemActive: "bg-[rgba(255,255,255,0.07)] text-white",
        dropdown: "border border-[rgba(255,255,255,0.1)] bg-[#1c1c1c] text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
        dropdownItem: "text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.07)] hover:text-white",
        toggleButton: "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.12)]",
        accountButton: "border border-[rgba(255,255,255,0.15)] bg-transparent text-white hover:bg-[rgba(255,255,255,0.08)]",
        drawer: "border-r border-[rgba(255,255,255,0.08)] bg-[#141414] text-white shadow-[22px_0_60px_rgba(0,0,0,0.42)]",
        drawerSection: "border-[rgba(255,255,255,0.08)]",
        logoBox: "bg-[#2a2a2a] text-white",
      }
    : {
        bar: "border-b border-[rgba(15,23,42,0.08)] bg-white text-[#111827] shadow-[0_4px_10px_rgba(15,23,42,0.05)]",
        ticker: "border-t border-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.08)] bg-[linear-gradient(90deg,#090909_0%,#0E1420_100%)] text-[rgba(255,255,255,0.74)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        navItem: "text-[rgba(15,23,42,0.72)] hover:bg-[rgba(15,23,42,0.06)] hover:text-[#111827]",
        navItemActive: "bg-[rgba(15,23,42,0.06)] text-[#111827]",
        dropdown: "border border-[rgba(15,23,42,0.08)] bg-white text-[#111827] shadow-[0_16px_40px_rgba(15,23,42,0.12)]",
        dropdownItem: "text-[rgba(15,23,42,0.7)] hover:bg-[rgba(15,23,42,0.05)] hover:text-[#111827]",
        toggleButton: "border border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.04)] text-[#111827] hover:bg-[rgba(15,23,42,0.08)]",
        accountButton: "border border-[rgba(15,23,42,0.14)] bg-transparent text-[#111827] hover:bg-[rgba(15,23,42,0.06)]",
        drawer: "border-r border-[rgba(15,23,42,0.08)] bg-white text-[#111827] shadow-[22px_0_60px_rgba(15,23,42,0.14)]",
        drawerSection: "border-[rgba(15,23,42,0.08)]",
        logoBox: "bg-[#e5e7eb] text-[#111827]",
      };

  return (
    <header className="fixed inset-x-0 top-0 z-[60]">
      <div className={`relative z-[70] ${shellClasses.bar}`}>
        <div className="mx-auto flex h-[56px] w-full max-w-[1220px] items-center gap-3 px-4 sm:px-4 lg:px-3 xl:px-4">
          <Link href={brandHref} className="flex shrink-0 items-center gap-2.5">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={brandLabel}
                className="block h-auto shrink-0 object-contain"
                style={{ width: `${brandLogoWidthPx}px` }}
              />
            ) : (
              <div className={`grid h-7 w-7 place-items-center rounded-[6px] text-[12px] font-bold ${shellClasses.logoBox}`}>{brandMark}</div>
            )}
            <span className="text-[20px] font-semibold tracking-[-0.03em]">{brandLabel}</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
            <div className="ml-4 flex min-w-0 items-center gap-1">
              {navGroups.map((group) => {
                const groupActive = group.items.some((item) => isHrefActive(pathname, item.href));
                const groupOpen = openDesktopGroup === group.key;

                return (
                  <div
                    key={group.key}
                    className="relative"
                    onMouseEnter={() => scheduleOpen(group.key)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      onFocus={() => setOpenDesktopGroup(group.key)}
                      onClick={() => setOpenDesktopGroup((current) => (current === group.key ? null : group.key))}
                      className={`inline-flex items-center rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition ${groupActive ? shellClasses.navItemActive : shellClasses.navItem}`}
                    >
                      <span className={groupActive ? "font-semibold" : ""}>{group.label}</span>
                      <Chevron className="ml-1 h-2.5 w-2.5" />
                    </button>

                    <div
                      className={`absolute left-0 top-[calc(100%+10px)] z-[85] min-w-[220px] rounded-[10px] p-2 transition duration-150 ${shellClasses.dropdown} ${
                        groupOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                      }`}
                    >
                      {group.items.map((item) => {
                        const itemActive = isHrefActive(pathname, item.href);

                        return (
                          <div key={`${group.key}-${item.label}-${item.href}`}>
                            <Link
                              href={item.href}
                              className={`flex items-center rounded-[6px] px-3 py-2 text-[13px] transition ${shellClasses.dropdownItem} ${
                                itemActive ? "border-l-2 border-[#D4853B] bg-[rgba(255,255,255,0.06)] pl-[10px] font-semibold text-white" : ""
                              } ${!isDark && itemActive ? "bg-[rgba(15,23,42,0.04)] text-[#111827]" : ""}`}
                              onClick={() => {
                                setOpenDesktopGroup(null);
                                setAccountMenuOpen(false);
                              }}
                            >
                              {item.label}
                            </Link>
                            {item.dividerAfter ? (
                              <div
                                className={`my-1.5 border-t ${isDark ? "border-[rgba(255,255,255,0.07)]" : "border-[rgba(15,23,42,0.08)]"}`}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={contentTheme === "dark" ? "Switch to light content" : "Switch to dark content"}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] transition ${shellClasses.toggleButton}`}
            >
              {contentTheme === "dark" ? <MoonIcon /> : <SunIcon />}
            </button>

            <div className="w-[200px] transition-[width] duration-200 ease-out focus-within:w-[260px]">
              <SearchAssistForm compact chromeTheme="dark" placeholder="Search stocks, indices..." />
            </div>

            {isSignedIn ? (
              <Link
                href="/account"
                className={`inline-flex h-8 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium transition ${shellClasses.accountButton}`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${isDark ? "bg-[rgba(255,255,255,0.14)] text-white" : "bg-[rgba(15,23,42,0.08)] text-[#111827]"}`}>
                  {getAccountInitial(accountName)}
                </span>
                <span className="max-w-[140px] truncate">{accountName}</span>
                <Chevron />
              </Link>
            ) : (
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDesktopGroup(null);
                    setAccountMenuOpen((current) => !current);
                  }}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className={`inline-flex h-8 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium transition ${shellClasses.accountButton}`}
                >
                  <span className="max-w-[140px] truncate">{accountName}</span>
                  <Chevron />
                </button>

                <div
                  className={`absolute right-0 top-[calc(100%+10px)] z-[85] min-w-[180px] rounded-[10px] p-2 transition duration-150 ${shellClasses.dropdown} ${
                    accountMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                  }`}
                >
                  {signedOutAccountLinks.map((item) => {
                    const itemActive = isHrefActive(pathname, item.href);
                    return (
                      <Link
                        key={`signed-out-account-${item.href}`}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-center rounded-[6px] px-3 py-2 text-[13px] transition ${shellClasses.dropdownItem} ${
                          itemActive ? "border-l-2 border-[#D4853B] bg-[rgba(255,255,255,0.06)] pl-[10px] font-semibold text-white" : ""
                        } ${!isDark && itemActive ? "bg-[rgba(15,23,42,0.04)] text-[#111827]" : ""}`}
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((current) => !current)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] transition ${shellClasses.toggleButton}`}
              aria-label="Open search"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] transition ${shellClasses.toggleButton}`}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className={`border-t px-4 py-3 md:hidden ${isDark ? "border-[rgba(255,255,255,0.08)] bg-[#141414]" : "border-[rgba(15,23,42,0.08)] bg-white"}`}>
            <div className="mx-auto max-w-[1220px]">
              <SearchAssistForm compact chromeTheme="dark" placeholder="Search stocks, indices..." />
            </div>
          </div>
        ) : null}
      </div>

      <div className={`relative z-[60] -mt-[2px] ${shellClasses.ticker}`}>
        <div className="mx-auto w-full max-w-[1220px] px-4 sm:px-4 lg:px-3 xl:px-4">
          <div className="riddra-site-ticker-viewport flex h-[24px] items-center font-[family:var(--font-riddra-mono)] text-[10px]">
            <div className="riddra-site-ticker-manual flex min-w-max items-center gap-4 whitespace-nowrap px-0">
              {renderTickerItems("primary")}
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[69] bg-[rgba(0,0,0,0.45)]"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={`fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,360px)] flex-col px-4 py-4 ${shellClasses.drawer}`}>
            <div className="flex items-center justify-between">
              <Link href={brandHref} className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                {brandLogoUrl ? (
                  <img
                    src={brandLogoUrl}
                    alt={brandLabel}
                    className="block h-auto shrink-0 object-contain"
                    style={{ width: `${brandLogoWidthPx}px` }}
                  />
                ) : (
                  <div className={`grid h-7 w-7 place-items-center rounded-[6px] text-[12px] font-bold ${shellClasses.logoBox}`}>{brandMark}</div>
                )}
                <span className="text-[20px] font-semibold tracking-[-0.03em]">{brandLabel}</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] transition ${shellClasses.toggleButton}`}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className={`mt-5 rounded-[12px] border px-3.5 py-3 ${shellClasses.drawerSection}`}>
              <p className={`text-[11px] uppercase tracking-[0.16em] ${isDark ? "text-[rgba(255,255,255,0.52)]" : "text-[rgba(15,23,42,0.48)]"}`}>
                {isSignedIn ? "Account" : "Welcome"}
              </p>
              <Link
                href={isSignedIn ? "/account" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center gap-3"
              >
                {isSignedIn ? (
                  <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${isDark ? "bg-[rgba(255,255,255,0.14)] text-white" : "bg-[rgba(15,23,42,0.08)] text-[#111827]"}`}>
                    {getAccountInitial(accountName)}
                  </span>
                ) : null}
                <span className="text-sm font-medium">{accountName}</span>
              </Link>
              {!isSignedIn ? (
                <div className="mt-3 grid gap-2">
                  {signedOutAccountLinks.map((item) => (
                    <Link
                      key={`mobile-signed-out-account-${item.href}`}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`inline-flex items-center justify-center rounded-[8px] px-3 py-2 text-[13px] font-medium transition ${shellClasses.toggleButton}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-2 overflow-y-auto pr-1">
              {navGroups.map((group) => {
                const groupActive = group.items.some((item) => isHrefActive(pathname, item.href));
                const expanded = expandedGroups[group.key];

                return (
                  <div key={group.key} className={`rounded-[12px] border ${shellClasses.drawerSection}`}>
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.key)}
                      className={`flex w-full items-center justify-between px-3.5 py-3 text-left text-[14px] font-medium ${
                        groupActive ? (isDark ? "text-white" : "text-[#111827]") : isDark ? "text-[rgba(255,255,255,0.78)]" : "text-[rgba(15,23,42,0.76)]"
                      }`}
                    >
                      <span>{group.label}</span>
                      <Chevron className={`h-3 w-3 transition ${expanded ? "rotate-180" : ""}`} />
                    </button>
                    {expanded ? (
                      <div className={`border-t px-2.5 py-2 ${shellClasses.drawerSection}`}>
                        {group.items.map((item) => {
                          const active = isHrefActive(pathname, item.href);
                          return (
                            <Link
                              key={`${group.key}-${item.label}-${item.href}-mobile`}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center rounded-[8px] px-3 py-2 text-[13px] transition ${
                                active
                                  ? isDark
                                    ? "border-l-2 border-[#D4853B] bg-[rgba(255,255,255,0.06)] pl-[10px] font-semibold text-white"
                                    : "border-l-2 border-[#D4853B] bg-[rgba(15,23,42,0.05)] pl-[10px] font-semibold text-[#111827]"
                                  : isDark
                                    ? "text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                                    : "text-[rgba(15,23,42,0.72)] hover:bg-[rgba(15,23,42,0.05)] hover:text-[#111827]"
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className={`mt-auto border-t pt-4 ${shellClasses.drawerSection}`}>
              <button
                type="button"
                onClick={toggleTheme}
                className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-medium transition ${shellClasses.toggleButton}`}
              >
                {contentTheme === "dark" ? <MoonIcon /> : <SunIcon />}
                <span>{contentTheme === "dark" ? "Night content" : "Light content"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
