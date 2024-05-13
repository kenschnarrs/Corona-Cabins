import React from "react"
import { GetStaticProps } from "next"
import Layout from "../components/Layout"
import CabinOption from "../components/CabinOption"
import {CabinProps} from "../lib/types";

import prisma from '../lib/prisma';
import { PictureType } from "@prisma/client";
import { Spacer } from "@nextui-org/react";

export const getStaticProps: GetStaticProps = async () => {
  const cabins = await prisma.cabin.findMany({
    include: {
      images: {
        where: {
          type: PictureType.Primary
        }
      }
    }
  })

  const serializedCabins = JSON.parse(JSON.stringify(cabins));

  return { 
    props: { cabins: serializedCabins }, 
    revalidate: 10 
  }
}

type SelectPageProps = {
  cabins: CabinProps[]
}

// renders the cabin options (3 currently)
const SelectPage: React.FC<SelectPageProps> = (props) => {
  return (
    <Layout>
      <div className="page">
        <div className="flex">
          {props.cabins.map((cabin) => (
            <div key={cabin.id} className="post">
              <CabinOption cabin={cabin} />
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .page {
          /* Apply styles to ensure consistent spacing */
          padding: 20px;
        }

        .post {
          /* Set a fixed height for each cabin option */
          height: 300px; /* Adjust this value as needed */
          /* Ensure consistent spacing between options */
          margin-left: 20px;
          margin-right: 20px;

          /* Other styles for each option */
        }
      `}</style>
    </Layout>
  )
}

export default SelectPage
