"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <Features />
      <ClosingCTA />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-5">
        <Link href="/" className="text-base font-semibold leading-none sm:text-lg">
          Trizen <span className="text-primary">Photo Ops</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <Button as={Link} href={user.role === "admin" ? "/admin" : "/team"} className="text-xs sm:text-sm">
                Dashboard ({user.role === "admin" ? "Admin" : "Team"})
              </Button>
              {user.role === "admin" && (
                <Button as={Link} href="/register" variant="secondary" className="text-xs sm:text-sm">
                  + Create account
                </Button>
              )}
              <Button onClick={logout} variant="secondary" className="text-xs sm:text-sm">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} href="/login" variant="secondary" className="text-xs sm:text-sm">
                Log in
              </Button>
              <Button as={Link} href="/register" variant="primary" className="text-xs sm:text-sm">
                Sign up / Register
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  const { user } = useAuth();

  const frames = [
    { tone: "shot" }, { tone: "shot" }, { tone: "picked" }, { tone: "shot" },
    { tone: "picked" }, { tone: "shot" }, { tone: "shot" }, { tone: "picked" },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-medium text-muted-foreground">For photo &amp; video studios</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Every shoot,<br />one gallery your<br />client can trust.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Your team uploads straight from the event. You pick the keepers.
            One link and a PIN gets your client into a gallery that only
            ever shows what you&apos;ve chosen to publish.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
            {user ? (
              <Button as={Link} href={user.role === "admin" ? "/admin" : "/team"} className="px-6 py-3 text-base">
                Go to {user.role === "admin" ? "Admin" : "Team"} dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} href="/register" className="px-6 py-3 text-base">
                  Sign up / Register studio
                </Button>
                <Button as={Link} href="/login" variant="secondary" className="px-6 py-3 text-base">
                  Log in
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
          {frames.map((f, i) => (
            <div
              key={i}
              className={`relative aspect-[4/5] overflow-hidden rounded-lg border ${
                f.tone === "picked" ? "border-primary" : "border-border"
              } bg-muted`}
            >
              <span className="absolute left-1.5 top-1.5 rounded bg-foreground/60 px-1 py-0.5 text-[10px] text-background">
                {String(i + 1).padStart(3, "0")}
              </span>
              {f.tone === "picked" && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Team uploads",
      body: "Everyone you assign to an event uploads their shots straight to it — no shared drives, no sorting by hand later.",
    },
    {
      n: "02",
      title: "You select",
      body: "Review every photo in one place and mark the ones worth showing. Nothing reaches the client until you say so.",
    },
    {
      n: "03",
      title: "Client unlocks it",
      body: "Publish once and get a link plus a 6-digit PIN. Share both, and only your client can open the gallery.",
    },
  ];

  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="text-xs text-muted-foreground">{s.n}</span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: "PIN-locked galleries",
      body: "Every published gallery sits behind a 6-digit PIN, so a leaked link on its own can't be opened by anyone but the client you gave it to.",
    },
    {
      title: "Selects stay separate from uploads",
      body: "Raw uploads and your published selects are never the same list. Publishing is a deliberate choice, every time.",
    },
    {
      title: "Team access without the chaos",
      body: "Assign people to the events they're shooting. They get upload access to that event only — nothing else on your account.",
    },
    {
      title: "Republish without breaking the link",
      body: "Add more selects after publishing and the same link and PIN keep working, so you never have to re-send access to a client.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built around how a studio actually delivers</h2>
      <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="border-t border-border pt-5">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClosingCTA() {
  const { user } = useAuth();

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to run your next shoot through it?</h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Register as an admin, add your team, and your first gallery can be live before the
          event photos finish uploading.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user ? (
            <Button as={Link} href={user.role === "admin" ? "/admin" : "/team"} className="px-6 py-3 text-base">
              Go to {user.role === "admin" ? "Admin" : "Team"} dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} href="/register" className="px-6 py-3 text-base">
                Sign up / Register studio
              </Button>
              <Button as={Link} href="/login" variant="secondary" className="px-6 py-3 text-base">
                Log in
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
        <span className="text-sm font-semibold text-foreground">
          Trizen <span className="text-primary">Photo Ops</span>
        </span>
        <span>For photo &amp; video studios delivering event galleries.</span>
      </div>
    </footer>
  );
}
