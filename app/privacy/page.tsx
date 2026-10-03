import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { AI_PROVIDER, PRIVACY_EMAIL, RATE_LIMIT_IP_RETENTION } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy notice" };

/**
 * Written to match what the code actually does — checked against
 * lib/store.tsx (sessionStorage only), lib/rateLimit.ts (IP-keyed counters,
 * expiring within two windows), the API routes (no persistence, no logging of
 * document text) and the absence of cookies or analytics. If any of those
 * change, this page has to change with them.
 */
export default function PrivacyPage() {
  const contact = PRIVACY_EMAIL ? (
    <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
  ) : (
    <>the privacy contact we will publish here before launch</>
  );

  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy notice"
      intro={
        <p>
          Hospitality helps you understand a health insurance policy. To do that
          it has to read the policy, and a health insurance policy is personal:
          it can name you, your family and your health conditions. This notice
          explains exactly what happens to it, in plain terms. The short version:{" "}
          <strong>we do not keep your document</strong>, and you can delete
          everything this site saved in your browser at any time.
        </p>
      }
      sections={[
        {
          id: "what",
          heading: "What we handle",
          body: (
            <ul>
              <li>
                <strong>Your policy document</strong> — text you paste, or a PDF
                you upload, which we convert to text on our server.
              </li>
              <li>
                <strong>Details you enter</strong> — the reason for admission you
                pick, where you are starting from, expected length of stay, and
                any hospital you choose.
              </li>
              <li>
                <strong>Questions you type</strong> into &ldquo;Ask about your
                cover&rdquo;.
              </li>
              <li>
                <strong>Your IP address</strong>, briefly, to stop any one person
                sending too many requests (see section 5).
              </li>
            </ul>
          ),
        },
        {
          id: "why",
          heading: "Why we use it",
          body: (
            <p>
              Only to explain your cover to you: to read your policy, find the
              clauses that matter, compare hospitals against them and answer your
              questions. We do not use it for advertising, we do not sell it, we
              do not build a profile of you, and we do not use your document to
              train any AI model. We ask for your consent before reading your own
              document, and we do not read it without that consent.
            </p>
          ),
        },
        {
          id: "where",
          heading: "Where it goes",
          body: (
            <>
              <p>
                <strong>Our server</strong> reads the document while it works on
                your request and then discards it. We have no database. We do not
                write your document, its contents, your details or your questions
                to disk or to our logs.
              </p>
              <p>
                <strong>Our AI provider, {AI_PROVIDER}</strong>, receives the text
                of your document, and your questions, so it can read them. This
                is the one place your document goes outside Hospitality. It may
                be processed outside India. {AI_PROVIDER} handles it under its
                commercial terms — see {AI_PROVIDER}&rsquo;s own privacy policy
                for how long it keeps API data and how it protects it. (In the
                public preview, your own documents are not sent to {AI_PROVIDER}
                at all; only the built-in samples can be read.)
              </p>
              <p>
                <strong>Your browser</strong> keeps your session — the document,
                our reading of it and your choices — in this tab&rsquo;s session
                storage, so the pages can share it. It is cleared when you close
                the tab. Your light/dark preference is kept in local storage.
              </p>
              <p>
                <strong>Our hosting provider</strong> may keep standard request
                records, such as IP addresses and the time of each request, under
                its own policies.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          heading: "Cookies and tracking",
          body: (
            <p>
              Hospitality sets no cookies, uses no analytics, and loads no
              advertising or tracking scripts.
            </p>
          ),
        },
        {
          id: "retention",
          heading: "How long we keep it",
          body: (
            <ul>
              <li>Your document, details and questions: not kept by us at all.</li>
              <li>In your browser: until you close the tab or delete it.</li>
              <li>
                Your IP address, for limiting requests: at most{" "}
                {RATE_LIMIT_IP_RETENTION}, after which the counter expires.
              </li>
            </ul>
          ),
        },
        {
          id: "rights",
          heading: "Your choices and rights",
          body: (
            <>
              <p>
                <strong>Delete it now.</strong> Use &ldquo;Delete my data&rdquo;
                at the foot of any page to remove everything this site saved in
                your browser. Closing the tab does the same for your session.
              </p>
              <p>
                <strong>Withdraw consent.</strong> You can stop at any time.
                Because we keep nothing, withdrawing consent and deleting your
                data are the same step.
              </p>
              <p>
                Under India&rsquo;s Digital Personal Data Protection Act, 2023,
                you can ask us about how your data is handled, ask for it to be
                corrected or erased, nominate someone to act for you, and raise a
                grievance. Write to {contact}. If you are not satisfied with our
                answer, you can complain to the Data Protection Board of India.
              </p>
            </>
          ),
        },
        {
          id: "children",
          heading: "Children",
          body: (
            <p>
              Hospitality is for adults. If you are under 18, please ask a parent
              or guardian to use it with you, and to give consent on your behalf.
            </p>
          ),
        },
        {
          id: "others",
          heading: "Other people's information",
          body: (
            <p>
              A family policy names other people. Please only add a policy if you
              are the policyholder or are helping them with their permission —
              for example, as a caregiver during an admission.
            </p>
          ),
        },
        {
          id: "changes",
          heading: "Changes to this notice",
          body: (
            <p>
              If we change how your data is handled, we will update this page and
              its date, and ask for your consent again before reading a new
              document.
            </p>
          ),
        },
      ]}
    />
  );
}
