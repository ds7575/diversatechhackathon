"use client";

import { AirmailStripe } from "@/components/ui/AirmailStripe";
import { BoardingPassCard } from "@/components/ui/BoardingPassCard";
import { FlightPath } from "@/components/ui/FlightPath";
import { LuggageTag } from "@/components/ui/LuggageTag";
import { PassportStamp } from "@/components/ui/PassportStamp";
import { PlaneLoader } from "@/components/ui/PlaneLoader";

const place = {
  name: "Time Out Market Lisboa",
  summary: "Food hall with stalls from a range of local chefs.",
  location: "Cais do Sodré",
  cost: "EUR 20 pp",
  caveats: ["Busy at peak meal times"],
  label: "strong" as const,
  reason: "Matches food interest; mid budget; short walk from base area.",
  contributors: ["Maya", "Dev"],
  reelUrl: "https://instagram.com/reel/example",
  counts: { interested: 2, price: 1 },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="label-mono mb-3 text-xs font-bold text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pb-16 pt-8">
      <h1 className="font-heading text-[44px] font-extrabold leading-none tracking-tight">Lisbon</h1>
      <p className="label-mono mt-2 text-xs">Depart 12 Jun · Return 15 Jun</p>
      <AirmailStripe height={10} className="mt-4" />

      <Section title="AirmailStripe">
        <AirmailStripe height={12} />
      </Section>

      <Section title="PassportStamp">
        <div className="flex flex-wrap gap-4 p-2">
          <PassportStamp label="strong" />
          <PassportStamp label="discuss" />
          <PassportStamp label="needs_info" />
        </div>
      </Section>

      <Section title="LuggageTag">
        <div className="flex flex-wrap items-start gap-4">
          <LuggageTag kind="price" count={1} note="a bit steep for me" />
          <LuggageTag kind="effort" count={2} note="lots of hills?" />
          <LuggageTag kind="distance" />
        </div>
      </Section>

      <Section title="BoardingPassCard">
        <div className="flex flex-col gap-4">
          <BoardingPassCard {...place} mine="interested" onReact={() => {}} />
          <BoardingPassCard
            {...place}
            name="Miradouro da Senhora do Monte and the Whole Alfama Viewpoint Walking Circuit"
            cost="Cost unknown"
            label="needs_info"
            reason="Cost and hours not found."
            caveats={["Steep climb", "No hours found"]}
            contributors={["Sam"]}
            counts={{ effort: 1 }}
            onReact={() => {}}
          />
        </div>
      </Section>

      <Section title="FlightPath">
        <FlightPath day={1} leg="A" explanation="Waterfront and food, all within walking range.">
          <div className="border-2 border-ink bg-card p-3 text-sm">Time Out Market Lisboa</div>
          <div className="border-2 border-ink bg-card p-3 text-sm">Pastéis de Belém</div>
        </FlightPath>
      </Section>

      <Section title="PlaneLoader">
        <div className="flex flex-col items-start gap-2">
          <PlaneLoader status="processing" />
          <PlaneLoader status="ready" />
          <PlaneLoader status="failed" onRetry={() => {}} />
        </div>
      </Section>
    </main>
  );
}
