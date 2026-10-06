import { useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { PageSwitches } from "@/components/admin/PageSwitches";
import { useSection } from "./useSection";
import { IMAGE_LABELS, PAGE_LABELS, fetchSiteContent, type PageKey, type SiteContent } from "@/lib/siteContent";

const MIN_VALUES = 3;
const MAX_VALUES = 6;

type Hero = SiteContent["hero"];
type About = SiteContent["about"];
type Contact = SiteContent["contact"];
type Service = SiteContent["services"][number];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="adm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function SaveBar({ busy, dirty, label }: { busy: boolean; dirty: boolean; label: string }) {
  return (
    <div className="adm-actions">
      <button type="submit" className="adm-btn" disabled={busy || !dirty}><Save size={16} /> {busy ? "Saving…" : label}</button>
      {!dirty && !busy && <span className="adm-muted">No changes to save</span>}
    </div>
  );
}

function ValuesForm({ section, initial, title, sub, ok }: { section: string; initial: Service[] | undefined; title: string; sub: string; ok: string }) {
  const v = useSection<Service[]>(section, initial);
  return (
      <form className="adm-panel" onSubmit={(e) => {
        if (v.draft.length < MIN_VALUES) { e.preventDefault(); return toast.error(`Keep at least ${MIN_VALUES} items in "${title}"`); }
        if (v.draft.some((x) => !x.title.trim() || !x.description.trim())) { e.preventDefault(); return toast.error("Give every value a title and a description"); }
        v.save(e, ok);
      }}>
        <h2>{title}</h2>
        <p className="sub">{sub} You can change any of them, including the original ones. There must always be at least {MIN_VALUES}, each with a title and a description (up to {MAX_VALUES}).</p>
        <div className="adm-grid">
          {v.draft.map((s, i) => (
            <div key={s.id} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 14 }}>
              <Field label={`Value ${i + 1} title`}><input type="text" maxLength={80} value={s.title} onChange={(e) => v.setDraft(v.draft.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
              <Field label="Description" hint={`${s.description.length} of 5,000 characters. A new line starts a new paragraph.`}><textarea rows={8} maxLength={5000} value={s.description} onChange={(e) => v.setDraft(v.draft.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /></Field>
              <div><button type="button" className="adm-btn small ghost" disabled={v.draft.length <= MIN_VALUES} title={v.draft.length <= MIN_VALUES ? `At least ${MIN_VALUES} values are required` : undefined} onClick={() => v.setDraft(v.draft.filter((_, j) => j !== i))}><Trash2 size={14} /> Remove</button></div>
            </div>
          ))}
        </div>
        <div className="adm-actions">
          <button type="button" className="adm-btn ghost" disabled={v.draft.length >= MAX_VALUES} onClick={() => v.setDraft([...v.draft, { id: `${Date.now()}`, title: "", description: "" }])}><Plus size={16} /> Add a value</button>
          <button type="submit" className="adm-btn" disabled={v.busy || !v.dirty}><Save size={16} /> {v.busy ? "Saving…" : "Save values"}</button>
        </div>
      </form>
  );
}

export default function Content() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "site-content"], queryFn: fetchSiteContent });

  const hero = useSection<Hero>("hero", data?.hero);
  const about = useSection<About>("about", data?.about);
  const contact = useSection<Contact>("contact", data?.contact);
  const pages = useSection<SiteContent["pages"]>("pages", data?.pages);
  const images = useSection<SiteContent["images"]>("images", data?.images);

  if (isLoading) return <p className="adm-muted">Loading…</p>;
  if (isError || !data)
    return (
      <div className="adm-err" role="alert">
        <span>The page text could not be loaded.</span>
        <button className="adm-btn small" onClick={() => refetch()}>Retry</button>
      </div>
    );

  const saveContact = (e: React.FormEvent) => {
    const c = contact.draft;
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) { e.preventDefault(); return toast.error("Enter a valid email address"); }
    if (c.phone.replace(/\D/g, "").length < 7) { e.preventDefault(); return toast.error("Enter a valid phone number"); }
    if (!/^\d{8,15}$/.test(c.whatsapp.replace(/\D/g, ""))) { e.preventDefault(); return toast.error("Enter the WhatsApp number with country code, e.g. 2348028081047"); }
    contact.save(e, "Contact details updated");
  };

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Page text</h1>
          <p>Edit the words and contact details shown across the website. Changes go live as soon as you save.</p>
        </div>
      </div>

      <PageSwitches />

      <form className="adm-panel" onSubmit={(e) => hero.save(e, "Home page headline updated")}>
        <h2>Home page headline</h2>
        <p className="sub">The large headline and line of text at the top of the home page.</p>
        <div className="adm-grid">
          <Field label="Headline"><input type="text" maxLength={120} value={hero.draft.title} onChange={(e) => hero.setDraft({ ...hero.draft, title: e.target.value })} /></Field>
          <Field label="Supporting text"><textarea rows={3} maxLength={300} value={hero.draft.subtitle} onChange={(e) => hero.setDraft({ ...hero.draft, subtitle: e.target.value })} /></Field>
        </div>
        <SaveBar busy={hero.busy} dirty={hero.dirty} label="Save headline" />
      </form>

      <form className="adm-panel" onSubmit={(e) => about.save(e, "About text updated")}>
        <h2>About the company</h2>
        <p className="sub">Used on the About page and in search results.</p>
        <div className="adm-grid">
          <Field label="Title"><input type="text" maxLength={120} value={about.draft.title} onChange={(e) => about.setDraft({ ...about.draft, title: e.target.value })} /></Field>
          <Field label="Description" hint={`${about.draft.description.length} of 10,000 characters. A blank line starts a new paragraph.`}><textarea rows={12} maxLength={10000} value={about.draft.description} onChange={(e) => about.setDraft({ ...about.draft, description: e.target.value })} /></Field>
        </div>
        <SaveBar busy={about.busy} dirty={about.dirty} label="Save about text" />
      </form>

      <form className="adm-panel" onSubmit={saveContact} noValidate>
        <h2>Contact details</h2>
        <p className="sub">Shown in the footer, on the Contact page and used for the WhatsApp buttons.</p>
        <div className="adm-grid two">
          <Field label="Phone number"><input type="text" inputMode="tel" maxLength={30} value={contact.draft.phone} onChange={(e) => contact.setDraft({ ...contact.draft, phone: e.target.value })} /></Field>
          <Field label="Email address"><input type="email" maxLength={255} value={contact.draft.email} onChange={(e) => contact.setDraft({ ...contact.draft, email: e.target.value })} /></Field>
          <Field label="WhatsApp number" hint="With country code and no + or spaces, e.g. 2348028081047"><input type="text" inputMode="numeric" maxLength={20} value={contact.draft.whatsapp} onChange={(e) => contact.setDraft({ ...contact.draft, whatsapp: e.target.value })} /></Field>
          <Field label="Address"><input type="text" maxLength={200} value={contact.draft.address} onChange={(e) => contact.setDraft({ ...contact.draft, address: e.target.value })} /></Field>
        </div>
        <SaveBar busy={contact.busy} dirty={contact.dirty} label="Save contact details" />
      </form>

      <form className="adm-panel" onSubmit={(e) => {
        const bad = (Object.keys(PAGE_LABELS) as PageKey[]).find((k) => !pages.draft[k].title.trim() || !pages.draft[k].text.trim());
        if (bad) { e.preventDefault(); return toast.error(`The ${PAGE_LABELS[bad]} heading and intro cannot be empty`); }
        pages.save(e, "Page headings updated");
      }}>
        <h2>Page headings</h2>
        <p className="sub">The title and introduction at the top of each main page. The Arya Luxe heading is edited under Projects.</p>
        <div className="adm-grid">
          {(Object.keys(PAGE_LABELS) as PageKey[]).map((k) => (
            <div key={k} className="adm-grid" style={{ border: "1px solid var(--a-line)", padding: 14 }}>
              <strong>{PAGE_LABELS[k]} page</strong>
              <Field label="Title"><input type="text" maxLength={80} value={pages.draft[k].title} onChange={(e) => pages.setDraft({ ...pages.draft, [k]: { ...pages.draft[k], title: e.target.value } })} /></Field>
              <Field label="Introduction"><textarea rows={2} maxLength={300} value={pages.draft[k].text} onChange={(e) => pages.setDraft({ ...pages.draft, [k]: { ...pages.draft[k], text: e.target.value } })} /></Field>
            </div>
          ))}
        </div>
        <SaveBar busy={pages.busy} dirty={pages.dirty} label="Save page headings" />
      </form>

      <form className="adm-panel" onSubmit={(e) => images.save(e, "Site photos updated")}>
        <h2>Site photos</h2>
        <p className="sub">Photos used around the website. Use Remove to go back to the standard photo. The Home page top photo is not editable here, and the Arya Luxe banner is edited on the Arya Luxe page.</p>
        <div className="adm-grid two">
          {(Object.keys(IMAGE_LABELS) as (keyof SiteContent["images"])[]).filter((k) => k !== "aryaBanner").map((k) => (
            <ImagePicker key={k} label={IMAGE_LABELS[k]} value={images.draft[k]} onChange={(url) => images.setDraft({ ...images.draft, [k]: url })} />
          ))}
        </div>
        <SaveBar busy={images.busy} dirty={images.dirty} label="Save site photos" />
      </form>

      <ValuesForm section="services" initial={data.services} title="What we stand for" sub="The values shown on the About page." ok="Values updated" />
      <ValuesForm section="promise" initial={data.promise} title="Why WSL Realty" sub="The promises shown on the Home page under the heading We think beyond the building." ok="Home promises updated" />
    </>
  );
}
