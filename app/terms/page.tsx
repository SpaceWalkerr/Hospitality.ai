import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { AI_PROVIDER } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of use"
      intro={
        <p>
          These terms set out what Hospitality is, what it is not, and what you
          can rely on it for. Please read section 3 in particular: Hospitality
          explains your policy, but{" "}
          <strong>only your insurer decides what is paid</strong>.
        </p>
      }
      sections={[
        {
          id: "emergency",
          heading: "In an emergency",
          body: (
            <p>
              <strong>
                Do not delay care to use this tool. In India, call 112 for
                emergencies, or 108 for an ambulance in most states.
              </strong>{" "}
              No question about cover is worth a delay in treatment.
            </p>
          ),
        },
        {
          id: "what",
          heading: "What Hospitality is",
          body: (
            <>
              <p>
                Hospitality is an information tool. It reads a health insurance
                document you provide and explains, in plain language, what that
                document appears to say — with every statement linked to the
                lines it came from. It compares hospitals and room categories
                against those terms and estimates what you might pay.
              </p>
              <p>It is <strong>not</strong>:</p>
              <ul>
                <li>
                  <strong>Medical advice.</strong> It never diagnoses, judges how
                  serious a situation is, or recommends a treatment, procedure,
                  medicine or doctor. Those decisions belong to the treating
                  clinician.
                </li>
                <li>
                  <strong>Insurance advice or a claims decision.</strong> It does
                  not approve, reject or guarantee any claim, and it does not
                  recommend which insurance to buy.
                </li>
                <li>
                  <strong>An insurer, broker, agent, third-party administrator
                  or intermediary.</strong> We do not sell insurance or act for
                  any insurer.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "reliance",
          heading: "What you can rely on",
          body: (
            <>
              <p>
                Explanations are produced by an AI model ({AI_PROVIDER}) and can
                be wrong. We check every quotation against your document and
                flag any we cannot find, but a correctly quoted clause can still
                be misread, and a document can be ambiguous.
              </p>
              <p>
                Cost estimates are illustrative. Real bills depend on the
                treatment actually given, the hospital&rsquo;s current tariff, and
                your insurer&rsquo;s assessment of the final bill.
              </p>
              <p>
                <strong>
                  Before you act on anything that affects money — choosing a
                  room, a hospital, or whether to proceed with treatment — confirm
                  it with your insurer or third-party administrator, and with the
                  hospital&rsquo;s insurance desk.
                </strong>
              </p>
            </>
          ),
        },
        {
          id: "preview",
          heading: "This preview",
          body: (
            <p>
              The current version is a prototype. The sample policies, hospitals,
              room rates and people in it are invented for illustration and do
              not describe any real insurer, facility or person. Hospital
              network status, rates and bed availability shown in the preview
              are not real and must not be used to choose a hospital.
            </p>
          ),
        },
        {
          id: "you",
          heading: "Your responsibilities",
          body: (
            <ul>
              <li>
                Only add a policy you are entitled to share: your own, or one you
                are helping the policyholder with, with their permission.
              </li>
              <li>
                Do not try to make Hospitality give medical advice, overload it,
                get around its limits, or use it to process documents in bulk.
              </li>
              <li>You must be 18 or older, or use it with a parent or guardian.</li>
            </ul>
          ),
        },
        {
          id: "liability",
          heading: "Liability",
          body: (
            <p>
              Hospitality is provided as it is, to help you understand your
              cover. To the extent the law allows, we are not liable for
              decisions made on the basis of its explanations or estimates, or
              for amounts your insurer or hospital charges or declines to pay.
              Nothing in these terms limits rights you have under Indian
              consumer protection law.
            </p>
          ),
        },
        {
          id: "privacy",
          heading: "Privacy",
          body: (
            <p>
              How we handle your document is set out in the{" "}
              <a href="/privacy">privacy notice</a>. In short: we do not keep it.
            </p>
          ),
        },
        {
          id: "changes",
          heading: "Changes and governing law",
          body: (
            <p>
              We may update these terms; the date at the top shows the latest
              version. These terms are governed by the laws of India.
            </p>
          ),
        },
      ]}
    />
  );
}
