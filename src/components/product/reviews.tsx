"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { reportReviewAction, submitReviewAction } from "@/app/actions/reviews";
import type { FormState } from "@/app/actions/store";
import { buttonClass } from "@/components/ui/button";
import { FormMessage, TextArea, TextInput } from "@/components/ui/fields";
import { cn, formatDate } from "@/lib/utils";

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

type ReviewAccess = "eligible" | "already-reviewed" | "not-eligible" | "sign-in";

export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={cn(i <= Math.round(value) ? "fill-ink text-ink" : "text-sand")} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function ReviewForm({ productId, defaultName }: { productId: string; defaultName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReviewAction, null);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <FormMessage tone="success">{state.message}</FormMessage>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="mb-2 text-xs font-medium">Your rating *</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} className="cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
              <input type="radio" name="rating" value={i} className="sr-only" checked={rating === i} onChange={() => setRating(i)} />
              <Star className={cn("size-7", i <= rating ? "fill-ink text-ink" : "text-sand")} strokeWidth={1.25} />
              <span className="sr-only">{i} star{i > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
        {state?.errors?.rating ? <p className="mt-1 text-xs text-sale">{state.errors.rating}</p> : null}
      </fieldset>
      <TextInput label="Display name" name="authorName" defaultValue={defaultName} required error={state?.errors?.authorName} />
      <TextInput label="Title (optional)" name="title" maxLength={120} error={state?.errors?.title} />
      <TextArea label="Your review" name="body" required minLength={20} maxLength={3000} error={state?.errors?.body} hint="Fit, feel, quality — what should others know?" />
      {state && !state.ok && state.message ? <FormMessage>{state.message}</FormMessage> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary", "md")}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
      <p className="text-xs text-stone">Reviews are moderated before they appear.</p>
    </form>
  );
}

export function ReviewsSection({
  productId,
  reviews,
  count,
  average,
  distribution,
  signedInName,
  reviewAccess,
}: {
  productId: string;
  reviews: ReviewItem[];
  count: number;
  average: number;
  distribution: { star: number; count: number }[];
  signedInName: string | null;
  reviewAccess: ReviewAccess;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  return (
    <section id="reviews" className="container-site scroll-mt-24 py-16 md:py-20" aria-labelledby="reviews-heading">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="reviews-heading" className="display text-4xl md:text-5xl">Reviews</h2>
          {count ? (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="display text-5xl">{average.toFixed(1)}</span>
                <div>
                  <Stars value={average} size={16} />
                  <p className="mt-1 text-xs text-stone">Based on {count} review{count === 1 ? "" : "s"}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-1.5">
                {distribution.map((d) => (
                  <li key={d.star} className="flex items-center gap-3 text-xs">
                    <span className="w-10">{d.star} star</span>
                    <span className="h-1 flex-1 bg-line">
                      <span className="block h-full bg-ink" style={{ width: `${count ? (d.count / count) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-right text-stone">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ash">No reviews yet. Be the first to share your thoughts.</p>
          )}
          <div className="mt-8">
            {reviewAccess === "eligible" && signedInName ? (
              formOpen ? (
                <ReviewForm productId={productId} defaultName={signedInName} />
              ) : (
                <button type="button" onClick={() => setFormOpen(true)} className={buttonClass("secondary", "md")}>
                  Write a review
                </button>
              )
            ) : reviewAccess === "sign-in" ? (
              <p className="text-sm">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="underline">
                  Sign in
                </Link>{" "}
                to check whether you can review this product.
              </p>
            ) : reviewAccess === "already-reviewed" ? (
              <p className="text-sm text-ash">You’ve already submitted a review for this product.</p>
            ) : (
              <p className="text-sm text-ash">
                Reviews are available to customers with a paid, delivered order, within 7 days of delivery.
              </p>
            )}
          </div>
        </div>
        <div className="lg:col-span-8">
          {reviews.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-stone">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.title ? <p className="mt-3 text-sm font-semibold">{r.title}</p> : null}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-charcoal">{r.body}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-stone">
                    <span>{r.authorName}</span>
                    {r.verifiedPurchase ? <span className="bg-paper px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wider text-success">Verified purchase</span> : null}
                    <button
                      type="button"
                      disabled={reported.has(r.id)}
                      onClick={() => {
                        setReported(new Set(reported).add(r.id));
                        startTransition(() => reportReviewAction(r.id));
                      }}
                      className="ml-auto underline disabled:no-underline"
                    >
                      {reported.has(r.id) ? "Reported" : "Report"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-line px-6 py-14 text-center text-sm text-ash">Reviews from customers will appear here.</div>
          )}
        </div>
      </div>
    </section>
  );
}
