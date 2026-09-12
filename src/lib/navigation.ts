export interface NavItem {
  href: string;
  /** German label shown in the navigation. */
  label: string;
}

/** Page URLs stay German — they are part of the user-facing content. */
export const MAIN_NAVIGATION: NavItem[] = [
  { href: "/", label: "Aktuelle Lage" },
  { href: "/ueber", label: "Über das Projekt" },
  { href: "/kurzbefehl", label: "iPhone-Kurzbefehl" },
];

export const PROJECT_NAME = "Bye Schlachthof";
