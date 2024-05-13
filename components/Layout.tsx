import React, { ReactNode } from "react";
import Header from "./CustomHeader";
import {Spacer} from "@nextui-org/spacer";


type Props = {
  children: ReactNode;
};

const Layout: React.FC<Props> = (props) => (
  <div>
    <Header />
    <div className="flex">
      <Spacer x={14} />
      <Spacer x={14} />
      {props.children}
      <Spacer x={14}/>
      <Spacer x={14} />
    </div>
  </div>
);

export default Layout;
