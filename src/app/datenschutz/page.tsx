import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Welche Daten gespeichert werden, wie lange sie bleiben und wer Zugriff hat.",
};

export default function PrivacyPage() {
  return (
    <div className="page-shell py-6 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.022em] text-ink sm:text-[2.25rem]">
          Datenschutz
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
          Dieses Projekt sammelt so wenige Daten wie möglich. Es gibt keine Benutzerkonten, keine
          Anmeldung und keine Werbe- oder Analysedienste von Dritten.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Welche Daten erhoben werden">
            <p>Mit jeder Meldung werden gespeichert:</p>
            <ul className="mt-2 space-y-2">
              <li>Zeitpunkt der Meldung</li>
              <li>Gemeldete Stärke (1 bis 5)</li>
              <li>Koordinaten des angegebenen Ortes – nur intern, nicht öffentlich</li>
              <li>Straße, Stadtteil, Postleitzahl und Ort</li>
              <li>
                Die Hausnummer des angegebenen Ortes – nur intern, nicht öffentlich
              </li>
              <li>Automatisch ergänzte Wetter- und Winddaten zu diesem Ort</li>
              <li>Freiwillige Angaben: Geruchsart, Dauer, Kommentar</li>
              <li>
                Ein nicht umkehrbarer Prüfwert aus der IP-Adresse, ausschließlich zum Schutz vor
                Missbrauch. Die IP-Adresse selbst wird nicht gespeichert.
              </li>
            </ul>
          </Section>

          <Section title="Was öffentlich sichtbar ist">
            <p>
              Öffentlich sichtbar sind Zeitpunkt, Stärke, die Straße, der Stadtteil und die
              Wetterangaben. Die Hausnummer wird gespeichert, aber nie veröffentlicht: Sie ist
              ausschließlich im internen Verwaltungsbereich und im dortigen Export sichtbar, ebenso
              wie die genauen Koordinaten.
            </p>
          </Section>

          <Section title="Angaben auf deinem Gerät">
            <p>
              Wenn du dich für „Adresse auf diesem Gerät merken“ entscheidest, wird diese Angabe
              ausschließlich lokal in deinem Browser gespeichert und nicht an den Server übertragen.
              Du kannst sie jederzeit im Meldeformular wieder entfernen.
            </p>
          </Section>

          <Section title="Externe Dienste">
            <p>
              Für Wetter- und Winddaten wird Open-Meteo abgefragt, für die Zuordnung von Adressen
              und Straßennamen OpenStreetMap (Nominatim). Dabei werden die jeweiligen Koordinaten
              beziehungsweise der Suchbegriff übermittelt.
            </p>
          </Section>

          <Section title="Speicherdauer und Löschung">
            <p>
              Die Meldungen werden dauerhaft gespeichert, da die Auswertung über längere Zeiträume
              der Zweck des Projekts ist. Wenn du möchtest, dass eine bestimmte Meldung gelöscht
              wird, melde dich bei den Betreibenden des Projekts.
            </p>
          </Section>

          <Section title="Verantwortlich">
            <p>
              Verantwortlich im Sinne der Datenschutz-Grundverordnung ist David Pflugpeil,
              Adlzreiterstraße 23b, 80337 München, david at pflugpeil dot com. Das Projekt wird
              ehrenamtlich aus der Nachbarschaft betrieben; die vollständige Anbieterkennzeichnung
              steht im Impressum.
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
      <div className="mt-2.5 space-y-3 text-[1.0625rem] leading-relaxed text-ink-soft [&_li]:flex [&_li]:gap-3 [&_li]:before:mt-2.5 [&_li]:before:size-1.5 [&_li]:before:shrink-0 [&_li]:before:rounded-full [&_li]:before:bg-sage [&_li]:before:content-['']">
        {children}
      </div>
    </section>
  );
}
