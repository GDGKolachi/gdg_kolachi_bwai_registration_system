import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useEmailPreview,
  useEmailTemplates,
  useResetEmailTemplate,
  useSaveEmailTemplate,
  useSendTestEmail,
  useSetEmailTheme,
} from '../email-templates-repository';
import { effectiveCopy, isDirty, overridesFrom, unknownVariables, VARIANT_LABELS } from '../email-templates-service';
import { useDebounce } from '../../../../shared/hooks/useDebounce';
import { useCurrentUser } from '../../auth/use-current-user';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function ThemeCard({ data }) {
  const setTheme = useSetEmailTheme();
  const onChange = async (e) => {
    try {
      await setTheme.mutateAsync(e.target.value);
      toast.success('Default email theme saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the theme');
    }
  };
  return (
    <section className="ui-card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-900">Default theme</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Used by every email unless an event picks its own theme (Events → Edit → Email theme).
        </p>
      </div>
      <select
        aria-label="Default email theme"
        className="ui-input sm:w-64"
        value={data.theme}
        onChange={onChange}
        disabled={setTheme.isPending}
        data-testid="global-theme"
      >
        {data.themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </section>
  );
}

function Field({ id, label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="ui-label-sentence" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Editor({ type, themes, globalTheme }) {
  const { user } = useCurrentUser();
  const [form, setForm] = useState(() => effectiveCopy(type));
  const [previewTheme, setPreviewTheme] = useState(globalTheme);
  const [variant, setVariant] = useState(type.variants[0] || '');
  const [device, setDevice] = useState('desktop');
  const [testEmail, setTestEmail] = useState(user?.email ?? '');
  const lastField = useRef('intro');
  const fieldRefs = useRef({});

  const save = useSaveEmailTemplate();
  const reset = useResetEmailTemplate();
  const sendTest = useSendTestEmail();

  const copy = useMemo(() => overridesFrom(form, type.defaults), [form, type.defaults]);
  const debouncedCopy = useDebounce(copy, 400);
  const previewBody = useMemo(
    () => ({ theme: previewTheme, copy: debouncedCopy, ...(variant ? { variant } : {}) }),
    [previewTheme, debouncedCopy, variant],
  );
  const preview = useEmailPreview(type.type, previewBody);
  const dirty = isDirty(form, type);
  const unknown = unknownVariables(form, type.variables);

  // Picking another email type or saving refreshes the saved copy.
  useEffect(() => { setForm(effectiveCopy(type)); }, [type]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const track = (field) => () => { lastField.current = field; };

  const insertVariable = (name) => {
    const field = lastField.current;
    const el = fieldRefs.current[field];
    const token = `{{${name}}}`;
    const value = form[field] ?? '';
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setForm((f) => ({ ...f, [field]: value.slice(0, start) + token + value.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const onSave = async () => {
    try {
      await save.mutateAsync({ type: type.type, copy });
      toast.success(`Saved "${type.name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    }
  };

  const onReset = async () => {
    if (!confirm(`Reset "${type.name}" to the built-in default text?`)) return;
    try {
      await reset.mutateAsync(type.type);
      setForm({ ...type.defaults, cta_label: type.defaults.cta_label ?? '' });
      toast.success('Back to the default text');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset');
    }
  };

  const onTest = async () => {
    try {
      const res = await sendTest.mutateAsync({
        type: type.type,
        body: { email: testEmail.trim(), theme: previewTheme, copy, ...(variant ? { variant } : {}) },
      });
      if (res.ok) toast.success(`Sent "${res.subject}" to ${res.to}`);
      else toast.error(res.error || 'The test email was not sent');
    } catch (err) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'The test email was not sent');
    }
  };

  const input = (field, extra = {}) => ({
    id: `tpl-${field}`,
    ref: (el) => { fieldRefs.current[field] = el; },
    value: form[field] ?? '',
    onChange: set(field),
    onFocus: track(field),
    placeholder: type.defaults[field] ?? '',
    className: 'ui-input',
    ...extra,
  });

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="ui-card min-w-0 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{type.name}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{type.description}</p>
          </div>
          {type.customized && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-900 ring-1 ring-amber-200">Customized</span>
          )}
        </div>

        <Field id="tpl-subject" label="Subject"><input {...input('subject')} data-testid="tpl-subject" /></Field>
        <Field id="tpl-heading" label="Heading"><input {...input('heading')} /></Field>
        <Field id="tpl-intro" label="Intro" hint="**bold** works. A blank line starts a new paragraph.">
          <textarea {...input('intro', { rows: 5, className: 'ui-input resize-y' })} />
        </Field>
        {type.cta !== 'none' && (
          <Field
            id="tpl-cta_label"
            label="Button label"
            hint={type.cta === 'optional' ? 'Optional: leave empty for no button (it links to the events page).' : 'Leave empty to use the default label.'}
          >
            <input {...input('cta_label')} placeholder={type.defaults.cta_label ?? 'No button'} />
          </Field>
        )}

        <div className="mb-4">
          <p className="ui-label-sentence">Variables</p>
          <p className="mb-2 text-xs text-slate-400">Click to insert into the field you last edited.</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(type.variables).map(([name, desc]) => (
              <button
                key={name}
                type="button"
                title={desc}
                onClick={() => insertVariable(name)}
                className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[0.72rem] text-slate-700 hover:bg-gdg-blue/10 hover:text-gdg-blue"
              >
                {`{{${name}}}`}
              </button>
            ))}
          </div>
          {unknown.length > 0 && (
            <p className="mt-2 text-xs font-medium text-gdg-red" role="alert">
              Not available in this email, will be left blank: {unknown.map((u) => `{{${u}}}`).join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button type="button" className="ui-btn-primary" onClick={onSave} disabled={!dirty || save.isPending} data-testid="tpl-save">
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="ui-btn-secondary" onClick={() => setForm(effectiveCopy(type))} disabled={!dirty}>
            Discard changes
          </button>
          <button type="button" className="ui-btn-secondary ml-auto" onClick={onReset} disabled={!type.customized || reset.isPending}>
            Reset to default
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <label className="ui-label-sentence" htmlFor="tpl-test-email">Send a test</label>
          <p className="mb-2 text-xs text-slate-400">Sample data, current text and preview theme. Subject starts with [TEST].</p>
          <div className="flex gap-2">
            <input
              id="tpl-test-email"
              type="email"
              className="ui-input flex-1"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button type="button" className="ui-btn-secondary" onClick={onTest} disabled={!EMAIL_RE.test(testEmail.trim()) || sendTest.isPending}>
              {sendTest.isPending ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </div>
      </section>

      <section className="ui-card min-w-0 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-bold text-slate-900">Live preview</h2>
          <select aria-label="Preview theme" className="ui-input !w-auto !py-1.5 text-sm" value={previewTheme} onChange={(e) => setPreviewTheme(e.target.value)}>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {type.variants.length > 0 && (
            <select aria-label="Sample" className="ui-input !w-auto !py-1.5 text-sm" value={variant} onChange={(e) => setVariant(e.target.value)}>
              {type.variants.map((v) => <option key={v} value={v}>{VARIANT_LABELS[v] ?? v}</option>)}
            </select>
          )}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Preview width">
            {['desktop', 'mobile'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                className={`rounded-md px-2.5 py-1 capitalize ${device === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-400">Subject: </span>
          <span className="font-semibold text-slate-900" data-testid="preview-subject">{preview.data?.subject ?? '…'}</span>
        </div>
        <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {preview.isError ? (
            <p className="p-6 text-sm text-gdg-red">Could not render the preview.</p>
          ) : (
            <iframe
              title={`${type.name} preview`}
              sandbox=""
              srcDoc={preview.data?.html ?? ''}
              className="block h-[75vh] min-h-[32rem] border-0 bg-white transition-[width]"
              style={{ width: device === 'mobile' ? 390 : '100%', maxWidth: '100%' }}
              data-testid="preview-frame"
            />
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Sample data. The ticket QR and video thumbnail are attachments in the real email, so they show as broken images here.
        </p>
      </section>
    </div>
  );
}

export default function EmailTemplatesView() {
  const { data, isLoading, isError } = useEmailTemplates();
  const [selected, setSelected] = useState(null);

  if (isLoading) return <p className="py-24 text-center text-sm text-slate-500">Loading email templates…</p>;
  if (isError || !data) return <p className="py-24 text-center text-sm font-medium text-gdg-red">Could not load email templates.</p>;

  const current = data.types.find((t) => t.type === selected) ?? data.types[0];

  return (
    <div>
      <div className="admin-page-head">
        <h1>Email templates</h1>
        <p>The look and the words of every email the system sends. Changes apply to the next email that goes out.</p>
      </div>

      <ThemeCard data={data} />

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav className="ui-card h-fit min-w-0 p-2" aria-label="Email types">
          <ul className="flex gap-1 overflow-x-auto 2xl:flex-col">
            {data.types.map((t) => (
              <li key={t.type} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(t.type)}
                  aria-current={t.type === current.type ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    t.type === current.type ? 'bg-gdg-blue/10 font-semibold text-gdg-blue' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {t.customized && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="Customized" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <Editor key={current.type} type={current} themes={data.themes} globalTheme={data.theme} />
      </div>
    </div>
  );
}
