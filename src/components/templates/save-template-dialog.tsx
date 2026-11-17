"use client";

import { useId, useState, type FormEvent } from "react";

import { ShellButton } from "@/components/shared/form-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEnvelopeMessages } from "@/lib/i18n/use-envelope-messages";
import { MAX_TEMPLATE_ROLE_NAME_LENGTH } from "@/lib/schemas/template";

type SaveTemplateDialogProps = {
  envelopeId: string;
  /** What the template is called unless the sender changes it. */
  initialName: string;
  onCancel: () => void;
  onSaved: (templateName: string) => void;
  /** In signing order. The names only say whose place is being named. */
  signers: readonly { id: string; name: string }[];
};

/**
 * Asks what to call the template and each place in its signing order, then
 * saves the envelope as a template.
 */
export function SaveTemplateDialog({
  envelopeId,
  initialName,
  onCancel,
  onSaved,
  signers,
}: SaveTemplateDialogProps) {
  const { common, saveTemplate: messages } = useEnvelopeMessages();
  const formId = useId();
  const [name, setName] = useState(initialName);
  const [roleNames, setRoleNames] = useState(() =>
    signers.map((_, index) => messages.defaultRoleName(index + 1)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedRoleNames = roleNames.map((roleName) => roleName.trim());
  const hasRepeatedRoleName =
    new Set(trimmedRoleNames.map((roleName) => roleName.toLowerCase())).size !==
    trimmedRoleNames.length;
  const canSave =
    name.trim().length > 0 &&
    trimmedRoleNames.every((roleName) => roleName.length > 0) &&
    !hasRepeatedRoleName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave || isSaving) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/template`, {
        body: JSON.stringify({ name, roleNames: trimmedRoleNames }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        name?: string;
      } | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? common.genericError);
        return;
      }

      onSaved(payload?.name ?? name.trim());
    } catch {
      setErrorMessage(common.genericError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-lg sm:p-8" showCloseButton={false}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <DialogHeader className="space-y-3">
            <DialogTitle>{messages.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm leading-6 text-(--secondary)">
                <p>{messages.intro}</p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <label className="grid gap-1.5" htmlFor={`${formId}-name`}>
            <span className="text-[0.8125rem] font-semibold text-(--secondary)">
              {messages.nameLabel}
            </span>
            <input
              autoFocus
              className="field-input"
              disabled={isSaving}
              id={`${formId}-name`}
              maxLength={160}
              onChange={(event) => {
                setErrorMessage(null);
                setName(event.target.value);
              }}
              type="text"
              value={name}
            />
          </label>

          <fieldset className="grid gap-3">
            <legend className="text-[0.9375rem] font-extrabold text-(--fg)">
              {messages.whoSigns}
            </legend>
            <p className="text-[0.8125rem] leading-5 text-(--secondary)">
              {messages.whoSignsHelp}
            </p>
            {signers.map((signer, index) => (
              <label
                className="well grid gap-1.5 px-4 py-3"
                htmlFor={`${formId}-role-${String(index)}`}
                key={signer.id}
              >
                <span className="text-[0.8125rem] font-semibold text-(--secondary)">
                  {messages.roleLabel(index + 1, signer.name)}
                </span>
                <input
                  className="field-input"
                  disabled={isSaving}
                  id={`${formId}-role-${String(index)}`}
                  maxLength={MAX_TEMPLATE_ROLE_NAME_LENGTH}
                  onChange={(event) => {
                    setErrorMessage(null);
                    setRoleNames((current) =>
                      current.map((roleName, roleIndex) =>
                        roleIndex === index ? event.target.value : roleName,
                      ),
                    );
                  }}
                  type="text"
                  value={roleNames[index] ?? ""}
                />
              </label>
            ))}
            {hasRepeatedRoleName ? (
              <p className="text-xs font-semibold text-(--danger)" role="alert">
                {messages.repeatedName}
              </p>
            ) : null}
          </fieldset>

          {errorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <ShellButton
              disabled={isSaving}
              onClick={onCancel}
              variant="secondary"
            >
              {common.cancel}
            </ShellButton>
            <ShellButton disabled={!canSave} loading={isSaving} type="submit">
              {isSaving ? common.saving : messages.save}
            </ShellButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
