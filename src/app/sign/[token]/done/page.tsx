import { SigningDoneShell } from "@/components/signing/signing-done-shell";
import { SigningStateScreen } from "@/components/signing/signing-state-screen";

type SignDonePageProps = {
  searchParams?: Promise<{
    approved?: string | string[];
    status?: string | string[];
    title?: string | string[];
  }>;
};

export default async function SignDonePage({
  searchParams,
}: SignDonePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const status = Array.isArray(resolvedSearchParams?.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams?.status;

  if (status === "voided") {
    return (
      <SigningStateScreen
        description="The sender cancelled this document. No further action is needed."
        title="This envelope has been voided"
      />
    );
  }

  if (status === "declined") {
    return (
      <SigningStateScreen
        description="A signer declined, or an approver rejected, this document. No further action is needed."
        title="This envelope has been declined"
      />
    );
  }

  const envelopeTitle = Array.isArray(resolvedSearchParams?.title)
    ? resolvedSearchParams.title[0]
    : resolvedSearchParams?.title;

  return (
    <SigningDoneShell
      approved={resolvedSearchParams?.approved === "1"}
      envelopeTitle={envelopeTitle}
    />
  );
}
