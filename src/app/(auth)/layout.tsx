import type { Metadata } from "next";

// Public auth pages are indexable — allows search engines to find the login/signup
// entry points, which helps with brand discovery. The `title` template from the
// root layout applies here (e.g. "Sign In | MenteIQ").
export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <main id="main-content">{children}</main>
}
