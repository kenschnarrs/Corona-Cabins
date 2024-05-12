import React from "react";
import Router from "next/router";

import { CabinProps } from "../lib/types";
import Link from "next/link";

const CabinOption: React.FC<{ cabin: CabinProps }> = ({ cabin }) => {
  return (
    <Link href="/p/[cabinId]" as={`/p/${cabin.id}`}>
      <a className="block border border-gray-300 rounded-lg p-4 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring focus:border-blue-300">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{cabin.name}</h2>
          <p className="text-sm text-gray-600">{cabin.price_per_night} pesos por noche</p>
          <p className="text-sm text-gray-700">{cabin.description}</p>
        </div>
      </a>
    </Link>
  );
};

export default CabinOption;