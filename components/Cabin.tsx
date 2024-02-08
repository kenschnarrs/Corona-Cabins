import React from "react";
import Router from "next/router";
import ReactMarkdown from "react-markdown";

import {CabinProps} from "../lib/types";


const Cabin: React.FC<{ cabin: CabinProps }> = ({ cabin }) => {
  return (
    <div onClick={() => Router.push("/p/[id]", `/p/${cabin.id}`)}>
      <h2>{cabin.name}</h2>
      <small>{cabin.price_per_night} pesos por noche</small>
      <ReactMarkdown children={cabin.description} />
      <style jsx>{`
        div {
          color: inherit;
          padding: 2rem;
        }
      `}</style>
    </div>
  );
};

export default Cabin;
