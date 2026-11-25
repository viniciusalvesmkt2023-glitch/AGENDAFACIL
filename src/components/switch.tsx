/** Chave liga/desliga (checkbox estilizado, funciona em formulários normais). */
export function Switch({
  name,
  checked,
  defaultChecked,
  onChange,
  label,
}: {
  name: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0">
      <input
        type="checkbox"
        name={name}
        aria-label={label}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span className="absolute inset-0 rounded-full bg-zinc-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  );
}
