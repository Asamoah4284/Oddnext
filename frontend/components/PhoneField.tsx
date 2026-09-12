"use client";

export function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-mute">
        Mobile Money number
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="024 000 0000"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-2"
      />
      <span className="mt-1.5 block text-xs text-mute">
        The slip SMS goes to this number after you pay.
      </span>
    </label>
  );
}
