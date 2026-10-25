"use client";

import { History, Paperclip, Reply, X } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CaseDetail, Comment, UserRef } from "@aml/shared";
import { documentUrl, useAddComment, useComments, useDeleteComment, useEditComment, useUploadDocument } from "@/entities/case";
import { useMe } from "@/entities/session";
import { ACCEPT, formatSize, MAX_UPLOAD } from "./case-documents";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatRelative } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { MentionInput } from "./mention-input";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Mentioned people are whoever's "@Full Name" appears in the text; the server re-checks membership. */
const mentionsIn = (body: string, people: UserRef[]) => people.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id);

const Body = ({ text, people }: { text: string; people: UserRef[] }) => {
  const parts = useMemo(() => {
    if (!people.length) return [text];
    const re = new RegExp(`(@(?:${people.map((p) => escape(p.name)).join("|")}))`, "g");
    return text.split(re);
  }, [text, people]);
  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => (i % 2 ? <span key={i} className="rounded-sm bg-brand-soft px-0.5 text-heading">{part}</span> : <Fragment key={i}>{part}</Fragment>))}
    </p>
  );
};

const Composer = ({ code, people, parentId, onDone, autoFocus }: { code: string; people: UserRef[]; parentId?: string; onDone?: () => void; autoFocus?: boolean }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Array<{ id: string; name: string; size: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const add = useAddComment();
  const upload = useUploadDocument();
  const input = useRef<HTMLInputElement>(null);

  const attach = (list: FileList | null) => {
    setError(null);
    for (const file of Array.from(list ?? [])) {
      if (file.size > MAX_UPLOAD) { setError(t("caseDetail.tooLarge", { name: file.name })); continue; }
      upload.mutate({ code, file }, { onSuccess: (doc) => setFiles((f) => [...f, doc]), onError: () => setError(t("caseDetail.uploadFailed", { name: file.name })) });
    }
  };

  const send = () => {
    if (!body.trim()) return;
    add.mutate(
      { code, body: body.trim(), parentId, mentions: mentionsIn(body, people), documentIds: files.map((f) => f.id) },
      { onSuccess: () => { setBody(""); setFiles([]); onDone?.(); }, onError: () => setError(t("errors.generic")) },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <MentionInput value={body} onChange={setBody} people={people} onSubmit={send} autoFocus={autoFocus} label={parentId ? t("comments.reply") : t("comments.write")} placeholder={t("comments.placeholder")} />
      {files.length ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 ps-3 pe-1 text-xs">
              {f.name} · {formatSize(f.size, locale)}
              <button type="button" aria-label={t("forms.remove")} onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))} className="rounded-full p-0.5 hover:bg-border"><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="text-xs text-risk-high-text">{error}</p> : null}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
            <Paperclip /> {upload.isPending ? t("caseDetail.uploading") : t("comments.attach")}
          </Button>
          <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
          <span className="hidden text-xs text-text-secondary sm:inline">{t("comments.hint")}</span>
        </span>
        <span className="flex gap-2">
          {onDone ? <Button type="button" variant="ghost" size="sm" onClick={onDone}>{t("forms.cancel")}</Button> : null}
          <Button type="button" size="sm" disabled={!body.trim() || add.isPending || upload.isPending} onClick={send}>{add.isPending ? t("forms.saving") : t("comments.send")}</Button>
        </span>
      </div>
    </div>
  );
};

