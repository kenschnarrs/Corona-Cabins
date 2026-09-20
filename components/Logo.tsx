import React from "react";

const Logo: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    aria-hidden="true"
    className={`grid h-[52px] w-[52px] place-items-center rounded-full border font-sans font-extrabold ${
      dark ? "border-ink/60" : "border-white/75"
    }`}
  >
    CC
  </div>
);

export default Logo;
