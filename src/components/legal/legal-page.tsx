import Image from "next/image";
import Link from "next/link";
import { LOGIN_PATH, PRIVACY_PATH, TERMS_PATH } from "@/constants/routes";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  status: string;
  body: string;
};

export function LegalPage({ eyebrow, title, status, body }: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-ink text-paper">
      <section className="mx-auto grid min-h-dvh w-full max-w-5xl content-center gap-8 px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <Link href={LOGIN_PATH} className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="Skylar" width={42} height={38} priority />
            <span className="text-lg font-semibold">Skylar</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold text-paper-3">
            <Link className="transition-colors hover:text-paper" href={TERMS_PATH}>
              Terms
            </Link>
            <span aria-hidden="true">/</span>
            <Link className="transition-colors hover:text-paper" href={PRIVACY_PATH}>
              Privacy
            </Link>
          </nav>
        </header>

        <article className="rounded-[24px] bg-ink-2 px-6 py-8 shadow-[0_20px_56px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(244,239,231,0.055)] md:px-8 md:py-10">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-sun">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-paper-2">{body}</p>
          <div className="mt-8 border-t border-paper/10 pt-6">
            <p className="font-mono text-xs uppercase text-paper-3">Current status</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-paper-2">{status}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