const Item = ({ code, comment, people, meId, onReply }: { code: string; comment: Comment; people: UserRef[]; meId?: string; onReply?: () => void }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const edit = useEditComment();
  const remove = useDeleteComment();
  const own = comment.author.id === meId;

  return (
    <article className="flex gap-3" aria-label={t("comments.by", { name: comment.author.name })}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs text-heading" aria-hidden>
        {comment.author.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
          <span className="text-sm text-text">{comment.author.name}</span>
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt, locale)}>{formatRelative(comment.createdAt, locale)}</time>
          {comment.editedAt && comment.edits.length ? (
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-1 rounded-sm hover:text-text"><History className="size-3" /> {t("comments.edited")}</PopoverTrigger>
              <PopoverContent className="w-80">
                <p className="mb-2 text-xs text-text-secondary">{t("comments.history")}</p>
                <ol className="flex max-h-64 flex-col gap-2 overflow-auto">
                  {comment.edits.map((e, i) => (
                    <li key={i} className="border-b border-border pb-2 text-sm last:border-0">
                      <span className="block text-xs text-text-secondary">{formatDateTime(e.editedAt, locale)}</span>
                      <span className="whitespace-pre-wrap">{e.body}</span>
                    </li>
                  ))}
                </ol>
              </PopoverContent>
            </Popover>
          ) : null}
        </header>
        {comment.deleted ? (
          <p className="text-sm text-text-secondary italic">{t("comments.deleted")}</p>
        ) : editing ? (
          <div className="flex flex-col gap-2">
            <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t("comments.edit")} autoFocus />
            <span className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(comment.body); }}>{t("forms.cancel")}</Button>
              <Button size="sm" disabled={!draft.trim() || edit.isPending} onClick={() => edit.mutate({ code, id: comment.id, body: draft.trim() }, { onSuccess: () => setEditing(false) })}>{t("forms.save")}</Button>
            </span>
          </div>
        ) : (
          <Body text={comment.body} people={people} />
        )}
        {comment.attachments.length && !comment.deleted ? (
          <ul className="flex flex-wrap gap-2">
            {comment.attachments.map((a) => (
              <li key={a.id}><a href={documentUrl(code, a.id)} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-0.5 text-xs text-link hover:underline"><Paperclip className="size-3" /> {a.name}</a></li>
            ))}
          </ul>
        ) : null}
        {!comment.deleted && !editing ? (
          <div className="flex gap-1 text-xs">
            {onReply ? <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReply}><Reply /> {t("comments.reply")}</Button> : null}
            {own ? <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>{t("comments.edit")}</Button> : null}
            {own ? (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-risk-high-text" disabled={remove.isPending} onClick={() => window.confirm(t("comments.confirmDelete")) && remove.mutate({ code, id: comment.id })}>
                {t("comments.delete")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

/** Threaded discussion for case members: one level of replies, @mentions notify people, edits keep history. */
export const CaseComments = ({ detail }: { detail: CaseDetail }) => {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { case: c, members, allowed } = detail;
  const { data, isPending } = useComments(c.code, allowed.isMember);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const people = useMemo(() => members.filter((m) => m.id !== me?.id), [members, me?.id]);

  if (!allowed.isMember) return <p className="text-sm text-text-secondary">{t("comments.membersOnly")}</p>;
  if (isPending) return <Skeleton className="h-40" />;

  const top = (data ?? []).filter((x) => !x.parentId);
  const replies = (id: string) => (data ?? []).filter((x) => x.parentId === id);

  return (
    <div className="flex flex-col gap-5">
      {top.length ? (
        <ol className="flex flex-col gap-5">
          {top.map((cm) => (
            <li key={cm.id} className="flex flex-col gap-3">
              <Item code={c.code} comment={cm} people={members} meId={me?.id} onReply={allowed.comment ? () => setReplyTo(cm.id) : undefined} />
              {replies(cm.id).length || replyTo === cm.id ? (
                <ol className="ms-11 flex flex-col gap-3 border-s-2 border-border ps-4">
                  {replies(cm.id).map((r) => <li key={r.id}><Item code={c.code} comment={r} people={members} meId={me?.id} /></li>)}
                  {replyTo === cm.id ? <li><Composer code={c.code} people={people} parentId={cm.id} onDone={() => setReplyTo(null)} autoFocus /></li> : null}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-text-secondary">{t("comments.empty")}</p>
      )}
      {allowed.comment ? <Composer code={c.code} people={people} /> : null}
    </div>
  );
};
