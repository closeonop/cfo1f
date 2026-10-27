"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Asterisk,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  Wallet,
  KeyRound,
  Briefcase,
  ClipboardCheck,
  Clock,
  UserCog,
  FileClock,
  Compass,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth, useSession } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTour } from "@/tours/tour-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // undefined = everyone
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/portal", label: "Employee portal", icon: Compass },
  { href: "/attendance", label: "Time & attendance", icon: Clock },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck, roles: ["ADMIN", "HR", "MANAGER"] },
  { href: "/accounts", label: "Accounts & roles", icon: UserCog, roles: ["ADMIN", "CFO"] },
  { href: "/audit", label: "Audit log", icon: FileClock, roles: ["ADMIN", "HR"] },
  { href: "/tiers", label: "Tiers", icon: Layers, roles: ["ADMIN", "CFO", "HR"] },
  { href: "/roles", label: "Roles", icon: Briefcase, roles: ["ADMIN", "CFO", "HR"] },
  { href: "/compensation", label: "Compensation", icon: Wallet, roles: ["ADMIN", "CFO", "HR"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "CFO"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "CFO"] },
  { href: "/my-compensation", label: "My pay", icon: Wallet, roles: ["MANAGER", "EMPLOYEE"] },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();
  const items = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  const groups = [
    { label: "Your workspace", paths: ["/dashboard", "/employees", "/portal", "/attendance", "/approvals", "/my-compensation"], primary: true },
    { label: "People & finance", paths: ["/tiers", "/roles", "/compensation", "/reports"] },
    { label: "Administration", paths: ["/accounts", "/audit", "/settings"] },
  ];
  function links(paths: string[]) {
    return items.filter(item => paths.includes(item.href)).map(item => {
      const active = pathname === item.href || pathname.startsWith(item.href + "/");
      return <Link key={item.href} href={item.href} onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active
          ? "bg-sidebar-primary text-[var(--highlight-foreground)]"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
        <item.icon className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        {active && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
      </Link>;
    });
  }
  return <nav aria-label="Main" className="min-h-0 overflow-y-auto px-4 pb-4">
    {groups.map(group => {
      if (!items.some(item => group.paths.includes(item.href))) return null;
      if (group.primary) return <div key={group.label}><p className="eyebrow px-3 pb-3 pt-4 text-sidebar-foreground/60">{group.label}</p><div className="space-y-1">{links(group.paths)}</div></div>;
      return <details key={`${group.label}-${pathname}`} className="nav-group" open={group.paths.some(path => pathname === path || pathname.startsWith(path + "/"))}>
        <summary>{group.label}<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></summary>
        <div className="space-y-1">{links(group.paths)}</div>
      </details>;
    })}
  </nav>;
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-[var(--highlight-foreground)]">
        <Asterisk className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground">People &amp; Pay</span>
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange, required = false }: { open: boolean; onOpenChange: (v: boolean) => void; required?: boolean }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/auth/me/password", {
        method: "PUT",
        body: { currentPassword: current, newPassword: next },
      });
      toast.success(res.message);
      await logout();
      router.replace("/login");
      onOpenChange(false);
      setCurrent("");
      setNext("");
    } catch {
      toast.error("Could not change the password. Check your current password and the rules.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onEscapeKeyDown={(e) => { if (required) e.preventDefault(); }} onInteractOutside={(e) => { if (required) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Change your password</DialogTitle>
          <DialogDescription>{required ? "Choose your own password before using the portal. Your temporary password is your current password." : "Your other sign-ins will be signed out."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur">Current password</Label>
            <PasswordInput id="cur" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">New password</Label>
            <PasswordInput id="new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            <p className="text-xs text-muted-foreground">At least 10 characters, with a letter and a number.</p>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const tour=useTour();
  const { user, company } = useSession();
  const { logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <SidebarNav />
        <div className="mx-4 mb-5 mt-auto rounded-2xl border border-sidebar-border p-4 text-sidebar-foreground">
          <Sparkles className="mb-3 h-5 w-5 text-sidebar-primary" aria-hidden="true" />
          <p className="text-sm font-medium">A little less admin.</p><p className="mt-1 text-xs text-sidebar-foreground/65">More room for your people.</p>
          <p className="mt-4 truncate border-t border-sidebar-border pt-3 text-xs text-sidebar-foreground/65">{company.name}</p>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b bg-sidebar px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-sidebar-foreground">People &amp; Pay</span>
      </div>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh max-h-none w-64 translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-sidebar p-0 pt-2 text-sidebar-foreground">
          <DialogHeader className="sr-only"><DialogTitle>Menu</DialogTitle><DialogDescription>Navigate the employee portal.</DialogDescription></DialogHeader>
            <Brand />
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-h-dvh min-w-0 w-full flex-col lg:pl-60">
        {/* top bar */}
        <header className="sticky top-14 z-30 mt-14 flex min-h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:top-0 lg:mt-0 lg:px-8">
          <div className="mr-auto min-w-0"><p className="eyebrow text-muted-foreground">Workspace</p><p className="truncate text-xs text-muted-foreground">{company.name}</p></div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-tour="account-help-menu" aria-label="Account and help" variant="ghost" className="gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {user.email.slice(0, 2).toUpperCase()}
                </span>
                <span className="hidden text-sm sm:inline">{user.email}</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>{user.email}</div>
                <div className="text-xs font-normal text-muted-foreground">Role: {user.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!tour.available} onSelect={()=>setTimeout(tour.replay,0)}>
                <Compass /> Take the tour again
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPwOpen(true)}>
                <KeyRound /> Change password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main id="main" className="workspace-main flex-1 p-4 sm:p-6 lg:p-8">
          {user.passwordChangeRequired ? <p className="py-10 text-muted-foreground">Change your temporary password to open your portal.</p> : children}
        </main>
      </div>

      <ChangePasswordDialog open={pwOpen || !!user.passwordChangeRequired} required={user.passwordChangeRequired} onOpenChange={setPwOpen} />
    </div>
  );
}
