export default function BrandMark({ className = "", compact = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] border border-[#314033] bg-[#080b09] shadow-[0_0_22px_-7px_rgba(140,255,79,.8)]">
        <img src="/icons/mytradebook-mark.svg" alt="" className="h-full w-full" />
      </span>
      {!compact && <span className="text-lg font-semibold tracking-[-0.045em] text-white">MyTrade<span className="text-[#8CFF4F]">Book</span></span>}
    </span>
  );
}
