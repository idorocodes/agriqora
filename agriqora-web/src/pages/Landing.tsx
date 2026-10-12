import { ArrowRight, BarChart3, Leaf, ShieldCheck, ShoppingBag, Sprout, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';

export default function LandingPage() {
  useTitle('AgriQora | Trusted produce marketplace');

  const valueProps = [
    {
      icon: Sprout,
      title: 'Built for farmers',
      text: 'Farmers can list produce, manage their inventory, and respond to buyers with clarity and confidence.',
    },
    {
      icon: ShoppingBag,
      title: 'Built for buyers',
      text: 'Buyers can discover dependable produce, compare listings, and request products from trusted sources.',
    },
    {
      icon: ShieldCheck,
      title: 'Built on trust',
      text: 'Important product records can be verified through a public blockchain-backed trail, reducing fraud and confusion.',
    },
  ];

  const audience = [
    {
      title: 'Farmers',
      text: 'Sell what you grow, keep your records, and reach more buyers on a trusted marketplace.',
    },
    {
      title: 'Buyers',
      text: 'Find fresh produce, check traceability, and buy with more confidence and less uncertainty.',
    },
    {
      title: 'Admins',
      text: 'Monitor activity, verify listings, and maintain healthy marketplace trust and quality control.',
    },
  ];

  return (
    <div className="bg-cream text-ink">
      <section className="wrap py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center rounded-full border border-forest/20 bg-forest-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-forest">
              Fresh food. Clear trust.
            </span>
            <h1 className="mt-5 max-w-xl font-display text-4xl leading-[1.02] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              A better way to connect farmers, buyers, and trusted produce.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              AgriQora helps communities buy and sell fresh produce with more visibility, traceability, and trust across the farm-to-market journey.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/marketplace" className="btn btn-primary">
                Explore marketplace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link to="/join" className="btn btn-outline">
                Join AgriQora
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted">
              <div>
                <p className="font-display text-2xl text-forest">1.2k+</p>
                <p>market listings</p>
              </div>
              <div>
                <p className="font-display text-2xl text-forest">3</p>
                <p>core user roles</p>
              </div>
              <div>
                <p className="font-display text-2xl text-forest">100%</p>
                <p>trust focused</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden border border-line bg-card p-5 shadow-[0_12px_30px_rgba(13,74,25,0.08)]">
            <div className="rounded-xl border border-line bg-sand p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
                    <Leaf className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Marketplace snapshot</p>
                    <p className="text-xs text-muted">Fresh produce, verified records</p>
                  </div>
                </div>
                <span className="rounded-full bg-forest-soft px-2.5 py-1 text-xs font-semibold text-forest">
                  Trusted
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">Fresh yam tubers</p>
                      <p className="text-sm text-muted">Maje Farms • Suleja</p>
                    </div>
                    <span className="rounded-full bg-forest-soft px-2 py-1 text-xs font-semibold text-forest">Verified</span>
                  </div>
                  <div className="mt-3 flex justify-between text-sm text-muted">
                    <span>₦18,000</span>
                    <span>120 bags</span>
                  </div>
                </div>

                <div className="rounded-lg border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">Maize harvest</p>
                      <p className="text-sm text-muted">Keffi Valley • Nasarawa</p>
                    </div>
                    <span className="rounded-full bg-pill px-2 py-1 text-xs font-semibold text-ink">Traceable</span>
                  </div>
                  <div className="mt-3 flex justify-between text-sm text-muted">
                    <span>₦12,500</span>
                    <span>80 sacks</span>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-forest/30 bg-forest-soft p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-forest" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-forest">Batch verification</p>
                      <p className="text-xs text-forest/80">Record anchored with cryptographic evidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sand py-16">
        <div className="wrap">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-forest">Why it matters</p>
            <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
              A marketplace should do more than list products.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {valueProps.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card bg-card p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest-soft text-forest">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-forest">Built for real agricultural trust</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            From farm record to buyer confidence.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="card bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest-soft text-forest">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-ink">Who it helps</h3>
            <p className="mt-3 text-[15px] leading-7 text-muted">
              AgriQora connects farmers, buyers, and administrators in one clear workflow for sourcing and trust.
            </p>
          </div>

          <div className="card bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest-soft text-forest">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-ink">What it proves</h3>
            <p className="mt-3 text-[15px] leading-7 text-muted">
              The platform records produce details and can confirm whether those records match an on-chain commitment.
            </p>
          </div>

          <div className="card bg-card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-forest-soft text-forest">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-ink">Why it matters</h3>
            <p className="mt-3 text-[15px] leading-7 text-muted">
              Buyers gain clarity. Farmers gain visibility. Communities gain a more reliable path from farm to market.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-forest py-16 text-white">
        <div className="wrap">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-footer-text">Transparent supply</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                A product record can be checked, not just trusted.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-footer-text">
                This is where Solana comes in: it helps create an extra layer of proof so important produce records are harder to silently change or fake.
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm text-footer-text">Typical flow</p>
              <ol className="mt-4 space-y-4 text-sm text-white">
                <li>1. Farmer lists a produce batch.</li>
                <li>2. Product details are stored securely in the platform.</li>
                <li>3. A verifiable proof is anchored to a public blockchain.</li>
                <li>4. Buyers can review the record and see whether it is trusted.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-forest">Who is this for?</p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            One platform for the whole agricultural journey.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {audience.map((person) => (
            <div key={person.title} className="card bg-card p-6">
              <h3 className="text-xl font-semibold text-ink">{person.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-muted">{person.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand py-16">
        <div className="wrap text-center">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">Ready to explore AgriQora?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-muted">
            Join the platform, browse the marketplace, or see how produce traceability works in practice.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/marketplace" className="btn btn-primary">
              Browse produce
            </Link>
            <Link to="/join" className="btn btn-outline">
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
