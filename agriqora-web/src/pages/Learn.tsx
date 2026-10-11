import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { useTitle } from '../lib/useTitle';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner, TabBar } from '../components/ui';
import { BookOpen, Megaphone, MapPin } from 'lucide-react';

type Tab = 'lessons' | 'announcements';

/** Turns "1. step" lines into a numbered list and other lines into paragraphs. */
function LessonBody({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let steps: string[] = [];
  const flush = () => {
    if (steps.length) {
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal space-y-2 pl-5">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>,
      );
      steps = [];
    }
  };
  for (const line of content.split('\n')) {
    const m = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (m && m[1]) steps.push(m[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{line}</p>);
    }
  }
  flush();
  return <div className="space-y-3 text-[15px] leading-relaxed text-ink/90">{blocks}</div>;
}

function Lessons() {
  const { data, error, loading, reload } = useAsync((signal) => api.listLearn(undefined, signal), []);
  const [crop, setCrop] = useState('All');
  const [openId, setOpenId] = useState<string | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Spinner label="Loading lessons" />;

  const crops = ['All', ...Array.from(new Set(data.map((m) => m.crop)))];
  const list = crop === 'All' ? data : data.filter((m) => m.crop === crop);

  return (
    <>
      <div role="group" aria-label="Filter lessons by crop" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {crops.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={crop === c}
            onClick={() => setCrop(c)}
            className={`chip shrink-0 ${crop === c ? 'chip-active' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState title="No lessons yet" text="Please check back soon." compact />
      ) : (
        <div className={`mt-6 grid items-start gap-5 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
          {list.map((m) => {
            const open = openId === m.id;
            return (
              <article key={m.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">{m.crop}</Badge>
                  <span className="text-xs text-muted">
                    {m.category} · {m.readTime}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-ink">{m.title}</h3>
                <p className="mt-2 text-[15px] text-ink/85">{m.summary}</p>
                <p className="mt-2 text-xs text-muted">{m.language}</p>

                {open && (
                  <div id={`lesson-${m.id}`} className="mt-4 border-t border-line pt-4">
                    <LessonBody content={m.content} />
                  </div>
                )}

                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`lesson-${m.id}`}
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="btn btn-outline mt-4"
                >
                  {open ? 'Close lesson' : 'Read lesson'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function Announcements() {
  const { data, error, reload } = useAsync((signal) => api.listCommunity(signal), []);
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Spinner label="Loading announcements" />;
  if (data.length === 0) return <EmptyState title="No announcements yet" text="New market days, trainings and advice will appear here." compact />;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {data.map((post) => (
        <article key={post.id} className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={post.category === 'Training' ? 'warn' : 'green'}>{post.category}</Badge>
            <span className="text-xs text-muted">{post.date}</span>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-ink">{post.title}</h3>
          <p className="mt-2 text-[15px] text-ink/85">{post.content}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{post.author}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {post.location}
            </span>
          </p>
        </article>
      ))}
    </div>
  );
}

export default function Learn() {
  useTitle('Learn');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'announcements' ? 'announcements' : 'lessons';

  return (
    <div className="wrap pb-14 pt-10">
      <PageHeader
        title="Learn and connect"
        subtitle="Simple, practical lessons for farmers, plus market days, trainings and advice from the farming community around Suleja."
      />
      <div className="mt-6">
        <TabBar<Tab>
          label="Learning sections"
          active={tab}
          onChange={(id) => setParams(id === 'lessons' ? {} : { tab: id }, { replace: true })}
          tabs={[
            { id: 'lessons', label: 'Farming lessons', icon: <BookOpen className="h-4 w-4" aria-hidden /> },
            { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" aria-hidden /> },
          ]}
        />
      </div>
      <div className="mt-6">{tab === 'lessons' ? <Lessons /> : <Announcements />}</div>
      <p className="mt-8 text-xs text-muted">Posted dates use the format {formatDate('2026-10-05')}.</p>
    </div>
  );
}
