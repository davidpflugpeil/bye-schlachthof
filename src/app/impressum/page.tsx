import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung nach § 5 DDG und § 18 MStV.",
};

export default function ImprintPage() {
  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
          Impressum
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
          Angaben nach § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag (MStV).
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Anbieter">
            <address className="not-italic">
              David Pflugpeil
              <br />
              Adlzreiterstraße 23b
              <br />
              80337 München
            </address>
          </Section>

          <Section title="Kontakt">
            {/* Written out rather than linked, so address harvesters have to work for it. */}
            <p>E-Mail: david at pflugpeil dot com</p>
          </Section>

          <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
            <p>David Pflugpeil, Anschrift wie oben.</p>
          </Section>

          <Section title="Zum Angebot">
            <p>
              Bye Schlachthof ist ein ehrenamtliches Nachbarschaftsprojekt aus dem
              Schlachthofviertel. Es wird nicht kommerziell betrieben, verkauft nichts und schaltet
              keine Werbung.
            </p>
            <p>
              Die veröffentlichten Meldungen stammen von Nachbarinnen und Nachbarn und geben deren
              eigene Wahrnehmung wieder. Sie sind weder eine Messung noch ein amtliches Gutachten.
            </p>
          </Section>

          <Section title="Datenquellen">
            <p>
              Adressdaten von OpenStreetMap (ODbL), Wetterdaten von Open-Meteo. Wie mit deinen Daten
              umgegangen wird, steht im{" "}
              <a
                href="/datenschutz"
                className="font-semibold text-brand-deep underline underline-offset-4 transition-colors hover:text-brand"
              >
                Datenschutzhinweis
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-2.5 space-y-3 text-[1.0625rem] leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}
